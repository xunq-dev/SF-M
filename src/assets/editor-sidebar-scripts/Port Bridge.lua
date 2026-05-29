-- Synapse UI Executor Bridge — "Port Bridge" client (HTTP polling)
--
-- UI server (fixed): http://127.0.0.1:31337/port_bridge/*
--
-- Universal compatibility: the only hard dependency is `game:HttpGet`. The
-- script uses `request()` (or `syn.request` / `http_request` fallbacks) for
-- POSTs when available, otherwise falls back to GET endpoints with
-- base64-encoded query parameters. Designed to work on even very limited
-- executors.
--
-- Features:
--   * Long-polling against /port_bridge/next (server holds the GET open for
--     up to ~12s, so an Execute click lands instantly in steady state)
--   * Forwards print/warn into the F9 console as `log` events
--   * Robust re-execution: cleanly shuts down any previous instance

local BASE_URL = "http://127.0.0.1:31337/port_bridge"
local POLL_BACKOFF = 0.5
local ERROR_BACKOFF = 3

if game and type(game.IsLoaded) == "function" and not game:IsLoaded() then
    local ok, loaded = pcall(function() return game.Loaded end)
    if ok and loaded then loaded:Wait() end
    task.wait(0.5)
end

if getgenv and type(getgenv().SynapsePortBridgeStop) == "function" then
    pcall(getgenv().SynapsePortBridgeStop)
end

local isRunning = true

if getgenv then
    getgenv().SynapsePortBridgeStop = function()
        isRunning = false
    end
end

-- === HTTP adapter ===
-- The universal floor: game:HttpGet. Some executors only expose this.
local function http_get(url)
    if game and type(game.HttpGet) == "function" then
        local ok, body = pcall(function() return game:HttpGet(url) end)
        if ok and body then return body end
        return nil, tostring(body)
    end
    local req = request or (syn and syn.request) or http_request
    if req then
        local ok, res = pcall(req, { Url = url, Method = "GET" })
        if ok and res then
            local body = res.Body or res.body
            local status = res.StatusCode or res.status
            if (status == nil or status == 200) and body then return body end
            return nil, "HTTP " .. tostring(status)
        end
        return nil, tostring(res)
    end
    return nil, "No HTTP API available"
end

-- Best-effort POST with JSON body. Returns true on success, false on failure
-- so callers can fall back to a GET form with base64 query params.
local function http_post_json(url, body_str)
    local req = request or (syn and syn.request) or http_request
    if req then
        local ok, res = pcall(req, {
            Url = url,
            Method = "POST",
            Headers = { ["Content-Type"] = "application/json" },
            Body = body_str,
        })
        if ok and res then
            local status = res.StatusCode or res.status
            if status == nil or status == 200 then return true end
            return false, "HTTP " .. tostring(status)
        end
        return false, tostring(res)
    end
    return false, "no POST API"
end

-- === Minimal JSON helpers ===
local function json_escape(s)
    return (s:gsub("\\", "\\\\"):gsub("\"", "\\\""):gsub("\n", "\\n"):gsub("\r", "\\r"))
end
local function json_string(s) return "\"" .. json_escape(s) .. "\"" end

local function http_service_decode(s)
    if game then
        local ok, hs = pcall(function() return game:GetService("HttpService") end)
        if ok and hs and type(hs.JSONDecode) == "function" then
            local ok2, data = pcall(function() return hs:JSONDecode(s) end)
            if ok2 then return data end
        end
    end
    return nil
end

local function extract_field(msg, key)
    local pat = "\"" .. key .. "\"%s*:%s*\"([^\"]*)\""
    return msg:match(pat)
end

