-- Synapse UI Executor Bridge (client)
-- Connects to the desktop UI WebSocket server and executes scripts sent from the editor.
--
-- UI server (fixed): ws://127.0.0.1:31337/ws
--
-- Features:
--   • Retries connection every 3s until the UI server is available
--   • Automatically reconnects on disconnect
--   • Robust re-execution: cleanly shuts down any previous instance

local WS_URL = "ws://127.0.0.1:31337/ws"
local RETRY_INTERVAL = 3

-- Wait for the game to fully load before doing any networking to prevent executor thread bricking
if game and type(game.IsLoaded) == "function" and not game:IsLoaded() then
    local ok, loaded = pcall(function() return game.Loaded end)
    if ok and loaded then loaded:Wait() end
    task.wait(0.5)
end

-- Stop any previously running bridge instance in this environment
if getgenv and type(getgenv().SynapseBridgeStop) == "function" then
    pcall(getgenv().SynapseBridgeStop)
end

local isRunning = true
local activeWs = nil

if getgenv then
    getgenv().SynapseBridgeStop = function()
        isRunning = false
        if activeWs then
            pcall(function() activeWs:Close() end)
        end
    end
end

-- === Adapter: websocket connect ===
local function ws_connect(url)
    if websocket and websocket.connect then return websocket.connect(url) end
    if syn and syn.websocket and syn.websocket.connect then return syn.websocket.connect(url) end
    if WebSocket and WebSocket.connect then return WebSocket.connect(url) end
    error("No websocket.connect API found in this executor.")
end

-- === Adapter: execute Lua / Luau source text ===
local function exec_source(src)
    if type(src) ~= "string" then error("invalid source") end
    if load then
        local ok, chunk, cerr = pcall(load, src, "@synapse_bridge", "t")
        if ok and type(chunk) == "function" then return chunk() end
        if ok and chunk == nil and cerr ~= nil then error(tostring(cerr)) end
        local chunk2, cerr2 = load(src, "@synapse_bridge")
        if type(chunk2) == "function" then return chunk2() end
        if chunk2 == nil and cerr2 ~= nil then error(tostring(cerr2)) end
        error(ok and "compile failed" or tostring(chunk))
    end
    if loadstring then
        local fn, err = loadstring(src, "@synapse_bridge")
        if type(fn) ~= "function" then error(tostring(err or "loadstring failed")) end
        return fn()
    end
    error("No load/loadstring available in this executor.")
end

-- === Minimal JSON ===
local function json_escape(s)
    return (s:gsub("\\", "\\\\"):gsub("\"", "\\\""):gsub("\n", "\\n"):gsub("\r", "\\r"))
end

local function json_string(s) return "\"" .. json_escape(s) .. "\"" end

local function json_encode_execute_result(id, ok, err)
    if ok then
        return "{\"type\":\"execute_result\",\"id\":" .. json_string(id) .. ",\"ok\":true}"
    end
    return "{\"type\":\"execute_result\",\"id\":" .. json_string(id) .. ",\"ok\":false,\"error\":" .. json_string(err or "unknown error") .. "}"
end

local function extract_field(msg, key)
    local pat = "\"" .. key .. "\"%s*:%s*\"([^\"]*)\""
    return msg:match(pat)
end

local function parse_execute_fields(message)
    if game then
        local ok, hs = pcall(function() return game:GetService("HttpService") end)
        if ok and hs and type(hs.JSONDecode) == "function" then
            local ok2, data = pcall(function() return hs:JSONDecode(message) end)
            if ok2 and type(data) == "table" and data.type == "execute" then
                return data.id or "unknown", data.source_b64 or "", data.encoding or "base64"
            end
        end
    end
    if extract_field(message, "type") ~= "execute" then return nil end
    return extract_field(message, "id") or "unknown", extract_field(message, "source_b64") or "", extract_field(message, "encoding") or "base64"
end

local function b64_decode(s)
    if syn and syn.crypt and syn.crypt.base64 and syn.crypt.base64.decode then return syn.crypt.base64.decode(s) end
    if crypt and crypt.base64 and crypt.base64.decode then return crypt.base64.decode(s) end
    if base64 and base64.decode then return base64.decode(s) end
    error("No base64 decode API found.")
