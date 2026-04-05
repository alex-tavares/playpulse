@tool
extends EditorPlugin

const AUTOLOAD_NAME := "PlayPulse"


func _enter_tree() -> void:
	var autoload_path := _resolve_autoload_path()
	add_autoload_singleton(AUTOLOAD_NAME, autoload_path)


func _exit_tree() -> void:
	remove_autoload_singleton(AUTOLOAD_NAME)


func _resolve_autoload_path() -> String:
	return get_script().resource_path.get_base_dir().path_join("playpulse.gd")
