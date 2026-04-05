extends Node

var _current_match_id := ""
var _last_character_id := "unknown_character"
var _connected_game_managers: Dictionary = {}


func _ready() -> void:
	_configure_playpulse()
	PlayPulse.flush_completed.connect(_on_flush_completed)
	_connect_team_selection()
	_connect_existing_game_managers()
	get_tree().node_added.connect(_on_node_added)

	_track_or_warn("session_start", {
		"launch_reason": "fresh_launch",
		"connection_mode": "online",
		"timezone_offset_min": Time.get_time_zone_from_system().get("bias", 0),
	})

	if _is_console_smoke_enabled():
		call_deferred("_run_console_smoke")


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		PlayPulse.shutdown()


func _configure_playpulse() -> void:
	var game_version := str(ProjectSettings.get_setting("application/config/version", ""))
	if game_version.strip_edges() == "":
		game_version = "0.0.0"
	var build_id := OS.get_environment("PLAYPULSE_GODOT_BUILD_ID")
	if build_id == "":
		build_id = "mythtag-local"
	var bridge_config := {
		"api_key": OS.get_environment("PLAYPULSE_GODOT_API_KEY"),
		"signing_secret": OS.get_environment("PLAYPULSE_GODOT_SIGNING_SECRET"),
		"game_id": "mythtag",
		"game_version": game_version,
		"build_id": build_id,
		"ingest_base_url": _ingest_base_url(),
		"locale": TranslationServer.get_locale(),
		"player_seed": _device_seed(),
		"initial_consent": true,
		"flush_interval_sec": 5,
	}

	var configure_result := PlayPulse.configure(bridge_config)
	if configure_result != OK:
		push_warning("PlayPulse configure failed with code %s" % configure_result)
		return

	print(
		"PlayPulse configured for MythTag with build_id=%s ingest_base_url=%s"
		% [build_id, _ingest_base_url()]
	)


func _connect_team_selection() -> void:
	if not TeamsManager.team_claimed.is_connected(_on_team_claimed):
		TeamsManager.team_claimed.connect(_on_team_claimed)


func _connect_existing_game_managers() -> void:
	for node in get_tree().get_nodes_in_group("game_manager"):
		_connect_game_manager(node)


func _on_node_added(node: Node) -> void:
	if node.is_in_group("game_manager"):
		_connect_game_manager(node)


func _connect_game_manager(node: Node) -> void:
	if node == null:
		return

	var node_path := String(node.get_path())
	if _connected_game_managers.has(node_path):
		return

	_connected_game_managers[node_path] = true

	if node.has_signal("match_started") and not node.match_started.is_connected(_on_match_started):
		node.match_started.connect(_on_match_started)

	if node.has_signal("match_ended") and not node.match_ended.is_connected(_on_match_ended):
		node.match_ended.connect(_on_match_ended)


func _on_team_claimed(player: Player, team: CountryEnums.Country) -> void:
	var character_id := _character_id_for_team(team)
	_last_character_id = character_id

	_track_or_warn("character_selected", {
		"selection_context": "match_lobby",
		"character_id": character_id,
		"is_random": false,
	})


func _on_match_started() -> void:
	_current_match_id = PlayPulse._generate_uuid_for_local_bridge()
	_track_or_warn("match_start", {
		"match_id": _current_match_id,
		"mode_id": _mode_id(),
		"map_id": _map_id(),
		"team_size": _team_size(),
		"party_size": _party_size(),
		"mmr_bucket": "bronze",
	})


func _on_match_ended(_scores) -> void:
	if _current_match_id == "":
		return

	_track_or_warn("match_end", {
		"match_id": _current_match_id,
		"duration_s": 300,
		"result": "draw",
		"character_id": _last_character_id,
		"score": 0,
		"damage_dealt": 0,
	})
	_current_match_id = ""


