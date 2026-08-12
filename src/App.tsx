/**
 * Wan2GP Movie Maker — main App
 *
 * Single-page React UI for orchestrating multi-scene anime episodes
 * with character and story consistency, backed by the wan2gp-mcp server.
 *
 * Layout:
 *   ┌─ Top bar: project name + MCP endpoint status
 *   ├─ Left rail: project tree (acts → scenes → clips)
 *   ├─ Center: editor (story bible / character / scene / storyboard)
 *   └─ Right rail: generation queue + outputs
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from './store';
import { McpClient, type ToolDef } from './mcp-client';
import { StoryBiblePanel } from './panels/StoryBiblePanel';
import { CastPanel } from './panels/CastPanel';
import { ScenePanel } from './panels/ScenePanel';
import { StoryboardPanel } from './panels/StoryboardPanel';
import { QueuePanel } from './panels/QueuePanel';
import { ProjectTree } from './panels/ProjectTree';
import { ExportPanel } from './panels/ExportPanel';

const DEFAULT_ENDPOINT =
  (import.meta.env.VITE_WAN2GP_MCP_URL as string | undefined) ??
  'http://localhost:9100/mcp';

export default function App() {
  const project = useStore((s) => s.project);
  const selectedSceneId = useStore((s) => s.selectedSceneId);
  const mcpEndpoint = useStore((s) => s.mcpEndpoint);
  const setMcpEndpoint = useStore((s) => s.setMcpEndpoint);

  const [client, setClient] = useState<McpClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [tools, setTools] = useState<ToolDef[]>([]);
  const [error, setError] = useState<string | null>(null);

  // connect to MCP on mount + whenever endpoint changes
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setConnected(false);
    setTools([]);
    const c = new McpClient(mcpEndpoint);
    setClient(c);
    c.listTools()
      .then((ts) => {
        if (cancelled) return;
        setTools(ts);
        setConnected(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(`Cannot reach ${mcpEndpoint}: ${e.message}`);
      });
    return () => {
      cancelled = true;
      c.close();
    };
  }, [mcpEndpoint]);

  const scene = useMemo(
    () => project.scenes.find((s) => s.id === selectedSceneId) ?? project.scenes[0],
    [project.scenes, selectedSceneId],
  );

  const handleSelectScene = useCallback((id: string) => {
    useStore.getState().setSelectedSceneId(id);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold neon-text">Wan2GP Movie Maker</h1>
          <span className="text-slate-500 text-sm">/ {project.title || 'Untitled'}</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            className="input-base w-80 text-xs font-mono"
            placeholder="MCP endpoint URL"
            value={mcpEndpoint}
            onChange={(e) => setMcpEndpoint(e.target.value)}
          />
          <span
            className={`chip ${
              connected
                ? 'border-emerald-500 text-emerald-300 bg-emerald-900/30'
                : 'border-rose-500 text-rose-300 bg-rose-900/30'
            }`}
            title={connected ? `Tools: ${tools.length}` : error ?? 'disconnected'}
          >
            {connected ? `● ${tools.length} tools` : '○ offline'}
          </span>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 bg-rose-900/30 border-b border-rose-700 text-rose-200 text-sm">
          {error}
        </div>
      )}

      {/* Main 3-column layout */}
      <main className="flex-1 grid grid-cols-[260px_1fr_360px] gap-4 p-4 overflow-hidden">
        {/* Left rail — project tree */}
        <aside className="panel overflow-y-auto">
          <ProjectTree />
        </aside>

        {/* Center — main editor */}
        <section className="flex flex-col gap-4 overflow-y-auto pr-1">
          {scene ? (
            <>
              <ScenePanel scene={scene} />
              <StoryboardPanel scene={scene} />
            </>
          ) : (
            <div className="panel text-center text-slate-400 py-12">
              No scene selected. Add one from the project tree.
            </div>
          )}
          <CastPanel />
          <StoryBiblePanel />
        </section>

        {/* Right rail — queue + export */}
        <aside className="flex flex-col gap-4 overflow-y-auto pl-1">
          <QueuePanel client={client} disabled={!connected} />
          <ExportPanel client={client} disabled={!connected} />
        </aside>
      </main>
    </div>
  );
}