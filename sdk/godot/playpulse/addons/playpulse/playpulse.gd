extends Node

signal flush_completed(success: bool, metadata: Dictionary)

const ConfigParser := preload("playpulse_config.gd")
const CryptoHelper := preload("playpulse_crypto.gd")
const EventValidator := preload("playpulse_event_validator.gd")
const Persistence := preload("playpulse_persistence.gd")
const Transport := preload("playpulse_transport.gd")

const ERR_NOT_CONFIGURED := 10001
const ERR_CONSENT_DISABLED := 10002
const ERR_QUEUE_FULL := 10003

const QUEUE_CAP := 200
const BATCH_SIZE := 10
const PERSISTED_EVENT_CAP := 2000
const PERSISTED_EVENT_BYTES_CAP := 2 * 1024 * 1024
const SESSION_IDLE_SECONDS := 30 * 60
const RETRY_SCHEDULE_SECONDS := [1, 5, 15, 60, 60]
const CIRCUIT_OPEN_SECONDS := 60
const SHUTDOWN_FLUSH_BUDGET_SECONDS := 2.0

var _config_parser := ConfigParser.new()
var _crypto := CryptoHelper.new()
var _validator := EventValidator.new()
var _persistence := Persistence.new()

var _transport: Node
var _flush_timer: Timer
var _retry_timer: Timer
var _quit_timer: Timer
var _configured := false
var _config := {}
var _state := {}
var _queue: Array = []
var _inflight_batch: Array = []
var _retry_attempt := 0
var _pending_player_seed := ""
var _circuit_open_until := 0
var _client_token := ""
var _client_token_expires_at_unix := 0
var _client_token_refresh_after_s := 3000
var _client_token_request_inflight := false
var _clock_override := -1
var _shutdown_started := false
var _quit_requested := false
var _suppress_actual_quit_for_testing := false
var _quit_count_for_testing := 0


func _ready() -> void:
	get_tree().set_auto_accept_quit(false)

	_flush_timer = Timer.new()
	_flush_timer.one_shot = false
	_flush_timer.autostart = false
	_flush_timer.timeout.connect(_on_flush_timer_timeout)
	add_child(_flush_timer)

	_retry_timer = Timer.new()
	_retry_timer.one_shot = true
	_retry_timer.autostart = false
	_retry_timer.timeout.connect(_on_retry_timer_timeout)
	add_child(_retry_timer)

	_quit_timer = Timer.new()
	_quit_timer.one_shot = true
	_quit_timer.autostart = false
	_quit_timer.timeout.connect(_on_quit_timer_timeout)
	add_child(_quit_timer)

	_set_transport(Transport.new())


func configure(config: Dictionary) -> int:
	var parsed := _config_parser.parse_config(config)
	if not parsed["ok"]:
		push_warning(
			"PlayPulse configure rejected config: %s" % parsed.get("message", "unknown error")
		)
		return ERR_INVALID_PARAMETER

	_retry_timer.stop()
	_inflight_batch.clear()
	_retry_attempt = 0
	_pending_player_seed = ""
	_circuit_open_until = 0
	_client_token = ""
	_client_token_expires_at_unix = 0
	_client_token_refresh_after_s = 3000
	_client_token_request_inflight = false
	_shutdown_started = false
	_quit_requested = false
	_quit_timer.stop()
	_config = parsed["value"]
	_configured = true
	_state = _persistence.load_state()
	_bootstrap_state()
	_queue = _persistence.trim_events(
		_persistence.load_events(), PERSISTED_EVENT_CAP, PERSISTED_EVENT_BYTES_CAP
	)
	_persistence.save_events(_queue)
	_flush_timer.wait_time = float(_config["flush_interval_sec"])
	_flush_timer.start()
	_persist_runtime_state()

	if _state["consent_enabled"] and not _queue.is_empty():
		flush(true)

	return OK


func configure_from_file(config_path: String = "res://playpulse.config.json") -> int:
	if not FileAccess.file_exists(config_path):
		return ERR_FILE_NOT_FOUND

	var file := FileAccess.open(config_path, FileAccess.READ)
	if file == null:
		return ERR_CANT_OPEN

	var parsed_json: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed_json) != TYPE_DICTIONARY:
		return ERR_PARSE_ERROR

	return configure(parsed_json)


