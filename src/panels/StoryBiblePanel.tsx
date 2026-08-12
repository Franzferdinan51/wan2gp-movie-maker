/**
 * Story bible panel — title, logline, setting, plot arcs, visual + audio style.
 * Plus style presets so a new project starts somewhere sensible for any genre.
 */

import React from 'react';
import { useStore, STYLE_PRESETS, type StylePreset } from '../store';

export function StoryBiblePanel() {
  const bible = useStore((s) => s.project.bible);
  const updateBible = useStore((s) => s.updateBible);

  const applyPreset = (p: StylePreset) => {
    updateBible({
      visualStyle: p.visualStyle,
      audioStyle: p.audioStyle,
    });
  };

  return (
    <div className="panel">
      <h3 className="text-sm font-semibold mb-3">Story bible</h3>

      <div className="mb-3">
        <label className="block text-xs uppercase text-slate-500 mb-2">
          Style preset
        </label>
        <div className="grid grid-cols-5 gap-2">
          {STYLE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-2 py-2 rounded-lg border border-slate-700 hover:border-cyan-400
                         text-left text-xs transition hover:bg-slate-800"
              title={p.description}
            >
              <div className="font-semibold text-slate-100 truncate">{p.label}</div>
              <div className="text-slate-500 truncate text-[10px] mt-0.5">
                {p.characterFlavor}
              </div>
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-2 italic">
          Click a preset to apply its visual + audio style. Then customize the
          fields below.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs uppercase text-slate-500 mb-1">
            Logline
          </label>
          <input
            className="input-base"
            placeholder="One-sentence pitch."
            value={bible.logline}
            onChange={(e) => updateBible({ logline: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase text-slate-500 mb-1">
              Setting
            </label>
            <textarea
              className="input-base text-sm h-20 resize-y"
              value={bible.setting}
              onChange={(e) => updateBible({ setting: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-slate-500 mb-1">
              Plot arcs / beats
            </label>
            <textarea
              className="input-base text-sm h-20 resize-y"
              value={bible.plotArcs}
              onChange={(e) => updateBible({ plotArcs: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase text-slate-500 mb-1">
              Visual style
            </label>
            <textarea
              className="input-base text-sm h-16 resize-y"
              value={bible.visualStyle}
              onChange={(e) => updateBible({ visualStyle: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-slate-500 mb-1">
              Audio style
            </label>
            <textarea
              className="input-base text-sm h-16 resize-y"
              value={bible.audioStyle}
              onChange={(e) => updateBible({ audioStyle: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}