end

-- === Persistent print/warn forwarding ===
local _originalPrint = getgenv and getgenv()._synBridgeOrigPrint or print
local _originalWarn = getgenv and getgenv()._synBridgeOrigWarn or warn
if getgenv then
    getgenv()._synBridgeOrigPrint = _originalPrint
    getgenv()._synBridgeOrigWarn = _originalWarn
end

local function send_log(level, msg)
    local ws = activeWs
    if not ws or not ws.Send then return end
    local body = "{\"type\":\"log\",\"level\":" .. json_string(level) .. ",\"message\":" .. json_string(tostring(msg)) .. "}"
    pcall(function() ws:Send(body) end)
end

print = function(...)
    local parts = {}
    for i = 1, select("#", ...) do parts[i] = tostring(select(i, ...)) end
    send_log("info", table.concat(parts, " "))
    return _originalPrint(...)
end

if type(_originalWarn) == "function" then
    warn = function(...)
        local parts = {}
        for i = 1, select("#", ...) do parts[i] = tostring(select(i, ...)) end
        send_log("warn", table.concat(parts, " "))
        return _originalWarn(...)
    end
end

-- === Main connection loop ===
local function run_bridge()
    -- Hook OnTeleport to gracefully close the socket and prevent "Already connected" ghost sockets
    pcall(function()
        local Players = game:GetService("Players")
        local function hook_lp(lp)
            pcall(function()
                lp.OnTeleport:Connect(function()
                    if activeWs then pcall(function() activeWs:Close() end) end
                end)
            end)
        end
        if Players.LocalPlayer then hook_lp(Players.LocalPlayer) end
        Players:GetPropertyChangedSignal("LocalPlayer"):Connect(function()
            if Players.LocalPlayer then hook_lp(Players.LocalPlayer) end
        end)
    end)

    while isRunning do
        local ws
        local ok, err = pcall(function()
            -- Append a random query parameter to bypass executor singleton url checks for orphaned sockets
            local url = WS_URL .. "?t=" .. tostring(tick())
            ws = ws_connect(url)
        end)

        if not ok or not ws then
            if isRunning then
                _originalPrint("[bridge] connection failed:", tostring(err), "- retrying in " .. RETRY_INTERVAL .. "s")
                task.wait(RETRY_INTERVAL)
            end
        else
            activeWs = ws
            _originalPrint("[bridge] connected to UI")

            pcall(function() ws:Send("{\"type\":\"hello\",\"client\":\"websocket-bridge\",\"version\":1}") end)

            ws.OnMessage:Connect(function(message)
                if not isRunning or type(message) ~= "string" then return end
                local id, source_b64, encoding = parse_execute_fields(message)
                if not id then return end

                local source = ""
                local ok_b64, decoded = pcall(b64_decode, source_b64)
                if ok_b64 then
                    source = decoded
                else
                    pcall(function() ws:Send(json_encode_execute_result(id, false, "base64 decode failed")) end)
                    return
                end

                local ok_exec, exec_err = pcall(function() exec_source(source) end)
                if ok_exec then
                    pcall(function() ws:Send(json_encode_execute_result(id, true)) end)
                else
                    pcall(function() ws:Send(json_encode_execute_result(id, false, tostring(exec_err))) end)
                end
            end)

            local disconnected = false
            ws.OnClose:Connect(function()
                disconnected = true
                if activeWs == ws then activeWs = nil end
                if isRunning then
                    _originalPrint("[bridge] disconnected, will reconnect in " .. RETRY_INTERVAL .. "s")
                end
            end)

            while not disconnected and isRunning do
                task.wait(0.5)
            end

            if isRunning then
                task.wait(RETRY_INTERVAL)
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
                local code = game:HttpGet("http://127.0.0.1:31337/websocket_bridge.lua")
                if code and code ~= "" then
                    local fn = loadstring(code)
                    if type(fn) == "function" then fn() end
                end
            end)
        ]])
    end)
end