-- Pure-Lua base64 encode for the rare executor that exposes neither
-- syn.crypt.base64.encode nor crypt.base64.encode. Slow but never wrong.
local function pure_b64_encode(s)
    local alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    local result, len = {}, #s
    for i = 1, len, 3 do
        local b1, b2, b3 = s:byte(i, i + 2)
        b2, b3 = b2 or 0, b3 or 0
        local n = b1 * 65536 + b2 * 256 + b3
        local c1 = math.floor(n / 262144) % 64 + 1
        local c2 = math.floor(n / 4096) % 64 + 1
        local c3 = math.floor(n / 64) % 64 + 1
        local c4 = n % 64 + 1
        result[#result + 1] = alphabet:sub(c1, c1)
        result[#result + 1] = alphabet:sub(c2, c2)
        result[#result + 1] = (i + 1 > len) and "=" or alphabet:sub(c3, c3)
        result[#result + 1] = (i + 2 > len) and "=" or alphabet:sub(c4, c4)
    end
    return table.concat(result)
end

local function b64_encode(s)
    if syn and syn.crypt and syn.crypt.base64 and syn.crypt.base64.encode then return syn.crypt.base64.encode(s) end
    if crypt and crypt.base64 and crypt.base64.encode then return crypt.base64.encode(s) end
    if base64 and base64.encode then return base64.encode(s) end
    return pure_b64_encode(s)
end

local function b64_decode(s)
    if syn and syn.crypt and syn.crypt.base64 and syn.crypt.base64.decode then return syn.crypt.base64.decode(s) end
    if crypt and crypt.base64 and crypt.base64.decode then return crypt.base64.decode(s) end
    if base64 and base64.decode then return base64.decode(s) end
    error("No base64 decode API found.")
end

local function url_encode(s)
    s = tostring(s):gsub("([^%w%-_.~])", function(c)
        return string.format("%%%02X", c:byte())
    end)
    return s
end

-- === Exec adapter ===
-- See Websocket Bridge.lua for the rationale behind the "t" mode + fallback
-- pattern. Same logic, separate chunk name to avoid colliding in tracebacks.
local function exec_source(src)
    if type(src) ~= "string" then error("invalid source") end
    if load then
        local ok, chunk, cerr = pcall(load, src, "@synapse_port_bridge", "t")
        if ok and type(chunk) == "function" then return chunk() end
        if ok and chunk == nil and cerr ~= nil then error(tostring(cerr)) end
        local chunk2, cerr2 = load(src, "@synapse_port_bridge")
        if type(chunk2) == "function" then return chunk2() end
        if chunk2 == nil and cerr2 ~= nil then error(tostring(cerr2)) end
        error(ok and "compile failed" or tostring(chunk))
    end
    if loadstring then
        local fn, err = loadstring(src, "@synapse_port_bridge")
        if type(fn) ~= "function" then error(tostring(err or "loadstring failed")) end
        return fn()
    end
    error("No load/loadstring available in this executor.")
end

-- === Send helpers ===
local function send_hello()
    local body = "{\"client\":\"port-bridge\",\"version\":1}"
    local ok = http_post_json(BASE_URL .. "/hello", body)
    if not ok then
        http_get(BASE_URL .. "/hello?client=port-bridge&version=1")
    end
end

local function send_result(id, ok_flag, err)
    local body
    if ok_flag then
        body = "{\"id\":" .. json_string(id) .. ",\"ok\":true}"
    else
        body = "{\"id\":" .. json_string(id) .. ",\"ok\":false,\"error\":" .. json_string(err or "unknown error") .. "}"
    end
    local sent = http_post_json(BASE_URL .. "/result", body)
    if not sent then
        local url
        if ok_flag then
            url = BASE_URL .. "/result?id=" .. url_encode(id) .. "&ok=true"
        else
            url = BASE_URL .. "/result?id=" .. url_encode(id) .. "&ok=false&error_b64=" .. url_encode(b64_encode(err or "unknown error"))
        end
        http_get(url)
    end
end

local function send_log(level, msg)
    msg = tostring(msg)
    local body = "{\"level\":" .. json_string(level) .. ",\"message\":" .. json_string(msg) .. "}"
    local sent = http_post_json(BASE_URL .. "/log", body)
    if not sent then
        local url = BASE_URL .. "/log?level=" .. url_encode(level) .. "&message_b64=" .. url_encode(b64_encode(msg))
        http_get(url)
    end
end

-- === Forwarded print/warn (persists across re-runs) ===
local _originalPrint = (getgenv and getgenv()._synPortBridgeOrigPrint) or print
local _originalWarn = (getgenv and getgenv()._synPortBridgeOrigWarn) or warn
if getgenv then
    getgenv()._synPortBridgeOrigPrint = _originalPrint
    getgenv()._synPortBridgeOrigWarn = _originalWarn
end

print = function(...)
    local parts = {}
    for i = 1, select("#", ...) do parts[i] = tostring(select(i, ...)) end
    pcall(send_log, "info", table.concat(parts, " "))
    return _originalPrint(...)
end

if type(_originalWarn) == "function" then
    warn = function(...)
        local parts = {}
        for i = 1, select("#", ...) do parts[i] = tostring(select(i, ...)) end
        pcall(send_log, "warn", table.concat(parts, " "))
        return _originalWarn(...)
    end
end

-- === Polling loop ===
-- Returns id, source_b64 from a `/port_bridge/next` body, or nil if exec is null.
local function parse_next_response(body)
    local data = http_service_decode(body)
    if data and type(data) == "table" and type(data.exec) == "table" then
        return data.exec.id, data.exec.source_b64
    end
    -- Manual fallback for executors without HttpService:JSONDecode.
    if body:find("\"exec\"%s*:%s*null", 1, false) then return nil end
    local id = extract_field(body, "id")
    local source_b64 = extract_field(body, "source_b64")
    if id and source_b64 then return id, source_b64 end
    return nil
end

local function run_bridge()
    _originalPrint("[port-bridge] starting HTTP polling against " .. BASE_URL)
    pcall(send_hello)

    while isRunning do
        local body, err = http_get(BASE_URL .. "/next")
        if not body then
            if isRunning then
                _originalPrint("[port-bridge] poll failed:", tostring(err), "- retrying in " .. ERROR_BACKOFF .. "s")
                task.wait(ERROR_BACKOFF)
                pcall(send_hello)
            end
        else
            local id, source_b64 = parse_next_response(body)
            if id and source_b64 then
                local source
                local ok_b64, decoded = pcall(b64_decode, source_b64)
                if ok_b64 then
                    source = decoded
                else
                    pcall(send_result, id, false, "base64 decode failed")
                end

                if source then
                    local ok_exec, exec_err = pcall(function() exec_source(source) end)
                    if ok_exec then
                        pcall(send_result, id, true)
                    else
                        pcall(send_result, id, false, tostring(exec_err))
                    end
                end
            else
                -- The server long-polls for ~12s; this tiny backoff just
                -- prevents a tight loop if `next` ever returns early.
                task.wait(POLL_BACKOFF)
            end
        end
    end
end

task.spawn(run_bridge)

-- === Teleport Persistence ===
local qot = queue_on_teleport or (syn and syn.queue_on_teleport) or queueonteleport
if type(qot) == "function" then
    pcall(function()
        qot([[
            pcall(function()
                if game and type(game.IsLoaded) == "function" and not game:IsLoaded() then
                    local ok, loaded = pcall(function() return game.Loaded end)
                    if ok and loaded then loaded:Wait() end
                end
                task.wait(1)
                local code = game:HttpGet("http://127.0.0.1:31337/port_bridge.lua")
                if code and code ~= "" then
                    local fn = loadstring(code)
                    if type(fn) == "function" then fn() end
                end
            end)
        ]])
    end)
end
