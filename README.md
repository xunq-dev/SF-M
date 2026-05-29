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

Native macOS executor framework built with React, Tauri, and Rust!

## Star History

<a href="https://www.star-history.com/?repos=xunq-dev%2FSF-M&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=xunq-dev/SF-M&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=xunq-dev/SF-M&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=xunq-dev/SF-M&type=date&legend=top-left" />
 </picture>
</a>

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
## Support

If you're a crypto nerd simultaneously while for some reason wanting to donate to me lmao:

### BTC
```text
bc1q78uvy304rmkpvs87t5tml8qmjzklkph77ntrsq
```

### SOL
```text
2Sf1AuNXcUMjj1gkZ2hdkeGSJdziWyAnEwDSW6Wjv3jP
```

### ETH
```text
0x1DF67A2b3661c828a1213E600AfCacC21f1471b8
```

### LTC
```text
LRYyQ3GznGNssbs37SEqX27MJh9HxPEg7h
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
MIT License

Copyright (c) 2026 Synapse Framework MAC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
