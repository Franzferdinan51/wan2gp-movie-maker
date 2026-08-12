/**
 * Export panel — concat all done scenes into one MP4.
 *
 * Currently this just renders the list of rendered scenes; the actual
 * concat happens in the MCP server's h3_generate? no — concat is not a
 * tool yet. For now, show the list and let the user use ffmpeg locally
 * (or wire up a custom MCP tool).
 */

import React, { useState } from 'react';
import { useStore } from '../store';

export function ExportPanel({ disabled }: { client: any; disabled: boolean }) {
  const scenes = useStore((s) => s.project.scenes);
  const [concatOutput, setConcatOutput] = useState<string | null>(null);

  const doneScenes = scenes.filter((s) => s.status === 'done' && s.muxedPath);

  const buildConcatList = () => {
    if (doneScenes.length === 0) return null;
    const lines = doneScenes
      .map((s, i) => {
        const path = s.muxedPath!.replace(/\\/g, '/');
        return `file '${path}'`;
      })
      .join('\n');
    return lines;
  };

  const handleConcat = () => {
    const list = buildConcatList();
    if (!list) {
      alert('No finished scenes yet.');
      return;
    }
    setConcatOutput(list);
    navigator.clipboard.writeText(list).catch(() => {});
    alert(
      `Concat list copied to clipboard (${doneScenes.length} scenes).\n\n` +
        `Run this in your shell to build the final MP4:\n\n` +
        `# 1. save the list:\n` +
        `cat > concat.txt << 'EOF'\n${list}\nEOF\n\n` +
        `# 2. ffmpeg concat:\n` +
        `ffmpeg -y -f concat -safe 0 -i concat.txt -c copy episode.mp4`,
    );
  };

  return (
    <div className="panel">
      <h3 className="text-sm font-semibold mb-2">Export</h3>
      <div className="text-xs text-slate-400 mb-2">
        {doneScenes.length} / {scenes.length} scenes finished.
      </div>
      <button
        className="btn-primary w-full text-xs"
        disabled={disabled || doneScenes.length === 0}
        onClick={handleConcat}
      >
        Build concat list
      </button>
      {concatOutput && (
        <pre className="text-xs font-mono text-slate-400 bg-slate-950/60 p-2 rounded mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
          {concatOutput}
        </pre>
      )}
      <div className="text-xs text-slate-500 mt-2 italic">
        Concat happens via ffmpeg on the MCP server host. Future: an
        h3_concat tool on the server will return the final MP4 directly.
      </div>
    </div>
  );
}