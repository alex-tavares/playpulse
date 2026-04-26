extends RefCounted

const DEFAULT_FLUSH_INTERVAL_SEC := 5
const MIN_FLUSH_INTERVAL_SEC := 2
const MAX_FLUSH_INTERVAL_SEC := 30
const GAME_IDS := ["mythclash", "mythtag"]


func parse_config(raw_config: Dictionary) -> Dictionary:
	var required_keys := [
		"game_id",
		"game_version",
		"build_id",
		"ingest_base_url",
	]
	var parsed := {}
	var auth_mode := _as_optional_string(raw_config.get("auth_mode", ""))
	if auth_mode == "":
		auth_mode = "hmac"
	if auth_mode not in ["hmac", "public_client"]:
		return _error("auth_mode must be hmac or public_client")
	parsed["auth_mode"] = auth_mode

	for key in required_keys:
		if not raw_config.has(key):
			return _error("Missing required config key: %s" % key)

		var string_value := _as_non_empty_string(raw_config[key])
		if string_value == "":
			return _error("Config key %s must be a non-empty string" % key)

		parsed[key] = string_value

	if auth_mode == "hmac":
		for key in ["api_key", "signing_secret"]:
			if not raw_config.has(key):
				return _error("Missing required config key: %s" % key)

			var string_value := _as_non_empty_string(raw_config[key])
			if string_value == "":
				return _error("Config key %s must be a non-empty string" % key)

			parsed[key] = string_value
	else:
		for key in ["client_id", "platform_channel"]:
			if not raw_config.has(key):
				return _error("Missing required config key: %s" % key)

			var string_value := _as_non_empty_string(raw_config[key])
			if string_value == "":
				return _error("Config key %s must be a non-empty string" % key)

			parsed[key] = string_value
		parsed["api_key"] = ""
		parsed["signing_secret"] = ""

	if not GAME_IDS.has(parsed["game_id"]):
		return _error("game_id must be one of: %s" % ", ".join(GAME_IDS))

	if not _is_semver(parsed["game_version"]):
		return _error("game_version must use semver format")

	if parsed["build_id"].length() > 16:
		return _error("build_id must be at most 16 characters")

	var ingest_base_url: String = String(parsed["ingest_base_url"]).rstrip("/")
	if not (ingest_base_url.begins_with("http://") or ingest_base_url.begins_with("https://")):
		return _error("ingest_base_url must start with http:// or https://")

	parsed["ingest_base_url"] = ingest_base_url
	parsed["locale"] = ""
	parsed["player_seed"] = ""
	parsed["initial_consent"] = true
	parsed["flush_interval_sec"] = DEFAULT_FLUSH_INTERVAL_SEC

	if raw_config.has("locale"):
		var locale := _as_optional_string(raw_config["locale"])
		if locale != "" and locale.length() > 8:
			return _error("locale must be at most 8 characters")

		parsed["locale"] = locale

	if raw_config.has("player_seed"):
		var player_seed := _as_optional_string(raw_config["player_seed"])
		if player_seed == "":
			return _error("player_seed must be a non-empty string when provided")

		parsed["player_seed"] = player_seed

	if raw_config.has("initial_consent"):
		if typeof(raw_config["initial_consent"]) != TYPE_BOOL:
			return _error("initial_consent must be a boolean")

		parsed["initial_consent"] = raw_config["initial_consent"]

	if raw_config.has("flush_interval_sec"):
		if not _is_integer_like(raw_config["flush_interval_sec"]):
			return _error("flush_interval_sec must be an integer")

		var flush_interval_sec := int(raw_config["flush_interval_sec"])
		if (
			flush_interval_sec < MIN_FLUSH_INTERVAL_SEC
			or flush_interval_sec > MAX_FLUSH_INTERVAL_SEC
		):
			return _error(
				(
					"flush_interval_sec must be between %d and %d"
					% [MIN_FLUSH_INTERVAL_SEC, MAX_FLUSH_INTERVAL_SEC]
				)
			)

		parsed["flush_interval_sec"] = flush_interval_sec

	return {
		"ok": true,
		"value": parsed,
	}


func _error(message: String) -> Dictionary:
	return {
		"ok": false,
		"message": message,
	}


func _as_non_empty_string(value: Variant) -> String:
	if typeof(value) != TYPE_STRING:
		return ""

	return String(value).strip_edges()


func _as_optional_string(value: Variant) -> String:
	if typeof(value) != TYPE_STRING:
		return ""

	return String(value).strip_edges()


func _is_integer_like(value: Variant) -> bool:
	return typeof(value) in [TYPE_INT, TYPE_FLOAT]


func _is_semver(value: String) -> bool:
	var parts := value.split(".")
	if parts.size() != 3:
		return false

	for part in parts:
		if part == "":
			return false

		if not part.is_valid_int():
			return false

	return true
