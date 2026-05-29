```md
<p align="center">
  <img src="logo%20presets/unreleased-sx3.png" width="128" alt="Synapse Framework MAC">
</p>

<h1 align="center">Synapse Framework MAC</h1>

<p align="center">
  Advanced Roblox Script Execution Environment for macOS
</p>

<p align="center">
  Monaco Editor • WebSocket Bridge • Multiple Synapse Interfaces • Native Tauri Application
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#building">Building</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#documentation">Documentation</a>
</p>

---

```text
   ███████╗██╗   ██╗███╗   ██╗ █████╗ ██████╗ ███████╗███████╗
   ██╔════╝╚██╗ ██╔╝████╗  ██║██╔══██╗██╔══██╗██╔════╝██╔════╝
   ███████╗ ╚████╔╝ ██╔██╗ ██║███████║██████╔╝███████╗█████╗
   ╚════██║  ╚██╔╝  ██║╚██╗██║██╔══██║██╔═══╝ ╚════██║██╔══╝
   ███████║   ██║   ██║ ╚████║██║  ██║██║     ███████║███████╗
   ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚══════╝╚══════╝

                Framework MAC
```

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
