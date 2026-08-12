# wan2gp-movie-maker

WebUI for directing multi-scene videos — TV episodes, films, short films,
ads, music videos, anime, documentaries, anything that needs consistent
characters across shots. Powered by MiniMax H3 (FL2VA + Ref2VA) via the
[wan2gp-mcp](https://github.com/Franzferdinan51/wan2gp-mcp) server.

## What it does

* Define a **story bible** (project title, logline, setting, plot arcs)
* Lock a **cast** with multi-angle character reference sheets
* Build a **scene-by-scene script** with a prompt per shot
* Submit each scene as an H3 generation, using Ref2VA mode so characters
  and visual style stay consistent across the whole piece
* Concat the resulting clips into a single deliverable, with auto-recompress
  for Telegram / Discord / web delivery

## Use cases

* **Anime episodes** — multi-episode series with recurring characters
* **Short films** — narrative shorts, music videos, lyric videos
* **Commercials / ads** — brand-consistent spots with the same talent
  across cuts
* **Documentaries** — historical recreations with consistent re-enactment
  characters
* **Game cinematics** — pre-vis for cutscenes and trailers
* **Educational explainers** — talking-head hosts that stay the same
  scene to scene
* **Audio dramas** — visual bookends or scene paintings to accompany
  the spoken track
* **Music videos** — performance + narrative shots that match the song's
  arc

## Architecture

```
┌─────────────────────┐    Streamable HTTP/MCP    ┌──────────────────┐
│  Movie Maker WebUI  │  ──────────────────────▶ │  wan2gp-mcp      │
│  (React + Vite)     │  ◀──────────────────────  │  (H3 + Wan2GP)   │
└─────────────────────┘                            └──────────────────┘
```

* **Frontend**: React + Vite + TailwindCSS, dark neon aesthetic.
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
directing.

## License

MIT — fork freely, attribute back to Franzferdinan51 / Duckets.
