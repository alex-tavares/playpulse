extends RefCounted

var _rng := RandomNumberGenerator.new()


func _init() -> void:
	_rng.randomize()


func generate_uuid_v4() -> String:
	var bytes := PackedByteArray()
	bytes.resize(16)

	for index in range(bytes.size()):
		bytes[index] = _rng.randi_range(0, 255)

	bytes[6] = (bytes[6] & 0x0F) | 0x40
	bytes[8] = (bytes[8] & 0x3F) | 0x80

	var hex := bytes.hex_encode()
	return "%s-%s-%s-%s-%s" % [
		hex.substr(0, 8),
		hex.substr(8, 4),
		hex.substr(12, 4),
		hex.substr(16, 4),
		hex.substr(20, 12),
	]


func sha256_hex(value: String) -> String:
	var hashing := HashingContext.new()
	hashing.start(HashingContext.HASH_SHA256)
	hashing.update(value.to_utf8_buffer())
	return hashing.finish().hex_encode()


func hmac_sha256_base64(secret: String, value: String) -> String:
	var crypto := Crypto.new()
	var digest := crypto.hmac_digest(
		HashingContext.HASH_SHA256,
		secret.to_utf8_buffer(),
		value.to_utf8_buffer()
	)
	return Marshalls.raw_to_base64(digest)


func derive_player_id_hash(game_id: String, device_id: String, player_seed: String) -> String:
	var effective_seed := player_seed if player_seed != "" else device_id
	return sha256_hex("%s::%s::%s" % [game_id, device_id, effective_seed])


func iso8601_utc_from_unix(unix_seconds: int) -> String:
	var parts := Time.get_datetime_dict_from_unix_time(unix_seconds)
	return (
		"%04d-%02d-%02dT%02d:%02d:%02dZ"
		% [
			int(parts["year"]),
			int(parts["month"]),
			int(parts["day"]),
			int(parts["hour"]),
			int(parts["minute"]),
			int(parts["second"]),
		]
	)


func iso8601_utc_now() -> String:
	return iso8601_utc_from_unix(Time.get_unix_time_from_system())
