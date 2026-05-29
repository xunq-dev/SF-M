use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Deserialize)]
pub struct AiChatMessage {
    pub role: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default, rename = "reasoning_content")]
    pub reasoning_content: Option<String>,
    #[serde(default, rename = "tool_call_id")]
    pub tool_call_id: Option<String>,
    #[serde(default, rename = "tool_calls")]
    pub tool_calls: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiToolCallEvent {
    pub id: String,
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AiStreamEvent {
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call: Option<AiToolCallEvent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AiChatResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thinking: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<AiToolCallEvent>>,
}

impl AiChatResult {
    fn ok(content: String) -> Self {
        Self {
            content: Some(content),
            error: None,
            thinking: None,
            tool_calls: None,
        }
    }

    fn err(message: impl Into<String>) -> Self {
        Self {
            content: None,
            error: Some(message.into()),
            thinking: None,
            tool_calls: None,
        }
    }
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())
}

fn api_error(provider: &str, status: reqwest::StatusCode, body: &str) -> String {
    if let Ok(data) = serde_json::from_str::<Value>(body) {
        if let Some(msg) = data
            .pointer("/error/message")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
        {
            return msg.to_string();
        }
        if let Some(msg) = data
            .get("message")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
        {
            return msg.to_string();
        }
    }
    if body.trim().is_empty() {
        return format!("{provider}: HTTP {status}");
    }
    format!(
        "{provider}: HTTP {status} — {}",
        body.chars().take(400).collect::<String>()
    )
}

fn combined_system(system: &str, script_context: Option<&str>) -> String {
    let mut out = system.trim().to_string();
    if let Some(ctx) = script_context.filter(|s| !s.trim().is_empty()) {
        out.push_str("\n\n---\n\n");
        out.push_str(ctx.trim());
    }
    out
}

const MAX_TOOL_MESSAGE_CHARS: usize = 6000;

fn truncate_content(content: &str, max: usize) -> String {
    if content.len() <= max {
        return content.to_string();
    }
    let mut end = max;
    while end > 0 && !content.is_char_boundary(end) {
        end -= 1;
    }
    format!(
        "{}\n...[truncated {} chars]",
        &content[..end],
        content.len() - end
    )
}

fn map_transport_error(message: &str) -> String {
    let lower = message.to_lowercase();
    if lower.contains("decoding response body") {
        "Connection interrupted or the provider response was too large. Try a new chat or a shorter request.".to_string()
    } else {
        message.to_string()
    }
}

fn openai_messages(system: &str, messages: &[AiChatMessage]) -> Vec<Value> {
    let mut out = vec![json!({ "role": "system", "content": system })];
    for m in messages {
        if m.role == "system" {
            continue;
        }
        let mut msg = json!({ "role": m.role });
        if m.role == "assistant" {
            if let Some(tool_calls) = &m.tool_calls {
                msg["tool_calls"] = tool_calls.clone();
                let content_empty = m.content.as_ref().map(|s| s.is_empty()).unwrap_or(true);
                if content_empty {
                    msg["content"] = Value::Null;
                } else if let Some(content) = &m.content {
                    msg["content"] = json!(content);
                }
            } else if let Some(content) = &m.content {
                msg["content"] = json!(content);
            }
        } else if m.role == "tool" {
            let content = m.content.as_deref().unwrap_or("");
            msg["content"] = json!(truncate_content(content, MAX_TOOL_MESSAGE_CHARS));
        } else if let Some(content) = &m.content {
            msg["content"] = json!(content);
        }
        if let Some(reasoning) = &m.reasoning_content {
            if !reasoning.is_empty() {
                msg["reasoning_content"] = json!(reasoning);
            }
        }
        if let Some(tool_call_id) = &m.tool_call_id {
            msg["tool_call_id"] = json!(tool_call_id);
        }
        out.push(msg);
    }
    out
}

