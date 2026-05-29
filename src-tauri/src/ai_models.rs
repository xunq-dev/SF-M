use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct AiModelOption {
    pub id: String,
    pub label: String,
}

#[derive(Deserialize)]
struct OpenAiListResponse {
    data: Option<Vec<OpenAiModelEntry>>,
}

#[derive(Deserialize)]
struct OpenAiModelEntry {
    id: Option<String>,
}

#[derive(Deserialize)]
struct ClaudeListResponse {
    data: Option<Vec<ClaudeModelEntry>>,
    has_more: Option<bool>,
    last_id: Option<String>,
}

#[derive(Deserialize)]
struct ClaudeModelEntry {
    id: Option<String>,
    display_name: Option<String>,
}

#[derive(Deserialize)]
struct GeminiListResponse {
    models: Option<Vec<GeminiModelEntry>>,
    next_page_token: Option<String>,
}

#[derive(Deserialize)]
struct GeminiModelEntry {
    name: Option<String>,
    supported_generation_methods: Option<Vec<String>>,
}

fn sort_options(mut options: Vec<AiModelOption>) -> Vec<AiModelOption> {
    options.sort_by(|a, b| a.id.cmp(&b.id));
    options
}

fn api_error(provider: &str, status: reqwest::StatusCode, body: &str) -> String {
    if body.trim().is_empty() {
        return format!("{provider} models: HTTP {status}");
    }
    let snippet: String = body.chars().take(400).collect();
    format!("{provider} models: HTTP {status} — {snippet}")
}

fn is_openai_chat_model(id: &str) -> bool {
    let lower = id.to_lowercase();
    const EXCLUDED: &[&str] = &[
        "embedding",
        "whisper",
        "dall-e",
        "tts",
        "moderation",
        "davinci",
        "babbage",
        "curie",
        "ada",
        "realtime",
        "transcribe",
        "sora",
        "audio-preview",
        "image",
    ];
    if EXCLUDED.iter().any(|part| lower.contains(part)) {
        return false;
    }
    lower.starts_with("gpt-")
        || lower.starts_with("o1")
        || lower.starts_with("o3")
        || lower.starts_with("o4")
        || lower.starts_with("chatgpt-")
}

async fn fetch_opencode(
    client: &reqwest::Client,
    api_key: &str,
) -> Result<Vec<AiModelOption>, String> {
    let res = client
        .get("https://opencode.ai/zen/v1/models")
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|e| format!("OpenCode models: {e}"))?;
    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(api_error("OpenCode", status, &body));
    }
    let data: OpenAiListResponse =
        serde_json::from_str(&body).map_err(|e| format!("OpenCode models parse error: {e}"))?;
    let options = data
        .data
        .unwrap_or_default()
        .into_iter()
        .filter_map(|m| m.id.filter(|id| !id.is_empty()))
        .map(|id| AiModelOption {
            label: id.clone(),
            id,
        })
        .collect::<Vec<_>>();
    if options.is_empty() {
        return Err("OpenCode returned no models.".into());
    }
    Ok(sort_options(options))
}

async fn fetch_openai(
    client: &reqwest::Client,
    api_key: &str,
) -> Result<Vec<AiModelOption>, String> {
    let res = client
        .get("https://api.openai.com/v1/models")
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(|e| format!("OpenAI models: {e}"))?;
    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(api_error("OpenAI", status, &body));
    }
    let data: OpenAiListResponse =
        serde_json::from_str(&body).map_err(|e| format!("OpenAI models parse error: {e}"))?;
    let options = data
        .data
        .unwrap_or_default()
        .into_iter()
        .filter_map(|m| m.id.filter(|id| !id.is_empty() && is_openai_chat_model(id)))
        .map(|id| AiModelOption {
            label: id.clone(),
            id,
        })
        .collect::<Vec<_>>();
    if options.is_empty() {
        return Err("OpenAI returned no chat models for this key.".into());
    }
    Ok(sort_options(options))
}

