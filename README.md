<p align="center">
  <img src="./assets/paintbrush-apple.png" width="128" alt="Synapse Framework MAC">
</p>

<h1 align="center">Synapse Framework MAC</h1>

<p align="center">
  Advanced Roblox script execution environment for macOS
</p>

<p align="center">
  Monaco Editor • WebSocket Bridge • Multiple Synapse Themes • Native Tauri Desktop Application
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
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Synapse Framework MAC                                     │
│                                                             │
│   Native macOS executor framework built with React,         │
│   Tauri and Rust.                                           │
│                                                             │
│   • Multiple Synapse UI shells                              │
│   • Monaco-powered script editor                            │
│   • WebSocket and Port Bridge support                       │
│   • Cross-game persistence                                  │
│   • Native Apple Silicon and Intel support                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

A modern recreation of the Synapse experience for macOS, combining a native desktop application with multiple classic UI shells, integrated executor bridges, and a customizable scripting environment.

## Features

| Component | Description |
|------------|------------|
| Monaco Editor | High-performance code editor with syntax highlighting and IntelliSense support |
| Synapse Themes | Synapse Blue, Synapse Original 2017, Synapse X, and V3 |
| WebSocket Bridge | Persistent executor communication through `/ws` |
| Port Bridge | HTTP polling bridge for executors without WebSocket support |
| Tauri Backend | Native desktop integration powered by Rust |
| Shared Configuration | Unified settings and bridge management across all shells |
| UI Export System | Portable UI snapshots for external platform ports |
| Source Packaging | Lightweight source distribution and verification tooling |

## Documentation

| Document | Description |
|----------|-------------|
| `docs/PROJECT_OVERVIEW.md` | Architecture, routing, IPC, shell management, and file structure |
| `docs/WEBSOCKET_BRIDGE.md` | WebSocket and Port Bridge protocols, settings, and Lua examples |
| `docs/SOURCE_DISTRIBUTION.md` | Source packaging, verification, export, and distribution |

## Architecture

```text
                    ┌─────────────────┐
                    │   React / Vite  │
                    │      Frontend   │
                    └────────┬────────┘
                             │ invoke
                             ▼
                    ┌─────────────────┐
                    │  Rust / Tauri   │
                    │     Backend     │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
       ┌─────────────────┐      ┌─────────────────┐
       │ WebSocket Bridge│      │   Port Bridge   │
       │      /ws        │      │ /port_bridge/*  │
       └────────┬────────┘      └────────┬────────┘
                │                         │
                ▼                         ▼
       ┌─────────────────┐      ┌─────────────────┐
       │ Lua Executors   │      │ Lua Executors   │
       │ (WebSocket)     │      │   (HTTP Only)   │
       └─────────────────┘      └─────────────────┘
```

## Installation

### Requirements

- Node.js 18+
- Rust Stable Toolchain
- Tauri CLI
- macOS 13+
- Apple Silicon or Intel Mac

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run tauri:dev
```

### Production Build

```bash
npm run tauri:build
```

## Project Structure

```text
src/
├── app/
├── components/
├── pages/
├── themes/
└── main.tsx

src-tauri/
├── src/
├── resources/
└── tauri.conf.json

docs/
├── PROJECT_OVERVIEW.md
├── WEBSOCKET_BRIDGE.md
└── SOURCE_DISTRIBUTION.md
```

## License

MIT License