fn claude_messages(messages: &[AiChatMessage]) -> Vec<Value> {
    messages
    .iter()
    .filter(|m| m.role != "system")
    .map(|m| {
      if m.role == "tool" {
        json!({
          "role": "user",
          "content": [{
            "type": "tool_result",
            "tool_use_id": m.tool_call_id.clone().unwrap_or_default(),
            "content": truncate_content(&m.content.clone().unwrap_or_default(), MAX_TOOL_MESSAGE_CHARS),
          }]
        })
      } else if m.role == "assistant" {
        if let Some(tool_calls) = &m.tool_calls {
          let blocks: Vec<Value> = tool_calls
            .as_array()
            .map(|arr| {
              arr.iter()
                .filter_map(|tc| {
                  let id = tc.get("id")?.as_str()?;
                  let func = tc.get("function")?;
                  Some(json!({
                    "type": "tool_use",
                    "id": id,
                    "name": func.get("name")?.as_str().unwrap_or(""),
                    "input": serde_json::from_str::<Value>(
                      func.get("arguments")?.as_str().unwrap_or("{}")
                    ).unwrap_or(json!({})),
                  }))
                })
                .collect()
            })
            .unwrap_or_default();
          json!({ "role": "assistant", "content": blocks })
        } else {
          json!({ "role": "assistant", "content": m.content.clone().unwrap_or_default() })
        }
      } else {
        json!({ "role": m.role, "content": m.content.clone().unwrap_or_default() })
      }
    })
    .collect()
}

fn claude_tools(tools: Option<&Value>) -> Option<Value> {
    let arr = tools?.as_array()?;
    let mapped: Vec<Value> = arr
        .iter()
        .filter_map(|t| {
            let func = t.get("function")?;
            Some(json!({
              "name": func.get("name")?.as_str()?,
              "description": func.get("description").and_then(Value::as_str).unwrap_or(""),
              "input_schema": func.get("parameters").cloned().unwrap_or(json!({})),
            }))
        })
        .collect();
    if mapped.is_empty() {
        None
    } else {
        Some(Value::Array(mapped))
    }
}

fn opencode_uses_messages(model: &str) -> bool {
    model.starts_with("claude-")
}

fn stream_event_name(request_id: &str) -> String {
    format!("ai-chat-stream-{request_id}")
}

fn emit_stream(app: &AppHandle, request_id: &str, event: AiStreamEvent) {
    let _ = app.emit(&stream_event_name(request_id), event);
}

async fn post_json(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    auth: AuthStyle,
    body: Value,
) -> Result<(reqwest::StatusCode, String), String> {
    let mut req = client.post(url).header("Content-Type", "application/json");
    req = match auth {
        AuthStyle::Bearer => req.bearer_auth(api_key),
        AuthStyle::Anthropic => req
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01"),
        AuthStyle::Google => req.header("x-goog-api-key", api_key),
    };
    let res = req
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok((status, text))
}

enum AuthStyle {
    Bearer,
    Anthropic,
    Google,
}

fn parse_openai_chat(body: &str) -> AiChatResult {
    let data: Value = match serde_json::from_str(body) {
        Ok(v) => v,
        Err(e) => return AiChatResult::err(format!("Invalid OpenAI response: {e}")),
    };
    let message = &data["choices"][0]["message"];
    let thinking = message
        .get("reasoning_content")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let content = message
        .get("content")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let tool_calls = parse_openai_tool_calls(message.get("tool_calls"));
    if tool_calls.is_some() {
        return AiChatResult {
            content,
            error: None,
            thinking,
            tool_calls,
        };
    }
    match content {
        Some(text) => AiChatResult {
            content: Some(text),
            error: None,
            thinking,
            tool_calls: None,
        },
        None => AiChatResult::err("Empty response from provider."),
    }
}

fn dedupe_tool_calls(calls: Vec<AiToolCallEvent>) -> Vec<AiToolCallEvent> {
    let mut seen = std::collections::HashSet::new();
    calls
        .into_iter()
        .filter(|c| !c.id.is_empty() && seen.insert(c.id.clone()))
        .collect()
}

fn parse_openai_tool_calls(value: Option<&Value>) -> Option<Vec<AiToolCallEvent>> {
    let arr = value?.as_array()?;
    let mut out = Vec::new();
    for tc in arr {
        let id = tc.get("id")?.as_str()?.to_string();
        let func = tc.get("function")?;
        out.push(AiToolCallEvent {
            id,
            name: func.get("name")?.as_str()?.to_string(),
            arguments: func.get("arguments")?.as_str().unwrap_or("{}").to_string(),
        });
    }
    if out.is_empty() {
        None
    } else {
        Some(dedupe_tool_calls(out))
    }
}

