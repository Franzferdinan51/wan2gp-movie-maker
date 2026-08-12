/**
 * Generation queue panel.
 *
 * - Submit the current scene (or all draft scenes) to the MCP server's
 *   h3_generate tool.
 * - Poll status; surface progress in the UI.
 * - Persist final video path back into the scene.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore, type Scene } from '../store';
import type { McpClient } from '../mcp-client';

interface Props {
  client: McpClient | null;
  disabled: boolean;
}

export function QueuePanel({ client, disabled }: Props) {
  const queue = useStore((s) => s.queue);
  const setQueue = useStore((s) => s.setQueue);
  const scenes = useStore((s) => s.project.scenes);
  const updateScene = useStore((s) => s.updateScene);
  const characters = useStore((s) => s.project.characters);

  const pollRef = useRef<number | null>(null);

  const updateQueueItem = useCallback(
    (jobId: string, patch: Partial<(typeof queue)[number]>) => {
      setQueue(
        queue.map((q) => (q.jobId === jobId ? { ...q, ...patch } : q)),
      );
    },
    [queue, setQueue],
  );

  const submitScene = async (scene: Scene) => {
    if (!client) return;
    if (!scene.prompt.trim()) {
      alert('Scene needs a prompt before generating.');
      return;
    }

    // Build image_paths: character sheets first, then storyboard
    const imagePaths: string[] = [];
    for (const cid of scene.characterRefs) {
      const c = characters.find((x) => x.id === cid);
      if (c?.referenceSheetUrl) imagePaths.push(c.referenceSheetUrl);
    }
    if (scene.storyboardUrl) imagePaths.push(scene.storyboardUrl);

    const arch = scene.architecture ?? 'minimax_h3_ref2va_pruned';

    try {
      const resp: any = await client.callTool('h3_generate', {
        prompt: scene.prompt,
        duration_seconds: scene.duration,
        seed: scene.seed ?? -1,
        sampling_steps: 16,
        height: 480,
        width: 832,
        image_paths: imagePaths.length > 0 ? imagePaths : undefined,
        model_architecture: arch,
      });
      const data = JSON.parse(resp.content[0].text).data;
      const jobId = data.job_id;
      updateScene(scene.id, {
        status: 'queued',
        jobId,
        error: undefined,
      });
      setQueue([
        ...queue,
        {
          jobId,
          sceneId: scene.id,
          sceneTitle: scene.title,
          startedAt: Date.now(),
          status: 'queued',
        },
      ]);
    } catch (e) {
      updateScene(scene.id, { status: 'error', error: String(e) });
    }
  };

  const submitAll = async () => {
    for (const s of scenes.filter((x) => x.status !== 'done')) {
      await submitScene(s);
    }
  };

  const cancelJob = async (jobId: string) => {
    if (!client) return;
    try {
      await client.callTool('h3_cancel_job', { job_id: jobId });
      updateQueueItem(jobId, { status: 'cancelled' });
    } catch (e) {
      console.warn('cancel failed', e);
    }
  };

  // Poll active jobs every 5s
  useEffect(() => {
    if (!client) return;
    const tick = async () => {
      const active = queue.filter(
        (q) => q.status === 'queued' || q.status === 'generating',
      );
      for (const item of active) {
        try {
          const r: any = await client.callTool('h3_job_status', { job_id: item.jobId });
          const d = JSON.parse(r.content[0].text).data;
          if (d.status === 'done') {
            const out: any = await client.callTool('h3_get_output', {
              job_id: item.jobId,
            });
            const od = JSON.parse(out.content[0].text).data;
            updateQueueItem(item.jobId, {
              status: 'done',
              step: d.step,
              totalSteps: d.total_steps,
              elapsedSec: d.elapsed_seconds,
              videoPath: od.video_path,
              muxedPath: od.muxed_path,
            });
            updateScene(item.sceneId, {
              status: 'done',
              videoPath: od.video_path,
              muxedPath: od.muxed_path,
            });
          } else if (d.status === 'error' || d.status === 'cancelled') {
            updateQueueItem(item.jobId, {
              status: d.status,
              step: d.step,
              totalSteps: d.total_steps,
              error: d.error,
            });
            updateScene(item.sceneId, {
              status: d.status,
              error: d.error,
            });
          } else {
            updateQueueItem(item.jobId, {
              status: d.status === 'loading' ? 'queued' : 'generating',
              step: d.step,
              totalSteps: d.total_steps,
              elapsedSec: d.elapsed_seconds,
            });
            updateScene(item.sceneId, { status: d.status });
          }
        } catch (e) {
          console.warn('poll error', item.jobId, e);
        }
      }
    };
    pollRef.current = window.setInterval(tick, 5000);
    tick();
    return () => {
      if (pollRef.current !== null) clearInterval(pollRef.current);
    };
  }, [client, queue, updateQueueItem, updateScene]);

  const selectedScene = scenes.find((s) => s.id === useStore.getState().selectedSceneId);

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Generation queue</h3>
        <button
          className="btn-primary text-xs"
          disabled={disabled || !selectedScene}
          onClick={() => selectedScene && submitScene(selectedScene)}
        >
          Generate current
        </button>
      </div>
      <button
        className="w-full btn-ghost text-xs mb-3"
        disabled={disabled || scenes.length === 0}
        onClick={submitAll}
      >
        Generate all unfinished scenes
      </button>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {queue.length === 0 && (
          <div className="text-xs text-slate-500 italic">
            Queue empty. Hit "Generate current" to start.
          </div>
        )}
        {queue
          .slice()
          .reverse()
          .map((q) => (
            <div
              key={q.jobId}
              className="border border-slate-800 rounded-lg p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate flex-1 font-semibold">
                  {q.sceneTitle}
                </span>
                <span
                  className={`chip ${
                    q.status === 'done'
                      ? 'border-emerald-400 text-emerald-300'
                      : q.status === 'error'
                      ? 'border-rose-400 text-rose-300'
                      : q.status === 'generating'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-slate-600 text-slate-300'
                  }`}
                >
                  {q.status}
                </span>
              </div>
              {(q.status === 'generating' || q.status === 'queued') && (
                <>
                  <div className="text-slate-500 mt-1">
                    step {q.step ?? 0}/{q.totalSteps ?? 16} ·{' '}
                    {Math.round(q.elapsedSec ?? 0)}s
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1 mt-1">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-magenta-400 h-1 rounded-full"
                      style={{
                        width: `${((q.step ?? 0) / (q.totalSteps ?? 16)) * 100}%`,
                      }}
                    />
                  </div>
                  <button
                    className="mt-1 text-rose-400 hover:text-rose-200 text-xs"
                    onClick={() => cancelJob(q.jobId)}
                  >
                    cancel
                  </button>
                </>
              )}
              {q.status === 'done' && q.muxedPath && (
                <div className="text-emerald-300 mt-1 font-mono truncate">
                  ✓ {q.muxedPath}
                </div>
              )}
              {q.status === 'error' && (
                <div className="text-rose-300 mt-1 font-mono truncate">
                  {q.error ?? 'unknown error'}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}