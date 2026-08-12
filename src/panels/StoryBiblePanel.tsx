/**
 * Story bible panel — title, logline, setting, plot arcs, visual + audio style.
 */

import React from 'react';
import { useStore } from '../store';

export function StoryBiblePanel() {
  const bible = useStore((s) => s.project.bible);
  const updateBible = useStore((s) => s.updateBible);

  return (
    <div className="panel">
      <h3 className="text-sm font-semibold mb-3">Story bible</h3>
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
              Plot arcs
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