fn parse_claude(body: &str) -> AiChatResult {
    let data: Value = match serde_json::from_str(body) {
        Ok(v) => v,
        Err(e) => return AiChatResult::err(format!("Invalid Claude response: {e}")),
    };
    let parts = data
        .get("content")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut text_parts = Vec::new();
    let mut tool_calls = Vec::new();
    for part in parts {
        match part.get("type").and_then(Value::as_str) {
            Some("text") => {
                if let Some(t) = part.get("text").and_then(Value::as_str) {
                    text_parts.push(t.to_string());
                }
            }
            Some("tool_use") => {
                tool_calls.push(AiToolCallEvent {
                    id: part
                        .get("id")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    name: part
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    arguments: part.get("input").cloned().unwrap_or(json!({})).to_string(),
                });
            }
            _ => {}
        }
    }
    let content = text_parts.join("").trim().to_string();
    if !tool_calls.is_empty() {
        return AiChatResult {
            content: if content.is_empty() {
                None
            } else {
                Some(content)
            },
            error: None,
            thinking: None,
            tool_calls: Some(tool_calls),
        };
    }
    if content.is_empty() {
        return AiChatResult::err("Empty response from Claude.");
    }
    AiChatResult::ok(content)
}

fn parse_gemini(body: &str) -> AiChatResult {
    let data: Value = match serde_json::from_str(body) {
        Ok(v) => v,
        Err(e) => return AiChatResult::err(format!("Invalid Gemini response: {e}")),
    };
    let parts = data
        .pointer("/candidates/0/content/parts")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let text = parts
        .iter()
        .filter_map(|part| part.get("text").and_then(Value::as_str))
        .collect::<Vec<_>>()
        .join("")
        .trim()
        .to_string();
    if text.is_empty() {
        return AiChatResult::err("Empty response from Gemini.");
    }
    AiChatResult::ok(text)
}

async fn send_openai_compatible(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    model: &str,
    system: &str,
    messages: &[AiChatMessage],
    tools: Option<&Value>,
    provider_label: &str,
) -> AiChatResult {
    let mut body = json!({
      "model": model,
      "messages": openai_messages(system, messages),
    });
    if let Some(t) = tools {
        body["tools"] = t.clone();
        body["tool_choice"] = json!("auto");
    }
    let (status, text) = match post_json(client, url, api_key, AuthStyle::Bearer, body).await {
        Ok(v) => v,
        Err(e) => return AiChatResult::err(map_transport_error(&e)),
    };
    if !status.is_success() {
        return AiChatResult::err(api_error(provider_label, status, &text));
    }
    parse_openai_chat(&text)
}

async fn send_claude_messages(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    model: &str,
    system: &str,
    messages: &[AiChatMessage],
    tools: Option<&Value>,
    provider_label: &str,
) -> AiChatResult {
    let mut body = json!({
      "model": model,
      "max_tokens": 8192,
      "system": system,
      "messages": claude_messages(messages),
    });
    if let Some(t) = claude_tools(tools) {
        body["tools"] = t;
    }
    let (status, text) = match post_json(client, url, api_key, AuthStyle::Anthropic, body).await {
        Ok(v) => v,
        Err(e) => return AiChatResult::err(map_transport_error(&e)),
    };
    if !status.is_success() {
        return AiChatResult::err(api_error(provider_label, status, &text));
    }
    parse_claude(&text)
}

async fn send_gemini(
    client: &reqwest::Client,
    api_key: &str,
    model: &str,
    system: &str,
    messages: &[AiChatMessage],
) -> AiChatResult {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
        model
    );
    let body = json!({
      "systemInstruction": { "parts": [{ "text": system }] },
      "contents": messages.iter().filter(|m| m.role != "system").map(|m| json!({
        "role": if m.role == "assistant" { "model" } else { "user" },
        "parts": [{ "text": m.content.clone().unwrap_or_default() }],
      })).collect::<Vec<_>>(),
    });
    let (status, text) = match post_json(&client, &url, api_key, AuthStyle::Google, body).await {
        Ok(v) => v,
        Err(e) => return AiChatResult::err(map_transport_error(&e)),
    };
    if !status.is_success() {
        return AiChatResult::err(api_error("Gemini", status, &text));
    }
    parse_gemini(&text)
}

struct OpenAiStreamAccum {
    content: String,
    thinking: String,
    tool_calls: std::collections::HashMap<usize, AiToolCallEvent>,
}

