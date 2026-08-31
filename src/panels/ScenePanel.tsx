/**
 * Scene editor — title, duration, prompt, character refs, architecture.
 * Renders the finished video inline once a muxedPath is available.
 */

import React, { useEffect, useState } from 'react';
import { useStore, type Scene } from '../store';
import { McpClient, h3GetVideo, type H3GetVideoResult } from '../mcp-client';

const ARCHITECTURES = [
  { value: 'minimax_h3_ref2va_pruned', label: 'H3 Ref2VA — Pruned 20B (recommended)' },
  { value: 'minimax_h3_ref2va', label: 'H3 Ref2VA — Full 33B' },
  { value: 'minimax_h3_fl2va_pruned', label: 'H3 FL2VA — Pruned (text-only)' },
];

export function ScenePanel({ scene, client }: { scene: Scene; client: McpClient | null }) {
  const updateScene = useStore((s) => s.updateScene);
  const characters = useStore((s) => s.project.characters);
  const [video, setVideo] = useState<H3GetVideoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a scene finishes, fetch the rendered video via h3_get_video and
  // keep the base64 around for inline <video> playback. The base64 can be
  // megabytes; that's why we only fetch on demand and reset when the path
  // changes. Refresh on demand via the "Reload preview" button.
  useEffect(() => {
    setVideo(null);
    setError(null);
    if (!scene.muxedPath || !client) return;
    let cancelled = false;
    setLoading(true);
    h3GetVideo(client, scene.muxedPath)
      .then((v) => {
        if (cancelled) return;
        setVideo(v);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scene.muxedPath, client]);

  const toggleCharacter = (id: string) => {
    const has = scene.characterRefs.includes(id);
    updateScene(scene.id, {
      characterRefs: has
        ? scene.characterRefs.filter((c) => c !== id)
        : [...scene.characterRefs, id],
    });
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold neon-text">Scene {scene.number}</h2>
        <span className="chip">
          {scene.status ?? 'draft'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs uppercase text-slate-500 mb-1">Title</label>
          <input
            className="input-base"
            value={scene.title}
            onChange={(e) => updateScene(scene.id, { title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs uppercase text-slate-500 mb-1">
            Duration (sec)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            className="input-base"
            value={scene.duration}
            onChange={(e) =>
              updateScene(scene.id, { duration: parseInt(e.target.value) || 15 })
            }
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs uppercase text-slate-500 mb-1">
          H3 prompt
        </label>
        <textarea
          className="input-base font-mono text-xs h-32 resize-y"
          placeholder="Describe the scene in detail. Include camera moves, audio cues, action beats, and any visual reference."
          value={scene.prompt}
          onChange={(e) => updateScene(scene.id, { prompt: e.target.value })}
        />
        <div className="text-xs text-slate-500 mt-1">
          {scene.prompt.length} chars · H3 miniMax works best with 200–500 char
          prompts. Spell out camera moves and audio cues inline.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs uppercase text-slate-500 mb-1">
            Architecture
          </label>
          <select
            className="input-base"
            value={scene.architecture ?? 'minimax_h3_ref2va_pruned'}
            onChange={(e) => updateScene(scene.id, { architecture: e.target.value })}
          >
            {ARCHITECTURES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase text-slate-500 mb-1">
            Seed (-1 for random)
          </label>
          <input
            type="number"
            className="input-base"
            value={scene.seed ?? -1}
            onChange={(e) =>
              updateScene(scene.id, { seed: parseInt(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs uppercase text-slate-500 mb-2">
          Character references ({scene.characterRefs.length})
        </label>
        <div className="flex flex-wrap gap-2">
          {characters.map((c) => {
            const active = scene.characterRefs.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  active
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-100'
                    : 'border-slate-700 hover:border-slate-500 text-slate-300'
                }`}
                onClick={() => toggleCharacter(c.id)}
                style={active ? { borderColor: c.color, color: c.color } : {}}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                  style={{ background: c.color }}
                />
                {c.name}
              </button>
            );
          })}
          {characters.length === 0 && (
            <span className="text-xs text-slate-500 italic">
              No characters yet — add some in the Cast panel.
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Ref2VA uses these as <code className="bg-slate-800 px-1 rounded">image_refs</code>{' '}
          (guidance throughout). FL2VA uses the first as the opening frame only.
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase text-slate-500 mb-1">
          Director notes
        </label>
        <input
          className="input-base text-sm"
          placeholder="Airlock beats, mood notes, references — anything for the next pass."
          value={scene.notes ?? ''}
          onChange={(e) => updateScene(scene.id, { notes: e.target.value })}
        />
      </div>

      {scene.muxedPath && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-emerald-300 font-mono">
              ✓ rendered: {scene.muxedPath}
            </span>
            <button
              type="button"
              className="chip text-xs hover:border-cyan-400"
              disabled={!client || loading}
              onClick={() => {
                if (!client || !scene.muxedPath) return;
                setLoading(true);
                setError(null);
                h3GetVideo(client, scene.muxedPath)
                  .then((v) => setVideo(v))
                  .catch((e) => setError(e?.message ?? String(e)))
                  .finally(() => setLoading(false));
              }}
            >
              {loading ? 'loading…' : 'Reload preview'}
            </button>
          </div>
          {error && (
            <div className="text-xs text-rose-300 font-mono mb-2">
              preview error: {error}
            </div>
          )}
          {video && (
            <video
              key={scene.muxedPath}
              controls
              loop
              muted
              className="w-full rounded border border-slate-800 bg-black"
              src={`data:${video.content?.[0]?.mimeType ?? 'video/mp4'};base64,${video.base64 ?? video.content?.[0]?.data ?? ''}`}
            />
          )}
          {!video && !loading && !error && (
            <div className="text-xs text-slate-500 italic">No preview loaded.</div>
          )}
        </div>
      )}
      {scene.error && (
        <div className="mt-3 text-xs text-rose-300 font-mono">{scene.error}</div>
      )}
    </div>
  );
}