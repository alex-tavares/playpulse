extends RefCounted

const DEFAULT_ROOT := "user://playpulse"

var _root_path := DEFAULT_ROOT


func set_root_path(root_path: String) -> void:
	_root_path = root_path if root_path != "" else DEFAULT_ROOT


func load_state() -> Dictionary:
	_ensure_root_path()

	var path := _state_path()
	if not FileAccess.file_exists(path):
		return {}

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return {}

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}

	return parsed


func save_state(state: Dictionary) -> bool:
	_ensure_root_path()

	var file := FileAccess.open(_state_path(), FileAccess.WRITE)
	if file == null:
		return false

	file.store_string(JSON.stringify(state, "\t"))
	return true


func load_events() -> Array:
	_ensure_root_path()

	var path := _events_path()
	if not FileAccess.file_exists(path):
		return []

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return []

	var events: Array = []
	while not file.eof_reached():
		var line := file.get_line().strip_edges()
		if line == "":
			continue

		var parsed: Variant = JSON.parse_string(line)
		if typeof(parsed) == TYPE_DICTIONARY:
			events.append(parsed)

	return events


func save_events(events: Array) -> bool:
	_ensure_root_path()

	var file := FileAccess.open(_events_path(), FileAccess.WRITE)
	if file == null:
		return false

	for event in events:
		file.store_line(JSON.stringify(event))

	return true


func clear_events() -> void:
	save_events([])


func trim_events(events: Array, max_events: int, max_bytes: int) -> Array:
	var trimmed := events.duplicate(true)

	while trimmed.size() > max_events:
		trimmed.remove_at(0)

	while _events_size_bytes(trimmed) > max_bytes and not trimmed.is_empty():
		trimmed.remove_at(0)

	return trimmed


func _events_size_bytes(events: Array) -> int:
	var size := 0
	for event in events:
		size += JSON.stringify(event).to_utf8_buffer().size() + 1

	return size


func _ensure_root_path() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(_root_path))


func _state_path() -> String:
	return _root_path.path_join("state.json")


func _events_path() -> String:
	return _root_path.path_join("events.log")
