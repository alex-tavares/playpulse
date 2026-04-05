extends Node

signal completed(result: Dictionary)

var _http_request: HTTPRequest
var _busy := false


func _ready() -> void:
	_http_request = HTTPRequest.new()
	add_child(_http_request)
	_http_request.request_completed.connect(_on_request_completed)


func send(url: String, headers: PackedStringArray, body: String) -> int:
	if _busy:
		return ERR_BUSY

	_busy = true
	var error := _http_request.request(url, headers, HTTPClient.METHOD_POST, body)
	if error != OK:
		_busy = false

	return error


func cancel() -> void:
	if _busy:
		_http_request.cancel_request()
		_busy = false


func is_busy() -> bool:
	return _busy


func _on_request_completed(
	request_result: int,
	response_code: int,
	headers: PackedStringArray,
	body: PackedByteArray
) -> void:
	_busy = false
	completed.emit({
		"transport_error": request_result,
		"status_code": response_code,
		"headers": headers,
		"body_text": body.get_string_from_utf8(),
	})
