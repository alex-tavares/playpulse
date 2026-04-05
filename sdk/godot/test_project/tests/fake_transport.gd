extends Node

signal completed(result: Dictionary)

var auto_complete := true
var requests: Array = []
var _responses: Array = []
var _busy := false


func queue_response(
	transport_error: int = OK,
	status_code: int = 202,
	body_text: String = "{\"data\":{\"accepted_count\":1}}"
) -> void:
	_responses.append({
		"transport_error": transport_error,
		"status_code": status_code,
		"body_text": body_text,
		"headers": PackedStringArray(),
	})


func send(url: String, headers: PackedStringArray, body: String) -> int:
	if _busy:
		return ERR_BUSY

	_busy = true
	requests.append({
		"url": url,
		"headers": Array(headers),
		"body": body,
	})

	if auto_complete:
		call_deferred("complete_next")

	return OK


func complete_next() -> void:
	if not _busy:
		return

	if _responses.is_empty():
		queue_response()

	_busy = false
	completed.emit(_responses.pop_front())


func cancel() -> void:
	_busy = false


func is_busy() -> bool:
	return _busy
