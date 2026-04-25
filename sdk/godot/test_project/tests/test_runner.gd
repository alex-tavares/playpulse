extends Node

const FakeTransportScript := preload("res://tests/fake_transport.gd")
const ConfigParser := preload("res://addons/playpulse/playpulse_config.gd")
const CryptoHelper := preload("res://addons/playpulse/playpulse_crypto.gd")
const Persistence := preload("res://addons/playpulse/playpulse_persistence.gd")


func _ready() -> void:
	await _run_tests()


func _run_tests() -> void:
	var tests := [
		_test_config_validation,
		_test_generate_mvp_envelopes,
		_test_custom_events,
		_test_invalid_properties_are_rejected,
		_test_queue_cap_and_batch_flush,
		_test_signing_headers_and_hmac_shape,
		_test_consent_disable_clears_queue_and_persistence,
		_test_player_identifier_rotates_after_flush,
		_test_persistence_replay_on_configure,
		_test_retry_schedule_ranges,
		_test_shutdown_persists_unsent_queue,
		_test_close_request_waits_for_flush_before_quit,
	]

	for test_callable in tests:
		await test_callable.call()

	print("PlayPulse SDK tests passed")
	get_tree().quit(0)


func _test_config_validation() -> void:
	var parser := ConfigParser.new()
	var valid_result := parser.parse_config(_base_config())
	_assert(valid_result["ok"], "configure should accept a valid base config")

	var invalid_result := parser.parse_config({
		"api_key": "local-key",
		"signing_secret": "local-secret",
	})
	_assert(not invalid_result["ok"], "configure should reject missing required keys")


func _test_generate_mvp_envelopes() -> void:
	_install_fake_transport(false)
	_reset_sdk("generate")
	PlayPulse.configure(_base_config())

	_assert(
		PlayPulse.track("session_start", _session_start_props()) == OK,
		"session_start should enqueue"
	)
	_assert(PlayPulse.track("session_end", _session_end_props()) == OK, "session_end should enqueue")
	_assert(PlayPulse.track("match_start", _match_start_props()) == OK, "match_start should enqueue")
	_assert(PlayPulse.track("match_end", _match_end_props()) == OK, "match_end should enqueue")
	_assert(
		PlayPulse.track("character_selected", _character_selected_props()) == OK,
		"character_selected should enqueue"
	)

	var queue := PlayPulse._queue_snapshot_for_testing()
	_assert(queue.size() == 5, "All five MVP events should be queued")
	for event in queue:
		_assert(event.has("event_id"), "event_id should exist")
		_assert(event.has("occurred_at"), "occurred_at should exist")
		_assert(event.has("session_id"), "session_id should exist")
		_assert(event.has("player_id_hash"), "player_id_hash should exist")
		_assert(event["game_id"] == "mythtag", "game_id should be propagated")

func _test_invalid_properties_are_rejected() -> void:
	_install_fake_transport(false)
	_reset_sdk("invalid")
	PlayPulse.configure(_base_config())

	var result := PlayPulse.track("session_start", {
		"launch_reason": "fresh_launch",
		"connection_mode": "online",
		"timezone_offset_min": "bad",
	})
	_assert(result == ERR_INVALID_PARAMETER, "Invalid properties should be rejected")