func _run_console_smoke() -> void:
	await get_tree().create_timer(0.1).timeout
	_track_or_warn("character_selected", {
		"selection_context": "match_lobby",
		"character_id": _character_id_for_first_team(),
		"is_random": false,
	})

	_current_match_id = PlayPulse._generate_uuid_for_local_bridge()
	_track_or_warn("match_start", {
		"match_id": _current_match_id,
		"mode_id": "console_smoke",
		"map_id": "console_smoke",
		"team_size": 2,
		"party_size": 2,
		"mmr_bucket": "bronze",
	})

	await get_tree().create_timer(0.1).timeout
	_track_or_warn("match_end", {
		"match_id": _current_match_id,
		"duration_s": 60,
		"result": "draw",
		"character_id": _character_id_for_first_team(),
		"score": 0,
		"damage_dealt": 0,
	})

	await get_tree().create_timer(0.1).timeout
	PlayPulse.shutdown()
	await get_tree().create_timer(2.0).timeout
	get_tree().quit()


func _character_id_for_team(team: CountryEnums.Country) -> String:
	for team_resource in GlobalContext.team_database.teams:
		if team_resource.team_enum != team:
			continue

		if team_resource.characters.is_empty():
			return "unknown_character"

		return _character_resource_id(team_resource.characters[0])

	return "unknown_character"


func _character_id_for_first_team() -> String:
	if GlobalContext.team_database.teams.is_empty():
		return "unknown_character"

	return _character_resource_id(GlobalContext.team_database.teams[0].characters[0])


func _character_resource_id(character_resource) -> String:
	if character_resource == null:
		return "unknown_character"

	if character_resource.scene != null:
		var scene_path := String(character_resource.scene.resource_path)
		if scene_path != "":
			return scene_path.get_file().get_basename().to_snake_case()

	var display_name := String(character_resource.display_name).strip_edges()
	if display_name != "":
		return display_name.to_snake_case()

	var path := String(character_resource.resource_path)
	if path != "":
		return path.get_file().get_basename().to_snake_case()

	return String(character_resource.name).to_snake_case()


func _mode_id() -> String:
	if GlobalContext.selected_game_mode_entry != null:
		return String(GlobalContext.selected_game_mode_entry.display_name).to_snake_case()

	return "unknown_mode"


func _map_id() -> String:
	if String(GlobalContext.selected_layout_scene_path) != "":
		return String(GlobalContext.selected_layout_scene_path).get_file().get_basename().to_snake_case()

	return str(GlobalContext.selected_arena).to_snake_case()


func _team_size() -> int:
	return clamp(PlayerManager.get_current_players().size(), 1, 5)


func _party_size() -> int:
	return clamp(PlayerManager.get_current_players().size(), 1, 4)


func _device_seed() -> String:
	var explicit_seed := OS.get_environment("PLAYPULSE_GODOT_PLAYER_SEED")
	if explicit_seed != "":
		return explicit_seed

	return "%s:%s" % [OS.get_name(), OS.get_model_name()]


func _ingest_base_url() -> String:
	var url := OS.get_environment("PLAYPULSE_GODOT_INGEST_BASE_URL")
	if url == "":
		return "http://127.0.0.1:4001"

	return url.rstrip("/")


func _is_console_smoke_enabled() -> bool:
	return OS.get_environment("PLAYPULSE_MYTHTAG_SMOKE_TEST") == "1"


func _track_or_warn(event_name: String, props: Dictionary) -> void:
	var track_result := PlayPulse.track(event_name, props)
	if track_result != OK:
		push_warning("PlayPulse track failed for %s with code %s" % [event_name, track_result])
		return

	print("PlayPulse tracked %s" % event_name)
	var flush_result := PlayPulse.flush(true)
	if flush_result not in [OK, ERR_BUSY]:
		push_warning("PlayPulse flush failed after %s with code %s" % [event_name, flush_result])


func _on_flush_completed(success: bool, metadata: Dictionary) -> void:
	print("PlayPulse flush completed success=%s metadata=%s" % [success, JSON.stringify(metadata)])