async fn fetch_claude_page(
    client: &reqwest::Client,
    api_key: &str,
    after_id: Option<&str>,
) -> Result<ClaudeListResponse, String> {
    let mut req = client
        .get("https://api.anthropic.com/v1/models")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01");
    if let Some(id) = after_id {
        req = req.query(&[("after_id", id)]);
    }
    let res = req
        .send()
        .await
        .map_err(|e| format!("Claude models: {e}"))?;
    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(api_error("Claude", status, &body));
    }
    serde_json::from_str(&body).map_err(|e| format!("Claude models parse error: {e}"))
}

async fn fetch_claude(
    client: &reqwest::Client,
    api_key: &str,
) -> Result<Vec<AiModelOption>, String> {
    let mut options = Vec::new();
    let mut after_id: Option<String> = None;
    loop {
        let page = fetch_claude_page(client, api_key, after_id.as_deref()).await?;
        for entry in page.data.unwrap_or_default() {
            if let Some(id) = entry.id.filter(|v| !v.is_empty()) {
                let label = entry
                    .display_name
                    .as_ref()
                    .map(|n| n.trim())
                    .filter(|n| !n.is_empty())
                    .map(|n| format!("{n} ({id})"))
                    .unwrap_or_else(|| id.clone());
                options.push(AiModelOption { id, label });
            }
        }
        if page.has_more == Some(true) {
            after_id = page.last_id;
            if after_id.is_none() {
                break;
            }
        } else {
            break;
        }
    }
    if options.is_empty() {
        return Err("Claude returned no models.".into());
    }
    Ok(options)
}

async fn fetch_gemini_page(
    client: &reqwest::Client,
    api_key: &str,
    page_token: Option<&str>,
) -> Result<GeminiListResponse, String> {
    let mut req = client.get("https://generativelanguage.googleapis.com/v1beta/models");
    req = req.query(&[("key", api_key), ("pageSize", "100")]);
    if let Some(token) = page_token {
        req = req.query(&[("pageToken", token)]);
    }
    let res = req
        .send()
        .await
        .map_err(|e| format!("Gemini models: {e}"))?;
    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(api_error("Gemini", status, &body));
    }
    serde_json::from_str(&body).map_err(|e| format!("Gemini models parse error: {e}"))
}

fn gemini_supports_chat(entry: &GeminiModelEntry) -> bool {
    if let Some(methods) = &entry.supported_generation_methods {
        return methods.iter().any(|m| m == "generateContent");
    }
    entry
        .name
        .as_deref()
        .map(|n| n.to_lowercase().contains("gemini"))
        .unwrap_or(false)
}

async fn fetch_gemini(
    client: &reqwest::Client,
    api_key: &str,
) -> Result<Vec<AiModelOption>, String> {
    let mut options = Vec::new();
    let mut page_token: Option<String> = None;
    loop {
        let page = fetch_gemini_page(client, api_key, page_token.as_deref()).await?;
        for entry in page.models.unwrap_or_default() {
            if !gemini_supports_chat(&entry) {
                continue;
            }
            if let Some(name) = entry.name.filter(|n| !n.is_empty()) {
                let id = name.strip_prefix("models/").unwrap_or(&name).to_string();
                if !id.is_empty() {
                    options.push(AiModelOption {
                        label: id.clone(),
                        id,
                    });
                }
            }
        }
        page_token = page.next_page_token.filter(|t| !t.is_empty());
        if page_token.is_none() {
            break;
        }
    }
    if options.is_empty() {
        return Err("Gemini returned no generateContent models.".into());
    }
    Ok(sort_options(options))
}

#[tauri::command]
pub async fn fetch_ai_models(
    provider: String,
    api_key: String,
) -> Result<Vec<AiModelOption>, String> {
    let key = api_key.trim();
    if key.is_empty() {
        return Err("API key is required to load models.".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    match provider.as_str() {
        "opencode" => fetch_opencode(&client, key).await,
        "openai" => fetch_openai(&client, key).await,
        "claude" => fetch_claude(&client, key).await,
        "gemini" => fetch_gemini(&client, key).await,
        other => Err(format!("Unknown provider: {other}")),
    }
}
