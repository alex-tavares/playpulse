extends RefCounted

const EVENT_NAMES := [
	"session_start",
	"session_end",
	"match_start",
	"match_end",
	"character_selected",
]

const SNAKE_CASE := "^[a-z][a-z0-9_]*$"
const HEX_64 := "^[a-f0-9]{64}$"
const UUID_PATTERN := "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
const MAJOR_MINOR_PATTERN := "^\\d+\\.\\d+$"
const SEMVER_PATTERN := "^\\d+\\.\\d+\\.\\d+$"
const DATE_TIME_PATTERN := "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$"
const MAX_EVENT_BYTES := 2048
const MAX_PROPERTIES_BYTES := 1536
const MAX_CUSTOM_PROPERTY_KEYS := 25
const MAX_CUSTOM_STRING_LENGTH := 128
const EMAIL_LIKE_PATTERN := "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
const JWT_LIKE_PATTERN := "^eyJ[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$"
const CUSTOM_PROPERTY_ALLOWED_GAMEPLAY_KEYS := [
	"build_id",
	"character_id",
	"item_id",
	"level_id",
	"loadout_id",
	"map_id",
	"match_id",
	"mode_id",
	"quest_id",
]
const CUSTOM_PROPERTY_SENSITIVE_KEYS := [
	"access_token",
	"address",
	"api_key",
	"auth_token",
	"authorization_header",
	"chat",
	"chat_text",
	"cookie",
	"device_id",
	"email",
	"email_address",
	"error_message",
	"ip",
	"jwt",
	"message",
	"name",
	"password",
	"phone",
	"phone_number",
	"player_id",
	"player_id_hash",
	"player_name",
	"refresh_token",
	"secret",
	"session_id",
	"token",
	"user_name",
	"user_id",
]
const SENSITIVE_PROPERTY_SUBJECTS := [
	"access",
	"account",
	"api",
	"auth",
	"authorization",
	"device",
	"email",
	"phone",
	"player",
	"profile",
	"refresh",
	"session",
	"user",
]
const SENSITIVE_PROPERTY_SUFFIXES := ["id", "identifier", "hash", "key", "token", "uuid"]


func validate_event(event: Dictionary) -> Dictionary:
	if _byte_size(event) > MAX_EVENT_BYTES:
		return _error("Event payload must be at most %d bytes" % MAX_EVENT_BYTES)

	var common_result := _validate_common_envelope(event)
	if not common_result["ok"]:
		return common_result

	var properties: Variant = event.get("properties", null)
	if typeof(properties) != TYPE_DICTIONARY:
		return _error("properties must be a dictionary")

	if _byte_size(properties) > MAX_PROPERTIES_BYTES:
		return _error("properties must be at most %d bytes" % MAX_PROPERTIES_BYTES)

	var event_name := String(event["event_name"])
	if not EVENT_NAMES.has(event_name) and String(event["schema_version"]) != "1.1":
		return _error("custom events must use schema_version 1.1")

	match event_name:
		"session_start":
			return _validate_session_start(properties)
		"session_end":
			return _validate_session_end(properties)
		"match_start":
			return _validate_match_start(properties)
		"match_end":
			return _validate_match_end(properties)
		"character_selected":
			return _validate_character_selected(properties)
		_:
			return _validate_custom_event(properties)


func _validate_common_envelope(event: Dictionary) -> Dictionary:
	var required_keys := [
		"event_id",
		"event_name",
		"schema_version",
		"occurred_at",
		"session_id",
		"player_id_hash",
		"game_id",
		"game_version",
		"build_id",
		"platform",
		"consent_analytics",
		"properties",
	]

	for key in required_keys:
		if not event.has(key):
			return _error("Missing required event field: %s" % key)

	if not _matches(String(event["event_name"]), SNAKE_CASE):
		return _error("event_name must be snake_case")

	if String(event["event_name"]).length() > 48:
		return _error("event_name must be at most 48 characters")

	if not _matches(String(event["event_id"]), UUID_PATTERN):
		return _error("event_id must be a UUID v4")

	if not _matches(String(event["schema_version"]), MAJOR_MINOR_PATTERN):
		return _error("schema_version must use major.minor format")

	if not _matches(String(event["occurred_at"]), DATE_TIME_PATTERN):
		return _error("occurred_at must be an ISO8601 UTC timestamp")

	if not _matches(String(event["session_id"]), UUID_PATTERN):
		return _error("session_id must be a UUID v4")

	if not _matches(String(event["player_id_hash"]), HEX_64):
		return _error("player_id_hash must be a 64-char lowercase hex string")

	if not ["mythclash", "mythtag"].has(String(event["game_id"])):
		return _error("game_id must be mythclash or mythtag")

	if not _matches(String(event["game_version"]), SEMVER_PATTERN):
		return _error("game_version must use semver format")

	if String(event["build_id"]).length() > 16:
		return _error("build_id must be at most 16 characters")

	if not ["pc", "mac", "linux"].has(String(event["platform"])):
		return _error("platform must be pc, mac, or linux")

	if event.has("locale") and String(event["locale"]) != "":
		if typeof(event["locale"]) != TYPE_STRING or String(event["locale"]).length() > 8:
			return _error("locale must be a string with up to 8 characters")

	if typeof(event["consent_analytics"]) != TYPE_BOOL:
		return _error("consent_analytics must be a boolean")

	return _ok()


