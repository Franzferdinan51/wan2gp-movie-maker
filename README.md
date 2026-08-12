# wan2gp-movie-maker

WebUI for building multi-scene anime TV episodes and movies with character and
story consistency, powered by MiniMax H3 (FL2VA + Ref2VA) via the
[wan2gp-mcp](https://github.com/Franzferdinan51/wan2gp-mcp) server.

## What it does

* Define a **story bible** (project title, logline, setting, plot arcs)
* Lock a **cast** with multi-angle character reference sheets
* Build a **scene-by-scene script** with prompt per shot
* Submit each scene as an H3 generation, using Ref2VA mode so characters
  stay consistent across the whole episode
* Concat the resulting clips into a single deliverable, with auto-recompress
  for Telegram / Discord / web delivery

## Architecture

```
┌─────────────────────┐    Streamable HTTP/MCP    ┌──────────────────┐
│  Movie Maker WebUI  │  ──────────────────────▶ │  wan2gp-mcp      │
│  (React + Vite)     │  ◀──────────────────────  │  (H3 + Wan2GP)   │
└─────────────────────┘                            └──────────────────┘
```

* **Frontend**: React + Vite + TailwindCSS, dark neon-anime aesthetic.
* **Backend**: your local wan2gp-mcp server. This repo **does not** include
  the model — install [wan2gp-mcp](https://github.com/Franzferdinan51/wan2gp-mcp)
  separately and point the WebUI at its Streamable HTTP endpoint.

## Privacy

This repo is fully public. **No secrets live in this codebase.** All
backend credentials, model paths, and chat IDs are configured at runtime
through a `.env` file (see `.env.example`). The shipped code never sees
API keys, Telegram tokens, or model weights.

## Quick start

```bash
git clone https://github.com/Franzferdinan51/wan2gp-movie-maker
cd wan2gp-movie-maker
cp .env.example .env
# edit .env to point at your wan2gp-mcp endpoint
npm install
npm run dev
```

Open http://localhost:5173, point it at your MCP endpoint, and start
building.

## License

MIT — fork freely, attribute back to Franzferdinan51 / Duckets.
