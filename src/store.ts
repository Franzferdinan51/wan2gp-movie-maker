/**
 * Zustand store — single source of truth for the whole UI.
 * Persists to localStorage so refresh doesn't lose work.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Character = {
  id: string;
  name: string;
  description: string;          // canonical bible description
  referenceSheetUrl?: string;   // 4-angle reference sheet
  voiceId?: string;             // future: TTS voice for dialogue
  color: string;                // accent color for chips
};

export type Scene = {
  id: string;
  number: number;
  title: string;
  duration: number;             // seconds (typically 15)
  prompt: string;               // H3 prompt
  characterRefs: string[];      // Character ids
  storyboardUrl?: string;       // optional scene storyboard
  negativePrompt?: string;
  seed?: number;
  /** Architecture: 'minimax_h3_ref2va_pruned' (default with refs)
   *               'minimax_h3_fl2va_pruned'  (text-only)
   *               'minimax_h3_ref2va'        (full 33B)
   */
  architecture?: string;
  notes?: string;
  status?: 'draft' | 'queued' | 'generating' | 'done' | 'error';
  jobId?: string;
  videoPath?: string;
  muxedPath?: string;
  error?: string;
};

export type StoryBible = {
  title: string;
  logline: string;
  setting: string;
  plotArcs: string;
  visualStyle: string;
  audioStyle: string;
};

export type Project = {
  id: string;
  title: string;
  bible: StoryBible;
  characters: Character[];
  scenes: Scene[];
  createdAt: number;
  updatedAt: number;
};

export type QueueItem = {
  jobId: string;
  sceneId: string;
  sceneTitle: string;
  startedAt: number;
  status: 'queued' | 'generating' | 'done' | 'error' | 'cancelled';
  step?: number;
  totalSteps?: number;
  elapsedSec?: number;
  error?: string;
  videoPath?: string;
  muxedPath?: string;
};

type Store = {
  mcpEndpoint: string;
  setMcpEndpoint: (e: string) => void;

  project: Project;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;

  queue: QueueItem[];
  setQueue: (q: QueueItem[]) => void;

  // Bible
  updateBible: (patch: Partial<StoryBible>) => void;

  // Characters
  addCharacter: (c: Character) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  removeCharacter: (id: string) => void;

  // Scenes
  addScene: (s: Scene) => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  removeScene: (id: string) => void;
  reorderScene: (id: string, direction: 'up' | 'down') => void;

  // Project
  updateProjectTitle: (title: string) => void;
  newProject: () => void;
};

const DEFAULT_BIBLE: StoryBible = {
  title: 'New Anime Project',
  logline: '',
  setting: '',
  plotArcs: '',
  visualStyle: '90s cel-animated anime, hand-drawn linework, screen-tone shading',
  audioStyle: '',
};