fn handle_openai_sse_chunk(
    data: &str,
    acc: &mut OpenAiStreamAccum,
    app: &AppHandle,
    request_id: &str,
) {
    let Ok(parsed) = serde_json::from_str::<Value>(data) else {
        return;
    };
    let choice = &parsed["choices"][0];
    let delta = &choice["delta"];
    if let Some(reasoning) = delta.get("reasoning_content").and_then(Value::as_str) {
        if !reasoning.is_empty() {
            acc.thinking.push_str(reasoning);
            emit_stream(
                app,
                request_id,
                AiStreamEvent {
                    kind: "thinking".into(),
                    delta: Some(reasoning.to_string()),
                    tool_call: None,
                    message: None,
                },
            );
        }
    }
    if let Some(content) = delta.get("content").and_then(Value::as_str) {
        if !content.is_empty() {
            acc.content.push_str(content);
            emit_stream(
                app,
                request_id,
                AiStreamEvent {
                    kind: "content".into(),
                    delta: Some(content.to_string()),
                    tool_call: None,
                    message: None,
                },
            );
        }
    }
    if let Some(calls) = delta.get("tool_calls").and_then(Value::as_array) {
        for tc in calls {
            let idx = tc.get("index").and_then(Value::as_u64).unwrap_or(0) as usize;
            let entry = acc
                .tool_calls
                .entry(idx)
                .or_insert_with(|| AiToolCallEvent {
                    id: String::new(),
                    name: String::new(),
                    arguments: String::new(),
                });
            if let Some(id) = tc.get("id").and_then(Value::as_str) {
                entry.id = id.to_string();
            }
            if let Some(name) = tc.pointer("/function/name").and_then(Value::as_str) {
                entry.name = name.to_string();
            }
            if let Some(args) = tc.pointer("/function/arguments").and_then(Value::as_str) {
                entry.arguments.push_str(args);
            }
        }
    }
}

async fn stream_openai_compatible(
    client: &reqwest::Client,
    app: AppHandle,
    request_id: String,
    url: &str,
    api_key: &str,
    model: &str,
    system: &str,
    messages: &[AiChatMessage],
    tools: Option<&Value>,
    provider_label: &str,
) -> AiChatResult {
    let mut body = json!({
      "model": model,
      "stream": true,
      "messages": openai_messages(system, messages),
    });
    if let Some(t) = tools {
        body["tools"] = t.clone();
        body["tool_choice"] = json!("auto");
    }
    let res = match client
        .post(url)
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return AiChatResult::err(map_transport_error(&format!("Request failed: {e}"))),
    };
    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        let msg = api_error(provider_label, status, &text);
        emit_stream(
            &app,
            &request_id,
            AiStreamEvent {
                kind: "error".into(),
                delta: None,
                tool_call: None,
                message: Some(msg.clone()),
            },
        );
        return AiChatResult::err(msg);
    }

    let mut acc = OpenAiStreamAccum {
        content: String::new(),
        thinking: String::new(),
        tool_calls: std::collections::HashMap::new(),
    };
    let mut stream = res.bytes_stream();
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => return AiChatResult::err(map_transport_error(&e.to_string())),
        };
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();
            if !line.starts_with("data:") {
                continue;
            }
            let data = line.trim_start_matches("data:").trim();
            if data == "[DONE]" {
                break;
            }
            handle_openai_sse_chunk(data, &mut acc, &app, &request_id);
        }
    }

    let tool_calls = dedupe_tool_calls(acc.tool_calls.into_values().collect());
    for tc in &tool_calls {
        emit_stream(
            &app,
            &request_id,
            AiStreamEvent {
                kind: "tool_call".into(),
                delta: None,
                tool_call: Some(tc.clone()),
                message: None,
            },
        );
    }

    emit_stream(
        &app,
        &request_id,
        AiStreamEvent {
            kind: "done".into(),
            delta: None,
            tool_call: None,
            message: None,
        },
    );

    AiChatResult {
        content: if acc.content.is_empty() {
            None
        } else {
            Some(acc.content)
        },
        error: None,
        thinking: if acc.thinking.is_empty() {
            None
        } else {
            Some(acc.thinking)
        },
        tool_calls: if tool_calls.is_empty() {
            None
        } else {
            Some(tool_calls)
        },
    }
}