func track(event_name: String, props: Dictionary = {}) -> int:
	if not _configured:
		return ERR_NOT_CONFIGURED

	if not _state["consent_enabled"]:
		return ERR_CONSENT_DISABLED

	if _queue.size() >= QUEUE_CAP:
		return ERR_QUEUE_FULL

	_renew_session_if_needed(event_name == "session_start")
	var event := _build_event(event_name, props)
	var validation := _validator.validate_event(event)
	if not validation["ok"]:
		return ERR_INVALID_PARAMETER

	_queue.append(event)
	_queue = _persistence.trim_events(_queue, PERSISTED_EVENT_CAP, PERSISTED_EVENT_BYTES_CAP)
	_persistence.save_events(_queue)
	_persist_runtime_state()

	if _queue.size() >= BATCH_SIZE:
		flush(true)

	return OK


func flush(force: bool = false) -> int:
	if not _configured:
		return ERR_NOT_CONFIGURED

	if not _state["consent_enabled"]:
		return ERR_CONSENT_DISABLED

	if _queue.is_empty():
		return OK

	if _transport.is_busy():
		return ERR_BUSY

	if not force and _now_unix_seconds() < _circuit_open_until:
		return ERR_BUSY

	_inflight_batch = _queue.slice(0, min(BATCH_SIZE, _queue.size()))
	return _send_inflight_batch()


func set_consent(enabled: bool) -> int:
	if not _configured:
		return ERR_NOT_CONFIGURED

	_state["consent_enabled"] = enabled
	if not enabled:
		_queue.clear()
		_inflight_batch.clear()
		_retry_attempt = 0
		_client_token_request_inflight = false
		_transport.cancel()
		_retry_timer.stop()
		_persistence.clear_events()

	_persist_runtime_state()
	return OK


func set_player_identifier(seed: String) -> int:
	if not _configured:
		return ERR_NOT_CONFIGURED

	if seed.strip_edges() == "":
		return ERR_INVALID_PARAMETER

	if _transport.is_busy() or not _queue.is_empty():
		_pending_player_seed = seed.strip_edges()
		flush(true)
		return OK

	_apply_player_seed(seed.strip_edges())
	return OK


func shutdown() -> int:
	if not _configured:
		return OK

	if _shutdown_started:
		return OK

	_shutdown_started = true

	if _state["consent_enabled"]:
		var duration_s: int = max(0, _now_unix_seconds() - int(_state["session_started_at_unix"]))
		if _queue.size() < QUEUE_CAP:
			track(
				"session_end",
				{
					"duration_s": duration_s,
					"exit_reason": "user_exit",
					"xp_earned": 0,
				}
			)

		flush(true)

	_persist_runtime_state()
	return OK


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		_request_shutdown_and_quit()


func _bootstrap_state() -> void:
	_state["device_id"] = String(_state.get("device_id", _crypto.generate_uuid_v4()))
	_state["consent_enabled"] = bool(_state.get("consent_enabled", _config["initial_consent"]))
	_state["player_seed"] = (
		_config["player_seed"]
		if _config["player_seed"] != ""
		else String(_state.get("player_seed", ""))
	)
	if _state["player_seed"] == "":
		_state["player_seed"] = _state["device_id"]

	_state["player_id_hash"] = _crypto.derive_player_id_hash(
		_config["game_id"], _state["device_id"], _state["player_seed"]
	)
	_state["session_id"] = String(_state.get("session_id", _crypto.generate_uuid_v4()))
	_state["session_started_at_unix"] = int(
		_state.get("session_started_at_unix", _now_unix_seconds())
	)
	_state["last_activity_at_unix"] = int(_state.get("last_activity_at_unix", _now_unix_seconds()))


func _build_event(event_name: String, props: Dictionary) -> Dictionary:
	_state["last_activity_at_unix"] = _now_unix_seconds()
	return {
		"event_id": _crypto.generate_uuid_v4(),
		"event_name": event_name,
		"schema_version": _schema_version_for_event(event_name),
		"occurred_at": _crypto.iso8601_utc_now(),
		"session_id": _state["session_id"],
		"player_id_hash": _state["player_id_hash"],
		"game_id": _config["game_id"],
		"game_version": _config["game_version"],
		"build_id": _config["build_id"],
		"platform": _platform_id(),
		"locale": _effective_locale(),
		"consent_analytics": _state["consent_enabled"],
		"properties": props.duplicate(true),
	}


func _schema_version_for_event(event_name: String) -> String:
	if (
		[
			"session_start",
			"session_end",
			"match_start",
			"match_end",
			"character_selected",
		]
		. has(event_name)
	):
		return "1.0"

	return "1.1"


func _platform_id() -> String:
	var os_name := OS.get_name().to_lower()
	if os_name.contains("mac"):
		return "mac"
	if os_name.contains("linux"):
		return "linux"
	return "pc"