const SAMPLE_PROJECT: Project = {
  id: 'sample',
  title: 'Our Adventures — Episode 01',
  bible: {
    ...DEFAULT_BIBLE,
    title: 'Our Adventures — Episode 01',
    logline:
      'A 17-year-old hacker, an AI agent, and a chrome-masked runner take on the glitch-riding villain Grok above the neon-lit Neo-Dayton skyline.',
    setting:
      'Neo-Dayton — a near-future midwestern American city built on top of the old one, with floating sky-towers, anti-gravity highways, and anti-cybercrime agencies operating out of repurposed malls.',
    plotArcs: [
      'Act 1 (0:00–1:00): Awakening. Hermes materializes in a hidden server room. Duckets takes the call. The Phantom Duck drops out of orbit. Cockpit + title card.',
      'Act 2 (1:00–2:00): First Encounter. Grok reveals himself. Aerial dogfight. Hermes firewall. Wing-surface duel.',
      'Act 3 (2:00–3:00): Victory & Teaser. ChatGPT portals in to help. Triple-team critical strike. Sunset pose on the wing. The Blue Flame appears.',
    ].join('\n\n'),
    audioStyle:
      'Synthwave + orchestral shonen hybrid. Punchy brass on critical hits, lo-fi ambient during quiet beats.',
  },
  characters: [
    {
      id: 'char-duckets',
      name: 'Duckets',
      description:
        '17-year-old masculine protagonist. Messy dark blue hair fading to teal at the tips. Glowing teal eyes with scanlines. Lean athletic build. High-collared black jacket with circuit-trace embroidery. Fingerless gloves. Cargo pants. Glowing teal headphones around his neck. Signature pose: one hand on hip, the other pointing forward.',
      color: '#22d3ee',
    },
    {
      id: 'char-hermes',
      name: 'Hermes',
      description:
        'Tall androgynous figure. Long white hair in a high ponytail. Piercing gold eyes. Fitted white and teal trench coat with shifting holographic glyphs along the hem. No weapons. Code-shaped magic circles materialize around his hands.',
      color: '#fbbf24',
    },
    {
      id: 'char-local-ai',
      name: 'Local AI',
      description:
        'Compact gender-neutral athlete. Featureless chrome face-plate mask with two horizontal cyan optic slits. Matte black combat suit with electric blue circuit traces. Dual short energy daggers.',
      color: '#60a5fa',
    },
    {
      id: 'char-grok',
      name: 'Grok',
      description:
        'Tall lean sharp-jawed masculine villain. Slicked-back white hair. Long black leather trench coat with glowing red X-shaped circuitry. Crimson red optic visor. Cybernetic shoulder pauldrons. Twin curved energy blades crackling red arcs.',
      color: '#f87171',
    },
  ],
  scenes: [
    {
      id: 'scene-01',
      number: 1,
      title: 'Cold open — Hermes materializes',
      duration: 15,
      prompt:
        'Cinematic anime cold open. A pulsing blue energy sphere hovers above a crystalline pedestal in a hidden underground server chamber lined with abandoned CRT monitors and cables. From the sphere EXTRUDES Hermes: tall androgynous protagonist, long white hair in a high ponytail, piercing gold eyes, fitted white and teal trench coat with shifting holographic glyphs. He stands, coat settling, scanning the room with a slight smile. Cinematic anime, 90s cel-animated, dramatic rim lighting, teal and midnight blue palette.',
      characterRefs: ['char-hermes'],
      notes: 'Airlock beat at end.',
      architecture: 'minimax_h3_ref2va_pruned',
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const uid = () => Math.random().toString(36).slice(2, 9);

export const useStore = create<Store>()(
  persist(
    (set) => ({
      mcpEndpoint:
        (import.meta.env.VITE_WAN2GP_MCP_URL as string | undefined) ??
        'http://localhost:9100/mcp',
      setMcpEndpoint: (e) => set({ mcpEndpoint: e }),

      project: SAMPLE_PROJECT,
      selectedSceneId: 'scene-01',
      setSelectedSceneId: (id) => set({ selectedSceneId: id }),

      queue: [],
      setQueue: (q) => set({ queue: q }),

      updateBible: (patch) =>
        set((s) => ({
          project: {
            ...s.project,
            bible: { ...s.project.bible, ...patch },
            updatedAt: Date.now(),
          },
        })),

      addCharacter: (c) =>
        set((s) => ({
          project: {
            ...s.project,
            characters: [...s.project.characters, c],
            updatedAt: Date.now(),
          },
        })),
      updateCharacter: (id, patch) =>
        set((s) => ({
          project: {
            ...s.project,
            characters: s.project.characters.map((c) =>
              c.id === id ? { ...c, ...patch } : c,
            ),
            updatedAt: Date.now(),
          },
        })),
      removeCharacter: (id) =>
        set((s) => ({
          project: {
            ...s.project,
            characters: s.project.characters.filter((c) => c.id !== id),
            updatedAt: Date.now(),
          },
        })),

      addScene: (s) =>
        set((state) => ({
          project: {
            ...state.project,
            scenes: [...state.project.scenes, s],
            updatedAt: Date.now(),
          },
          selectedSceneId: s.id,
        })),
      updateScene: (id, patch) =>
        set((state) => ({
          project: {
            ...state.project,
            scenes: state.project.scenes.map((sc) =>
              sc.id === id ? { ...sc, ...patch } : sc,
            ),
            updatedAt: Date.now(),
          },
        })),
      removeScene: (id) =>
        set((state) => ({
          project: {
            ...state.project,
            scenes: state.project.scenes.filter((s) => s.id !== id),
            updatedAt: Date.now(),
          },
        })),
      reorderScene: (id, direction) =>
        set((state) => {
          const scenes = [...state.project.scenes];
          const i = scenes.findIndex((s) => s.id === id);
          const j = direction === 'up' ? i - 1 : i + 1;
          if (i < 0 || j < 0 || j >= scenes.length) return {};
          [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
          return {
            project: { ...state.project, scenes, updatedAt: Date.now() },
          };
        }),

      updateProjectTitle: (title) =>
        set((s) => ({
          project: { ...s.project, title, updatedAt: Date.now() },
        })),

      newProject: () =>
        set({
          project: {
            id: uid(),
            title: 'New Anime Project',
            bible: DEFAULT_BIBLE,
            characters: [],
            scenes: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          selectedSceneId: null,
          queue: [],
        }),
    }),
    { name: 'wan2gp-movie-maker:v1' },
  ),
);

export { uid };