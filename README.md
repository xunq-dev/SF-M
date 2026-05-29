<p align="center">
<pre>
███████╗██╗   ██╗███╗   ██╗ █████╗ ██████╗ ███████╗██╗  ██╗
██╔════╝╚██╗ ██╔╝████╗  ██║██╔══██╗██╔══██╗██╔════╝██║  ██║
███████╗ ╚████╔╝ ██╔██╗ ██║███████║██████╔╝█████╗  ███████║
╚════██║  ╚██╔╝  ██║╚██╗██║██╔══██║██╔═══╝ ██╔══╝  ██╔══██║
███████║   ██║   ██║ ╚████║██║  ██║██║     ███████╗██║  ██║
╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝
</pre>
</p>

<h1 align="center">Synapse Framework MAC</h1>

<p align="center">
  A modern Synapse-inspired scripting environment for macOS
</p>

<p align="center">
  React • Tauri • Rust • Monaco • WebSocket Bridge
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#architecture">Architecture</a>
</p>

Native macOS executor framework built with React, Tauri, and Rust.

## Features

* Multiple Synapse UI shells
* Monaco-powered script editor
* WebSocket Bridge (`/ws`)
* Port Bridge (`/port_bridge/*`)
* Cross-session persistence
* Native Apple Silicon and Intel support
* Shared settings across all interfaces
* UI export system for external ports

## Documentation

| Document                      | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `docs/PROJECT_OVERVIEW.md`    | Architecture, routing, IPC, and application structure |
| `docs/WEBSOCKET_BRIDGE.md`    | WebSocket and Port Bridge protocols                   |
| `docs/SOURCE_DISTRIBUTION.md` | Source verification, export, and packaging            |

## Architecture

```text
                    ┌─────────────────┐
                    │   React / Vite  │
                    │    Frontend     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Rust / Tauri   │
                    │     Backend     │
                    └────────┬────────┘
                             │
               ┌─────────────┴─────────────┐
               │                           │
               ▼                           ▼
      ┌─────────────────┐       ┌─────────────────┐
      │ WebSocket Bridge│       │   Port Bridge   │
      │      /ws        │       │ /port_bridge/*  │
      └────────┬────────┘       └────────┬────────┘
               │                         │
               ▼                         ▼
        Roblox Executors         Roblox Executors
```

## Installation

```bash
npm install
```

## Development

```bash
npm run tauri:dev
```

## Production Build

```bash
npm run tauri:build
```

## License

MIT License

```
```