func _test_custom_events() -> void:
	_install_fake_transport(false)
	_reset_sdk("custom")
	PlayPulse.configure(_base_config())

	var result := PlayPulse.track("level_end", {
		"completed": true,
		"duration_s": 180,
		"level_id": "forest_01",
		"rewards": ["coin", "gem"],
	})
	_assert(result == OK, "valid custom event should enqueue")

	var queue := PlayPulse._queue_snapshot_for_testing()
	_assert(queue.size() == 1, "custom event should be queued")
	_assert(queue[0]["event_name"] == "level_end", "custom event name should be preserved")
	_assert(queue[0]["schema_version"] == "1.1", "custom events should use schema_version 1.1")

	_assert(
		PlayPulse.track("invalidName", {"value": 1}) == ERR_INVALID_PARAMETER,
		"invalid custom event names should be rejected"
	)
	_assert(
		PlayPulse.track("level_end", {"nested": {"bad": true}}) == ERR_INVALID_PARAMETER,
		"nested custom event properties should be rejected"
	)
	_assert(
		PlayPulse.track("level_end", {"email": "player@example.com"}) == ERR_INVALID_PARAMETER,
		"PII-like custom event property keys should be rejected"
	)
	_assert(
		PlayPulse.track("level_end", {"player_id": "raw-player-123"}) == ERR_INVALID_PARAMETER,
		"raw identifier custom event property keys should be rejected"
	)
	_assert(
		PlayPulse.track("level_end", {"level_id": "player@example.com"}) == ERR_INVALID_PARAMETER,
		"email-like custom event property values should be rejected"
	)
	_assert(
		PlayPulse.track(
			"level_end",
			{"level_id": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature"}
		) == ERR_INVALID_PARAMETER,
		"JWT-like custom event property values should be rejected"
	)
	var long_value := ""
	for _index in range(129):
		long_value += "x"
	_assert(
		PlayPulse.track("level_end", {"level_id": long_value}) == ERR_INVALID_PARAMETER,
		"long custom event string values should be rejected"
	)


func _test_queue_cap_and_batch_flush() -> void:
	var transport := _install_fake_transport(false)
	_reset_sdk("queue-cap")
	PlayPulse.configure(_base_config())

	for index in range(200):
		var result := PlayPulse.track("session_start", {
			"launch_reason": "resume",
			"connection_mode": "online",
			"timezone_offset_min": index % 60,
		})
		_assert(result == OK, "Queue should accept event %d" % index)

	_assert(
		PlayPulse.track("session_start", _session_start_props()) == PlayPulse.ERR_QUEUE_FULL,
		"Queue should reject the 201st event"
	)
	_assert(transport.requests.size() >= 1, "Batches should flush at 10 events")


func _test_signing_headers_and_hmac_shape() -> void:
	var transport := _install_fake_transport(true)
	transport.queue_response()
	_reset_sdk("signing")
	PlayPulse.configure(_base_config())

	for _index in range(10):
		_assert(PlayPulse.track("session_start", _session_start_props()) == OK, "Batch should enqueue")

	await get_tree().process_frame

	_assert(transport.requests.size() == 1, "Ten events should create exactly one request")
	var request: Dictionary = transport.requests[0]
	var header_map := _headers_to_map(request["headers"])
	_assert(header_map.has("X-Signature"), "Request must include X-Signature")
	_assert(header_map.has("X-Request-Timestamp"), "Request must include X-Request-Timestamp")
	_assert(header_map.has("X-Nonce"), "Request must include X-Nonce")
	_assert(header_map["X-Api-Key"] == "local-key", "Request must include the API key")

	var parsed_body: Variant = JSON.parse_string(request["body"])
	_assert(typeof(parsed_body) == TYPE_DICTIONARY, "Request body must be JSON")
	_assert(parsed_body["events"].size() == 10, "Batch payload must contain 10 events")

	var crypto := CryptoHelper.new()
	var expected_signature := crypto.hmac_sha256_base64(
		"local-secret",
		"%s\n%s\n%s"
		% [header_map["X-Request-Timestamp"], header_map["X-Nonce"], request["body"]]
	)
	_assert(header_map["X-Signature"] == expected_signature, "Signature must match the raw body")


func _test_consent_disable_clears_queue_and_persistence() -> void:
	_install_fake_transport(false)
	_reset_sdk("consent")
	PlayPulse.configure(_base_config())
	PlayPulse.track("session_start", _session_start_props())
	PlayPulse.track("match_start", _match_start_props())

	_assert(PlayPulse.set_consent(false) == OK, "set_consent(false) should succeed")
	_assert(PlayPulse._queue_snapshot_for_testing().is_empty(), "Queue should be cleared on opt-out")

	var persistence := Persistence.new()
	persistence.set_root_path(_test_root("consent"))
	_assert(persistence.load_events().is_empty(), "Persisted queue should be cleared on opt-out")


func _test_player_identifier_rotates_after_flush() -> void:
	var transport := _install_fake_transport(false)
	transport.queue_response()
	_reset_sdk("player-seed")
	PlayPulse.configure(_base_config())
	PlayPulse.track("session_start", _session_start_props())
	var old_hash: String = PlayPulse._queue_snapshot_for_testing()[0]["player_id_hash"]

	_assert(
		PlayPulse.set_player_identifier("new-player-seed") == OK,
		"set_player_identifier should succeed"
	)
	_assert(transport.requests.size() == 1, "Pending data should flush before seed rotation")
	transport.complete_next()
	await get_tree().process_frame

	var state: Dictionary = PlayPulse._state_snapshot_for_testing()
	_assert(state["player_id_hash"] != old_hash, "Player hash should rotate after the flush")
	PlayPulse.track("session_start", _session_start_props())
	var latest_hash: String = PlayPulse._queue_snapshot_for_testing().back()["player_id_hash"]
	_assert(latest_hash == state["player_id_hash"], "New events should use the rotated player hash")


func _test_persistence_replay_on_configure() -> void:
	_install_fake_transport(false)
	var root_path := _test_root("replay")
	_clear_root(root_path)

	var persistence := Persistence.new()
	persistence.set_root_path(root_path)
	persistence.save_events([_persisted_event()])

	PlayPulse._set_persistence_root_for_testing(root_path)
	PlayPulse.configure(_base_config())
	var queue := PlayPulse._queue_snapshot_for_testing()
	_assert(queue.size() == 1, "Persisted events should be replayed into the queue on configure")


func _test_retry_schedule_ranges() -> void:
	_install_fake_transport(false)
	_reset_sdk("retry")
	PlayPulse.configure(_base_config())

	var expected := [1.0, 5.0, 15.0, 60.0, 60.0]
	for index in range(expected.size()):
		var delay := PlayPulse._retry_delay_for_testing(index)
		_assert(delay >= expected[index], "Retry delay should not undershoot the base schedule")
		_assert(delay <= expected[index] + 0.25, "Retry delay jitter should stay bounded")


func _test_shutdown_persists_unsent_queue() -> void:
	_install_fake_transport(false)
	_reset_sdk("shutdown")
	PlayPulse.configure(_base_config())
	PlayPulse.track("session_start", _session_start_props())
	PlayPulse.shutdown()
	PlayPulse.shutdown()

	var persistence := Persistence.new()
	persistence.set_root_path(_test_root("shutdown"))
	var persisted_events := persistence.load_events()
	_assert(not persisted_events.is_empty(), "shutdown should leave unsent events persisted")
	var session_end_count := 0
	for event in persisted_events:
		if String(event["event_name"]) == "session_end":
			session_end_count += 1

	_assert(session_end_count == 1, "shutdown should append exactly one session_end event")


func _test_close_request_waits_for_flush_before_quit() -> void:
	var transport := _install_fake_transport(false)
	transport.queue_response()
	_reset_sdk("close-request")
	PlayPulse._suppress_actual_quit_for_testing_only()
	PlayPulse.configure(_base_config())
	PlayPulse.track("session_start", _session_start_props())

	PlayPulse._notification(NOTIFICATION_WM_CLOSE_REQUEST)
	_assert(
		PlayPulse._quit_count_snapshot_for_testing() == 0,
		"quit should wait for the shutdown flush to finish"
	)

	transport.complete_next()
	await get_tree().process_frame

	_assert(
		PlayPulse._quit_count_snapshot_for_testing() == 1,
		"quit should resume after the shutdown flush completes"
	)


func _install_fake_transport(auto_complete: bool) -> Node:
	var transport := FakeTransportScript.new()
	transport.auto_complete = auto_complete
	PlayPulse._set_transport_for_testing(transport)
	return transport


func _reset_sdk(name: String) -> void:
	var root_path := _test_root(name)
	_clear_root(root_path)
	PlayPulse._set_persistence_root_for_testing(root_path)
	PlayPulse._set_clock_for_testing(1_743_880_800)


func _test_root(name: String) -> String:
	return "user://playpulse_tests/%s" % name


func _clear_root(root_path: String) -> void:
	var absolute_path := ProjectSettings.globalize_path(root_path)
	if DirAccess.dir_exists_absolute(absolute_path):
		_remove_tree(absolute_path)

	DirAccess.make_dir_recursive_absolute(absolute_path)


func _remove_tree(path: String) -> void:
	var dir := DirAccess.open(path)
	if dir == null:
		return

	dir.list_dir_begin()
	while true:
		var name := dir.get_next()
		if name == "":
			break
		if name in [".", ".."]:
			continue

		var child_path := path.path_join(name)
		if dir.current_is_dir():
			_remove_tree(child_path)
			DirAccess.remove_absolute(child_path)
		else:
			DirAccess.remove_absolute(child_path)

	dir.list_dir_end()


func _headers_to_map(headers: Array) -> Dictionary:
	var mapped := {}
	for header_line in headers:
		var parts := String(header_line).split(": ", false, 1)
		if parts.size() == 2:
			mapped[parts[0]] = parts[1]

	return mapped


func _persisted_event() -> Dictionary:
	return {
		"event_id": "7f4c9e4d-5f3c-4e51-9dc8-6e0a9f0c1234",
		"event_name": "session_start",
		"schema_version": "1.0",
		"occurred_at": "2025-04-05T12:00:00Z",
		"session_id": "bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9",
		"player_id_hash": "c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1",
		"game_id": "mythtag",
		"game_version": "0.3.0",
		"build_id": "mt-dev-local",
		"platform": "pc",
		"locale": "pt-BR",
		"consent_analytics": true,
		"properties": _session_start_props(),
	}


func _base_config() -> Dictionary:
	return {
		"api_key": "local-key",
		"signing_secret": "local-secret",
		"game_id": "mythtag",
		"game_version": "0.3.0",
		"build_id": "mt-dev-local",
		"ingest_base_url": "http://localhost:4001",
		"locale": "pt-BR",
		"player_seed": "sdk-test-player",
		"initial_consent": true,
		"flush_interval_sec": 5,
	}


func _session_start_props() -> Dictionary:
	return {
		"launch_reason": "fresh_launch",
		"connection_mode": "online",
		"timezone_offset_min": -180,
	}


func _session_end_props() -> Dictionary:
	return {
		"duration_s": 120,
		"exit_reason": "user_exit",
		"xp_earned": 12,
	}


func _match_start_props() -> Dictionary:
	return {
		"match_id": "2f9fe1c3-7d3a-4cb8-8bd8-1df54ad2a8a1",
		"mode_id": "tag_brawl",
		"map_id": "shrine_plaza",
		"team_size": 2,
		"party_size": 2,
		"mmr_bucket": "bronze",
	}


func _match_end_props() -> Dictionary:
	return {
		"match_id": "2f9fe1c3-7d3a-4cb8-8bd8-1df54ad2a8a1",
		"duration_s": 360,
		"result": "draw",
		"character_id": "fox_hunter",
		"score": 1200,
		"damage_dealt": 3400,
	}


func _character_selected_props() -> Dictionary:
	return {
		"selection_context": "match_lobby",
		"character_id": "fox_hunter",
		"is_random": false,
	}


func _assert(condition: bool, message: String) -> void:
	if not condition:
		push_error(message)
		get_tree().quit(1)
