/**
 * Cast panel — add/edit/delete characters and their reference sheets.
 */

import React, { useRef } from 'react';
import { useStore, uid } from '../store';

export function CastPanel() {
  const characters = useStore((s) => s.project.characters);
  const addCharacter = useStore((s) => s.addCharacter);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const removeCharacter = useStore((s) => s.removeCharacter);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleAdd = () => {
    const id = 'char-' + uid();
    addCharacter({
      id,
      name: 'New character',
      description: '',
      color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
    });
  };

  const handleFile = (charId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateCharacter(charId, { referenceSheetUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Cast</h3>
        <button className="btn-ghost text-xs" onClick={handleAdd}>
          + Add character
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {characters.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-slate-800 p-3 space-y-2"
            style={{ borderLeftColor: c.color, borderLeftWidth: 3 }}
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={c.color}
                onChange={(e) =>
                  updateCharacter(c.id, { color: e.target.value })
                }
                className="w-6 h-6 rounded bg-transparent"
              />
              <input
                className="input-base flex-1 text-sm font-semibold"
                value={c.name}
                onChange={(e) => updateCharacter(c.id, { name: e.target.value })}
              />
              <button
                className="text-rose-400 hover:text-rose-200 text-sm px-1"
                onClick={() => {
                  if (confirm(`Delete character "${c.name}"?`)) removeCharacter(c.id);
                }}
              >
                ✕
              </button>
            </div>
            <textarea
              className="input-base text-xs h-20 resize-y"
              placeholder="Canonical description — every detail that must stay consistent. Used verbatim in every prompt."
              value={c.description}
              onChange={(e) => updateCharacter(c.id, { description: e.target.value })}
            />
            {c.referenceSheetUrl ? (
              <div className="relative">
                <img
                  src={c.referenceSheetUrl}
                  alt={`${c.name} reference sheet`}
                  className="w-full rounded border border-slate-800"
                />
                <button
                  className="absolute top-1 right-1 btn-ghost text-xs"
                  onClick={() => fileInputs.current[c.id]?.click()}
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                className="w-full border-2 border-dashed border-slate-700 rounded-lg p-3 text-xs text-slate-500 hover:border-slate-500"
                onClick={() => fileInputs.current[c.id]?.click()}
              >
                + Reference sheet (4-angle, white background)
              </button>
            )}
            <input
              ref={(el) => {
                fileInputs.current[c.id] = el;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(c.id, f);
              }}
            />
          </div>
        ))}
        {characters.length === 0 && (
          <div className="col-span-2 text-center text-slate-500 text-sm italic py-6">
            No characters yet — add one above.
          </div>
        )}
      </div>
    </div>
  );
}