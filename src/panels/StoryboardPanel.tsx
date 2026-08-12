/**
 * Storyboard panel — upload or paste a storyboard image for the scene.
 * The storyboard is the FIRST image sent to H3 alongside character refs.
 */

import React, { useRef } from 'react';
import { useStore, type Scene } from '../store';

export function StoryboardPanel({ scene }: { scene: Scene }) {
  const updateScene = useStore((s) => s.updateScene);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateScene(scene.id, { storyboardUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Storyboard (optional)</h3>
        <div className="flex gap-2">
          <button
            className="btn-ghost text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            {scene.storyboardUrl ? 'Replace' : 'Upload'}
          </button>
          {scene.storyboardUrl && (
            <button
              className="btn-ghost text-xs"
              onClick={() => updateScene(scene.id, { storyboardUrl: undefined })}
            >
              Clear
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>
      {scene.storyboardUrl ? (
        <img
          src={scene.storyboardUrl}
          alt="storyboard"
          className="w-full rounded-lg border border-slate-800"
        />
      ) : (
        <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center text-slate-500 text-sm">
          Drop a storyboard image (or generate one with the Cast panel's
          "Generate storyboard" button). The storyboard anchors the
          composition of the generated clip.
        </div>
      )}
    </div>
  );
}