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
  title: 'New Project',
  logline: '',
  setting: '',
  plotArcs: '',
  visualStyle: '',
  audioStyle: '',
};

/**
 * Style presets — preset visual / audio / character flavor so a new
 * project starts somewhere sensible without locking the user into
 * anime. Pick a preset from the UI, then customize from there.
 */
export type StylePreset = {
  id: string;
  label: string;
  description: string;
  visualStyle: string;
  audioStyle: string;
  characterFlavor: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'anime',
    label: '90s Anime',
    description: 'Cel-animated, hand-drawn linework, screen-tone shading, dramatic speed lines.',
    visualStyle: '90s cel-animated anime, hand-drawn linework, screen-tone shading, dramatic speed lines',
    audioStyle: 'Synthwave + orchestral shonen hybrid',
    characterFlavor: 'Bold colors, expressive eyes, signature poses',
  },
  {
    id: 'realistic-cinematic',
    label: 'Cinematic Realism',
    description: 'Live-action cinematic look, natural lighting, shallow depth of field, anamorphic flares.',
    visualStyle: 'Cinematic live-action, natural lighting, shallow depth of field, anamorphic lens flares, film grain',
    audioStyle: 'Orchestral score with room tone, location ambience',
    characterFlavor: 'Real human features, natural skin, subtle micro-expressions',
  },
  {
    id: 'studio-ghibli',
    label: 'Painterly Fantasy',
    description: 'Hand-painted backgrounds, soft watercolor palette, gentle character animation.',
    visualStyle: 'Hand-painted watercolor backgrounds, soft palette, gentle character animation, storybook lighting',
    audioStyle: 'Orchestral with acoustic instruments, gentle woodwinds',
    characterFlavor: 'Soft features, expressive eyes, simple iconic outfits',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk Noir',
    description: 'Neon-drenched streets, rain, high-contrast lighting, chrome and chrome and chrome.',
    visualStyle: 'Neon-drenched cyberpunk, rain-slick streets, high-contrast noir lighting, volumetric fog',
    audioStyle: 'Synth-heavy score, rain ambience, distant city hum',
    characterFlavor: 'Cybernetic implants, leather + chrome, moody color palette',
  },
  {
    id: 'documentary',
    label: 'Documentary',
    description: 'Hand-held camera feel, natural light, real-world locations, talking-head framing.',
    visualStyle: 'Documentary cinematography, hand-held or steadicam, natural light, real locations',
    audioStyle: 'Natural ambience, diegetic sound, interview mic clarity',
    characterFlavor: 'Real people, period-accurate clothing, expressive hands',
  },
  {
    id: 'commercial',
    label: 'Commercial / Brand',
    description: 'Polished product shots, clean studio lighting, slow-motion hero moments.',
    visualStyle: 'Polished commercial photography, clean studio lighting, slow motion hero shots, color-graded',
    audioStyle: 'Modern pop score with uplifting builds, branded sting at the end',
    characterFlavor: 'Aspirational talent, on-brand wardrobe, expressive but restrained',
  },
  {
    id: 'horror',
    label: 'Horror',
    description: 'Cold lighting, deep shadows, desaturated palette, asymmetric framing.',
    visualStyle: 'Cold desaturated palette, deep shadows, off-kilter framing, low-key lighting',
    audioStyle: 'Drones, sparse strings, sharp stingers on reveals',
    characterFlavor: 'Flinch reactions, breath visible, clothing damp or torn',
  },
  {
    id: 'scifi',
    label: 'Sci-Fi / Hard Tech',
    description: 'Hard-surface mechs, transparent HUDs, volumetric space lighting, design-forward.',
    visualStyle: 'Hard-surface sci-fi, transparent HUD overlays, volumetric space lighting, design-forward',
    audioStyle: 'Hybrid orchestral + electronic, mechanical whirs, deep sub',
    characterFlavor: 'Tech-integrated outfits, utilitarian, weathered details',
  },
  {
    id: 'music-video',
    label: 'Music Video',
    description: 'Stylized color grade, beat-locked cuts, expression-heavy close-ups.',
    visualStyle: 'Stylized color grade, beat-locked editing cues, expression-heavy close-ups',
    audioStyle: 'Per-track — leave tempo / mood notes here',
    characterFlavor: 'Wardrobe switches between setups, exaggerated gesture',
  },
  {
    id: 'kids',
    label: 'Kids / Family',
    description: 'Bright primary palette, soft rounded shapes, friendly character proportions.',
    visualStyle: 'Bright primary palette, soft rounded shapes, friendly proportions, minimal grit',
    audioStyle: 'Light orchestral, percussion, character voices',
    characterFlavor: 'Big eyes, friendly faces, bold simple outfits',
  },
];

const SAMPLE_PROJECT: Project = {
  id: 'sample',
  title: 'Sample Project — try the presets',
  bible: {
    title: 'Sample Project — try the presets',
    logline: 'Pick a style preset from the Story Bible panel to start. ' +
             'Then lock your cast and write the first scene.',
    setting: 'Whatever world you want to build.',
    plotArcs: '',
    visualStyle: 'No style preset selected yet — pick one in the Story Bible panel.',
    audioStyle: '',
  },
  characters: [],
  scenes: [],
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
            title: 'New Project',
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