func _validate_session_start(properties: Dictionary) -> Dictionary:
	var launch_reason := ["fresh_launch", "resume", "hot_reload"]
	var connection_modes := ["online", "offline"]

	if not _has_only_keys(properties, ["launch_reason", "connection_mode", "timezone_offset_min"]):
		return _error("session_start properties contain unsupported keys")

	if not launch_reason.has(String(properties.get("launch_reason", ""))):
		return _error("session_start.launch_reason is invalid")

	if not connection_modes.has(String(properties.get("connection_mode", ""))):
		return _error("session_start.connection_mode is invalid")

	if not _is_int_in_range(properties.get("timezone_offset_min"), -720, 840):
		return _error("session_start.timezone_offset_min must be an integer between -720 and 840")

	return _ok()


func _validate_session_end(properties: Dictionary) -> Dictionary:
	if not _has_only_keys(properties, ["duration_s", "exit_reason", "xp_earned"]):
		return _error("session_end properties contain unsupported keys")

	if not _is_int_in_range(properties.get("duration_s"), 0, 86400):
		return _error("session_end.duration_s must be an integer between 0 and 86400")

	if not ["user_exit", "disconnect", "crash", "idle_timeout"].has(
		String(properties.get("exit_reason", ""))
	):
		return _error("session_end.exit_reason is invalid")

	if not _is_int_in_range(properties.get("xp_earned"), 0, 1000):
		return _error("session_end.xp_earned must be an integer between 0 and 1000")

	return _ok()


func _validate_match_start(properties: Dictionary) -> Dictionary:
	var keys := ["match_id", "mode_id", "map_id", "team_size", "party_size", "mmr_bucket"]
	if not _has_only_keys(properties, keys):
		return _error("match_start properties contain unsupported keys")

	if not _matches(String(properties.get("match_id", "")), UUID_PATTERN):
		return _error("match_start.match_id must be a UUID v4")

	if not _string_range(properties.get("mode_id"), 1, 32):
		return _error("match_start.mode_id must be a string up to 32 characters")

	if not _string_range(properties.get("map_id"), 1, 32):
		return _error("match_start.map_id must be a string up to 32 characters")

	if not _is_int_in_range(properties.get("team_size"), 1, 5):
		return _error("match_start.team_size must be an integer between 1 and 5")

	if not _is_int_in_range(properties.get("party_size"), 1, 4):
		return _error("match_start.party_size must be an integer between 1 and 4")

	if not ["bronze", "silver", "gold", "diamond"].has(String(properties.get("mmr_bucket", ""))):
		return _error("match_start.mmr_bucket is invalid")

	return _ok()


func _validate_match_end(properties: Dictionary) -> Dictionary:
	var keys := ["match_id", "duration_s", "result", "character_id", "score", "damage_dealt"]
	if not _has_only_keys(properties, keys):
		return _error("match_end properties contain unsupported keys")

	if not _matches(String(properties.get("match_id", "")), UUID_PATTERN):
		return _error("match_end.match_id must be a UUID v4")

	if not _is_int_in_range(properties.get("duration_s"), 0, 7200):
		return _error("match_end.duration_s must be an integer between 0 and 7200")

	if not ["win", "loss", "draw", "abandon"].has(String(properties.get("result", ""))):
		return _error("match_end.result is invalid")

	if not _string_range(properties.get("character_id"), 1, 32):
		return _error("match_end.character_id must be a string up to 32 characters")

	if not _is_int_in_range(properties.get("score"), 0, 100000):
		return _error("match_end.score must be an integer between 0 and 100000")

	if not _is_int_in_range(properties.get("damage_dealt"), 0, 500000):
		return _error("match_end.damage_dealt must be an integer between 0 and 500000")

	return _ok()