async fn stream_claude(
    client: &reqwest::Client,
    app: AppHandle,
    request_id: String,
    url: &str,
    api_key: &str,
    model: &str,
    system: &str,
    messages: &[AiChatMessage],
    tools: Option<&Value>,
    provider_label: &str,
) -> AiChatResult {
    let mut body = json!({
      "model": model,
      "max_tokens": 8192,
      "stream": true,
      "system": system,
      "messages": claude_messages(messages),
    });
    if let Some(t) = claude_tools(tools) {
        body["tools"] = t;
    }
    let res = match client
        .post(url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return AiChatResult::err(map_transport_error(&format!("Request failed: {e}"))),
    };
    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        let msg = api_error(provider_label, status, &text);
        emit_stream(
            &app,
            &request_id,
            AiStreamEvent {
                kind: "error".into(),
                delta: None,
                tool_call: None,
                message: Some(msg.clone()),
            },
        );
        return AiChatResult::err(msg);
    }

    let mut content = String::new();
    let mut thinking = String::new();
    let mut tool_calls: Vec<AiToolCallEvent> = Vec::new();
    let mut current_tool: Option<AiToolCallEvent> = None;
    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => return AiChatResult::err(map_transport_error(&e.to_string())),
        };
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();
            if !line.starts_with("data:") {
                continue;
            }
            let data = line.trim_start_matches("data:").trim();
            let Ok(parsed) = serde_json::from_str::<Value>(data) else {
                continue;
            };
            match parsed.get("type").and_then(Value::as_str) {
                Some("content_block_start") => {
                    if parsed
                        .pointer("/content_block/type")
                        .and_then(Value::as_str)
                        == Some("tool_use")
                    {
                        current_tool = Some(AiToolCallEvent {
                            id: parsed
                                .pointer("/content_block/id")
                                .and_then(Value::as_str)
                                .unwrap_or("")
                                .to_string(),
                            name: parsed
                                .pointer("/content_block/name")
                                .and_then(Value::as_str)
                                .unwrap_or("")
                                .to_string(),
                            arguments: String::new(),
                        });
                    }
                }
                Some("content_block_delta") => {
                    let delta_type = parsed.pointer("/delta/type").and_then(Value::as_str);
                    let text = parsed
                        .pointer("/delta/text")
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    let partial_json = parsed
                        .pointer("/delta/partial_json")
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    if delta_type == Some("thinking_delta") || delta_type == Some("thinking") {
                        thinking.push_str(text);
                        emit_stream(
                            &app,
                            &request_id,
                            AiStreamEvent {
                                kind: "thinking".into(),
                                delta: Some(text.to_string()),
                                tool_call: None,
                                message: None,
                            },
                        );
                    } else if !text.is_empty() {
                        content.push_str(text);
                        emit_stream(
                            &app,
                            &request_id,
                            AiStreamEvent {
                                kind: "content".into(),
                                delta: Some(text.to_string()),
                                tool_call: None,
                                message: None,
                            },
                        );
                    }
                    if !partial_json.is_empty() {
                        if let Some(tool) = current_tool.as_mut() {
                            tool.arguments.push_str(partial_json);
                        }
                    }
                }
                Some("content_block_stop") => {
                    if let Some(tool) = current_tool.take() {
                        emit_stream(
                            &app,
                            &request_id,
                            AiStreamEvent {
                                kind: "tool_call".into(),
                                delta: None,
                                tool_call: Some(tool.clone()),
                                message: None,
                            },
                        );
                        tool_calls.push(tool);
                    }
                }
                _ => {}
            }
        }
    }

    let tool_calls = dedupe_tool_calls(tool_calls);

    emit_stream(
        &app,
        &request_id,
        AiStreamEvent {
            kind: "done".into(),
            delta: None,
            tool_call: None,
            message: None,
        },
    );

    AiChatResult {
        content: if content.is_empty() {
            None
        } else {
            Some(content)
        },
        error: None,
        thinking: if thinking.is_empty() {
            None
        } else {
            Some(thinking)
        },
        tool_calls: if tool_calls.is_empty() {
            None
        } else {
            Some(tool_calls)
        },
    }
}