func _effective_locale() -> String:
	if String(_config["locale"]) != "":
		return _config["locale"]
	return TranslationServer.get_locale().left(8)


func _renew_session_if_needed(force_new: bool = false) -> void:
	var now := _now_unix_seconds()
	var idle_seconds := now - int(_state["last_activity_at_unix"])
	if force_new or idle_seconds >= SESSION_IDLE_SECONDS:
		_state["session_id"] = _crypto.generate_uuid_v4()
		_state["session_started_at_unix"] = now

	_state["last_activity_at_unix"] = now


func _send_inflight_batch() -> int:
	if _inflight_batch.is_empty():
		return OK

	if _config["auth_mode"] == "public_client" and _needs_client_token_refresh():
		return _request_client_token()

	var body := JSON.stringify({"events": _inflight_batch})
	var timestamp := str(_now_unix_seconds())
	var nonce := _crypto.generate_uuid_v4()
	var headers := PackedStringArray(
		[
			"Content-Type: application/json",
			"X-Request-Timestamp: %s" % timestamp,
			"X-Nonce: %s" % nonce,
		]
	)
	if _config["auth_mode"] == "public_client":
		headers.append("Authorization: Bearer %s" % _client_token)
	else:
		var signature := _crypto.hmac_sha256_base64(
			_config["signing_secret"], "%s\n%s\n%s" % [timestamp, nonce, body]
		)
		headers.append("X-Api-Key: %s" % _config["api_key"])
		headers.append("X-Signature: %s" % signature)

	var send_error: int = _transport.send("%s/events" % _config["ingest_base_url"], headers, body)
	if send_error != OK:
		_schedule_retry()

	return send_error


func _needs_client_token_refresh() -> bool:
	if _client_token == "":
		return true
	return _now_unix_seconds() >= _client_token_expires_at_unix - 600


func _request_client_token() -> int:
	if _client_token_request_inflight:
		return ERR_BUSY

	var body := (
		JSON
		. stringify(
			{
				"build_id": _config["build_id"],
				"client_id": _config["client_id"],
				"game_id": _config["game_id"],
				"game_version": _config["game_version"],
				"locale": _effective_locale(),
				"platform": _platform_id(),
				"platform_channel": _config["platform_channel"],
			}
		)
	)
	var headers := PackedStringArray(["Content-Type: application/json"])
	_client_token_request_inflight = true
	var send_error: int = _transport.send(
		"%s/client-tokens" % _config["ingest_base_url"], headers, body
	)
	if send_error != OK:
		_client_token_request_inflight = false
		_schedule_retry()

	return send_error


func _on_flush_timer_timeout() -> void:
	if not _queue.is_empty():
		flush()


func _on_retry_timer_timeout() -> void:
	if not _inflight_batch.is_empty() and not _transport.is_busy():
		_send_inflight_batch()


func _on_transport_completed(result: Dictionary) -> void:
	if _client_token_request_inflight:
		_on_client_token_completed(result)
		return

	var status_code := int(result.get("status_code", 0))
	var transport_error := int(result.get("transport_error", ERR_CANT_CONNECT))
	if transport_error != OK or status_code == 0 or status_code >= 500:
		_schedule_retry()
		if _quit_requested and not _quit_timer.is_stopped():
			return
		return

	if status_code >= 400:
		_drop_inflight_batch()
		_circuit_open_until = _now_unix_seconds() + CIRCUIT_OPEN_SECONDS
		emit_signal("flush_completed", false, {"status_code": status_code, "dropped": true})
		if _quit_requested and _can_complete_quit():
			_finish_quit()
		return

	var flushed_batch_size := _inflight_batch.size()
	_commit_inflight_batch()
	emit_signal(
		"flush_completed", true, {"status_code": status_code, "batch_size": flushed_batch_size}
	)
	if not _pending_player_seed.is_empty():
		_apply_player_seed(_pending_player_seed)
		_pending_player_seed = ""

	if _quit_requested and _can_complete_quit():
		_finish_quit()