func _validate_character_selected(properties: Dictionary) -> Dictionary:
	var required_keys := ["selection_context", "character_id", "is_random"]
	var optional_keys := ["loadout_id", "perk_ids"]
	if not _has_required_with_optional_keys(properties, required_keys, optional_keys):
		return _error("character_selected properties contain unsupported keys")

	if not ["match_lobby", "armory", "tutorial"].has(
		String(properties.get("selection_context", ""))
	):
		return _error("character_selected.selection_context is invalid")

	if not _string_range(properties.get("character_id"), 1, 32):
		return _error("character_selected.character_id must be a string up to 32 characters")

	if properties.has("loadout_id") and not _string_range(properties.get("loadout_id"), 1, 32):
		return _error("character_selected.loadout_id must be a string up to 32 characters")

	if properties.has("perk_ids"):
		var perk_ids: Array = properties["perk_ids"]
		if typeof(perk_ids) != TYPE_ARRAY:
			return _error("character_selected.perk_ids must be an array")

		if perk_ids.size() > 5:
			return _error("character_selected.perk_ids must have at most 5 entries")

		for perk_id in perk_ids:
			if not _string_range(perk_id, 1, 32):
				return _error("character_selected.perk_ids entries must be strings up to 32 characters")

	if typeof(properties.get("is_random", null)) != TYPE_BOOL:
		return _error("character_selected.is_random must be a boolean")

	return _ok()


func _validate_custom_event(properties: Dictionary) -> Dictionary:
	if properties.keys().size() > MAX_CUSTOM_PROPERTY_KEYS:
		return _error("custom event properties must have at most %d keys" % MAX_CUSTOM_PROPERTY_KEYS)

	for key in properties.keys():
		var key_name := String(key)
		if not _matches(key_name, SNAKE_CASE):
			return _error("custom event property keys must be snake_case")

		if _is_sensitive_custom_property_key(key_name):
			return _error("custom event property key is reserved for privacy")

		if not _is_custom_property_value(properties[key]):
			return _error("custom event property values must be flat primitives or arrays of primitives")

	return _ok()


func _byte_size(value: Variant) -> int:
	return JSON.stringify(value).to_utf8_buffer().size()


func _has_only_keys(properties: Dictionary, keys: Array) -> bool:
	for key in keys:
		if not properties.has(key):
			return false

	for key in properties.keys():
		if not keys.has(key):
			return false

	return true


func _has_required_with_optional_keys(
	properties: Dictionary,
	required_keys: Array,
	optional_keys: Array
) -> bool:
	for key in required_keys:
		if not properties.has(key):
			return false

	for key in properties.keys():
		if not required_keys.has(key) and not optional_keys.has(key):
			return false

	return true


func _is_int_in_range(value: Variant, min_value: int, max_value: int) -> bool:
	if typeof(value) != TYPE_INT:
		return false

	return int(value) >= min_value and int(value) <= max_value


func _string_range(value: Variant, min_length: int, max_length: int) -> bool:
	if typeof(value) != TYPE_STRING:
		return false

	var string_value := String(value)
	return string_value.length() >= min_length and string_value.length() <= max_length


func _is_custom_property_value(value: Variant) -> bool:
	if _is_custom_primitive(value):
		return true

	if typeof(value) != TYPE_ARRAY:
		return false

	for entry in value:
		if not _is_custom_primitive(entry):
			return false

	return true


func _is_custom_primitive(value: Variant) -> bool:
	match typeof(value):
		TYPE_STRING:
			return _is_safe_custom_string(String(value))
		TYPE_INT:
			return true
		TYPE_FLOAT:
			return is_finite(float(value))
		TYPE_BOOL:
			return true
		_:
			return false


func _is_sensitive_custom_property_key(key_name: String) -> bool:
	if CUSTOM_PROPERTY_ALLOWED_GAMEPLAY_KEYS.has(key_name):
		return false

	if CUSTOM_PROPERTY_SENSITIVE_KEYS.has(key_name):
		return true

	for subject in SENSITIVE_PROPERTY_SUBJECTS:
		for suffix in SENSITIVE_PROPERTY_SUFFIXES:
			var exact_key := "%s_%s" % [subject, suffix]
			if key_name == exact_key:
				return true
			if key_name.begins_with("%s_" % subject) and key_name.ends_with("_%s" % suffix):
				return true

	return false


func _is_safe_custom_string(value: String) -> bool:
	if value.length() > MAX_CUSTOM_STRING_LENGTH:
		return false

	if value.to_lower().begins_with("bearer "):
		return false

	if _matches(value, EMAIL_LIKE_PATTERN):
		return false

	if _matches(value, JWT_LIKE_PATTERN):
		return false

	return true


func _matches(value: String, pattern: String) -> bool:
	var regex := RegEx.new()
	regex.compile(pattern)
	return regex.search(value) != null


func _ok() -> Dictionary:
	return {"ok": true}


func _error(message: String) -> Dictionary:
	return {
		"ok": false,
		"message": message,
	}
