/**
 * Project tree (left rail).
 * Shows the project's acts/scenes/characters with add/select/delete actions.
 */

import React from 'react';
import { useStore, uid } from '../store';

export function ProjectTree() {
  const project = useStore((s) => s.project);
  const selectedSceneId = useStore((s) => s.selectedSceneId);
  const setSelectedSceneId = useStore((s) => s.setSelectedSceneId);
  const addScene = useStore((s) => s.addScene);
  const removeScene = useStore((s) => s.removeScene);
  const reorderScene = useStore((s) => s.reorderScene);
  const updateProjectTitle = useStore((s) => s.updateProjectTitle);

  const handleAddScene = () => {
    const n = project.scenes.length + 1;
    addScene({
      id: 'scene-' + uid(),
      number: n,
      title: `Scene ${n}`,
      duration: 15,
      prompt: '',
      characterRefs: [],
      architecture: 'minimax_h3_ref2va_pruned',
      status: 'draft',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
          Project title
        </label>
        <input
          className="input-base text-sm font-semibold"
          value={project.title}
          onChange={(e) => updateProjectTitle(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wider text-slate-500">
            Scenes ({project.scenes.length})
          </h3>
          <button className="btn-ghost text-xs" onClick={handleAddScene}>
            + Add scene
          </button>
        </div>
        <ul className="space-y-1">
          {project.scenes.map((s, i) => (
            <li
              key={s.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                selectedSceneId === s.id
                  ? 'bg-cyan-500/20 border border-cyan-500/40'
                  : 'hover:bg-slate-800 border border-transparent'
              }`}
              onClick={() => setSelectedSceneId(s.id)}
            >
              <span className="text-slate-500 text-xs font-mono w-6">
                {String(s.number).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{s.title}</div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>{s.duration}s</span>
                  {s.characterRefs.length > 0 && (
                    <span>· {s.characterRefs.length} chars</span>
                  )}
                  {s.status === 'done' && (
                    <span className="text-emerald-400">· done</span>
                  )}
                  {s.status === 'error' && (
                    <span className="text-rose-400">· error</span>
                  )}
                  {s.status === 'generating' && (
                    <span className="text-cyan-400">· generating…</span>
                  )}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5">
                <button
                  className="text-xs text-slate-500 hover:text-slate-200 px-1"
                  title="Move up"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderScene(s.id, 'up');
                  }}
                >
                  ▲
                </button>
                <button
                  className="text-xs text-slate-500 hover:text-slate-200 px-1"
                  title="Move down"
                  disabled={i === project.scenes.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderScene(s.id, 'down');
                  }}
                >
                  ▼
                </button>
                <button
                  className="text-xs text-rose-500 hover:text-rose-300 px-1"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete scene "${s.title}"?`)) removeScene(s.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
          Cast ({project.characters.length})
        </h3>
        <ul className="space-y-1">
          {project.characters.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: c.color }}
              />
              <span className="text-sm flex-1 truncate">{c.name}</span>
            </li>
          ))}
          {project.characters.length === 0 && (
            <li className="text-xs text-slate-500 italic px-3">
              No characters yet — add one in the Cast panel below.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}