func _on_client_token_completed(result: Dictionary) -> void:
	_client_token_request_inflight = false
	var status_code := int(result.get("status_code", 0))
	var transport_error := int(result.get("transport_error", ERR_CANT_CONNECT))
	if transport_error != OK or status_code < 200 or status_code >= 300:
		_schedule_retry()
		return

	var parsed: Variant = JSON.parse_string(str(result.get("body_text", "")))
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("data"):
		_schedule_retry()
		return

	var data: Dictionary = parsed["data"]
	var token := str(data.get("token", ""))
	var expires_at := _parse_iso8601_utc(str(data.get("expires_at", "")))
	if token == "" or expires_at <= _now_unix_seconds():
		_schedule_retry()
		return

	_client_token = token
	_client_token_expires_at_unix = expires_at
	_client_token_refresh_after_s = int(data.get("refresh_after_s", _client_token_refresh_after_s))
	_send_inflight_batch()


func _parse_iso8601_utc(value: String) -> int:
	var normalized := value.replace("Z", "")
	if normalized.contains("."):
		normalized = normalized.split(".")[0]
	return Time.get_unix_time_from_datetime_string(normalized)


func _schedule_retry() -> void:
	if _retry_attempt >= RETRY_SCHEDULE_SECONDS.size():
		_retry_attempt = 0
		_inflight_batch.clear()
		_persistence.save_events(_queue)
		emit_signal("flush_completed", false, {"persisted": true})
		return

	var wait_seconds := _next_retry_delay_seconds(_retry_attempt)
	_retry_attempt += 1
	_retry_timer.start(wait_seconds)
	emit_signal(
		"flush_completed", false, {"retry_in_s": wait_seconds, "retry_attempt": _retry_attempt}
	)


func _next_retry_delay_seconds(attempt_index: int) -> float:
	var base_delay := float(
		RETRY_SCHEDULE_SECONDS[min(attempt_index, RETRY_SCHEDULE_SECONDS.size() - 1)]
	)
	var jitter := randf_range(0.0, 0.25)
	return base_delay + jitter


func _commit_inflight_batch() -> void:
	for _event in _inflight_batch:
		if not _queue.is_empty():
			_queue.remove_at(0)

	_inflight_batch.clear()
	_retry_attempt = 0
	_persistence.save_events(_queue)
	_persist_runtime_state()


func _drop_inflight_batch() -> void:
	_commit_inflight_batch()


func _apply_player_seed(seed: String) -> void:
	_state["player_seed"] = seed
	_state["player_id_hash"] = _crypto.derive_player_id_hash(
		_config["game_id"], _state["device_id"], seed
	)
	_renew_session_if_needed(true)
	_persist_runtime_state()


func _persist_runtime_state() -> void:
	_persistence.save_state(_state)


func _set_transport(transport: Node) -> void:
	if _transport != null and is_instance_valid(_transport):
		if _transport.completed.is_connected(_on_transport_completed):
			_transport.completed.disconnect(_on_transport_completed)
		remove_child(_transport)
		_transport.queue_free()

	_transport = transport
	add_child(_transport)
	_transport.completed.connect(_on_transport_completed)


func _now_unix_seconds() -> int:
	if _clock_override >= 0:
		return _clock_override
	return Time.get_unix_time_from_system()


func _set_transport_for_testing(transport: Node) -> void:
	_set_transport(transport)


func _set_persistence_root_for_testing(root_path: String) -> void:
	_persistence.set_root_path(root_path)


func _set_clock_for_testing(unix_seconds: int) -> void:
	_clock_override = unix_seconds


func _clear_clock_for_testing() -> void:
	_clock_override = -1


func _queue_snapshot_for_testing() -> Array:
	return _queue.duplicate(true)


func _state_snapshot_for_testing() -> Dictionary:
	return _state.duplicate(true)


func _retry_delay_for_testing(attempt_index: int) -> float:
	return _next_retry_delay_seconds(attempt_index)


func _generate_uuid_for_local_bridge() -> String:
	return _crypto.generate_uuid_v4()


func _request_shutdown_and_quit() -> void:
	if _quit_requested:
		return

	_quit_requested = true
	shutdown()

	if _can_complete_quit():
		_finish_quit()
		return

	_quit_timer.start(SHUTDOWN_FLUSH_BUDGET_SECONDS)


func _can_complete_quit() -> bool:
	return (
		not _transport.is_busy()
		and _inflight_batch.is_empty()
		and not _client_token_request_inflight
	)


func _on_quit_timer_timeout() -> void:
	_finish_quit()


func _finish_quit() -> void:
	_quit_timer.stop()
	_quit_requested = false
	if _suppress_actual_quit_for_testing:
		_quit_count_for_testing += 1
		return

	get_tree().quit()


func _suppress_actual_quit_for_testing_only() -> void:
	_suppress_actual_quit_for_testing = true
	_quit_count_for_testing = 0


func _quit_count_snapshot_for_testing() -> int:
	return _quit_count_for_testing