async fn dispatch_chat(
    client: &reqwest::Client,
    provider: &str,
    api_key: &str,
    model: &str,
    system: &str,
    messages: &[AiChatMessage],
    tools: Option<&Value>,
    stream: bool,
    app: Option<AppHandle>,
    request_id: Option<String>,
) -> AiChatResult {
    if stream {
        let app = match app {
            Some(a) => a,
            None => return AiChatResult::err("App handle required for streaming."),
        };
        let request_id = match request_id {
            Some(id) => id,
            None => return AiChatResult::err("request_id required for streaming."),
        };
        match provider {
            "openai" => {
                return stream_openai_compatible(
                    client,
                    app,
                    request_id,
                    "https://api.openai.com/v1/chat/completions",
                    api_key,
                    model,
                    system,
                    messages,
                    tools,
                    "OpenAI",
                )
                .await;
            }
            "opencode" if opencode_uses_messages(model) => {
                return stream_claude(
                    client,
                    app,
                    request_id,
                    "https://opencode.ai/zen/v1/messages",
                    api_key,
                    model,
                    system,
                    messages,
                    tools,
                    "OpenCode",
                )
                .await;
            }
            "opencode" => {
                return stream_openai_compatible(
                    client,
                    app,
                    request_id,
                    "https://opencode.ai/zen/v1/chat/completions",
                    api_key,
                    model,
                    system,
                    messages,
                    tools,
                    "OpenCode",
                )
                .await;
            }
            "claude" => {
                return stream_claude(
                    client,
                    app,
                    request_id,
                    "https://api.anthropic.com/v1/messages",
                    api_key,
                    model,
                    system,
                    messages,
                    tools,
                    "Claude",
                )
                .await;
            }
            _ => {}
        }
    }

    match provider {
        "openai" => {
            send_openai_compatible(
                client,
                "https://api.openai.com/v1/chat/completions",
                api_key,
                model,
                system,
                messages,
                tools,
                "OpenAI",
            )
            .await
        }
        "opencode" if opencode_uses_messages(model) => {
            send_claude_messages(
                client,
                "https://opencode.ai/zen/v1/messages",
                api_key,
                model,
                system,
                messages,
                tools,
                "OpenCode",
            )
            .await
        }
        "opencode" => {
            send_openai_compatible(
                client,
                "https://opencode.ai/zen/v1/chat/completions",
                api_key,
                model,
                system,
                messages,
                tools,
                "OpenCode",
            )
            .await
        }
        "claude" => {
            send_claude_messages(
                client,
                "https://api.anthropic.com/v1/messages",
                api_key,
                model,
                system,
                messages,
                tools,
                "Claude",
            )
            .await
        }
        "gemini" => send_gemini(client, api_key, model, system, messages).await,
        other => AiChatResult::err(format!("Unsupported provider: {other}")),
    }
}

#[tauri::command]
pub async fn send_ai_chat(
    provider: String,
    api_key: String,
    model: String,
    system: String,
    script_context: Option<String>,
    messages: Vec<AiChatMessage>,
    tools: Option<Value>,
) -> AiChatResult {
    let key = api_key.trim();
    if key.is_empty() {
        return AiChatResult::err("Add an API key in Settings to start chatting.");
    }
    let model = model.trim();
    if model.is_empty() {
        return AiChatResult::err("Select a model in Settings.");
    }
    if messages.is_empty() {
        return AiChatResult::err("No messages to send.");
    }
    let client = match http_client() {
        Ok(c) => c,
        Err(e) => return AiChatResult::err(e),
    };
    let system = combined_system(&system, script_context.as_deref());
    dispatch_chat(
        &client,
        provider.as_str(),
        key,
        model,
        &system,
        &messages,
        tools.as_ref(),
        false,
        None,
        None,
    )
    .await
}

#[tauri::command]
pub async fn send_ai_chat_stream(
    app: AppHandle,
    request_id: String,
    provider: String,
    api_key: String,
    model: String,
    system: String,
    script_context: Option<String>,
    messages: Vec<AiChatMessage>,
    tools: Option<Value>,
) -> AiChatResult {
    let key = api_key.trim();
    if key.is_empty() {
        return AiChatResult::err("Add an API key in Settings to start chatting.");
    }
    let model = model.trim();
    if model.is_empty() {
        return AiChatResult::err("Select a model in Settings.");
    }
    if messages.is_empty() {
        return AiChatResult::err("No messages to send.");
    }
    let client = match http_client() {
        Ok(c) => c,
        Err(e) => return AiChatResult::err(e),
    };
    let system = combined_system(&system, script_context.as_deref());
    dispatch_chat(
        &client,
        provider.as_str(),
        key,
        model,
        &system,
        &messages,
        tools.as_ref(),
        true,
        Some(app),
        Some(request_id),
    )
    .await
}
