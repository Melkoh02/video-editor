import { create } from "zustand";
import type { Project, Clip } from "../types";
import { nanoid } from "../utils/nanoid";

type PlayerState = "idle" | "playing" | "paused";

type AppState = {
  project: Project;
  playerState: PlayerState;
  currentTime: number; // seconds
  selectedClipId: string | null;

  // Project actions
  setResolution: (width: number, height: number) => void;
  setFps: (fps: number) => void;

  // Track actions
  addTrack: (type: "video" | "audio") => void;
  removeTrack: (trackId: string) => void;

  // Clip actions
  addClip: (trackId: string, clip: Omit<Clip, "id">) => void;
  updateClip: (trackId: string, clipId: string, patch: Partial<Clip>) => void;
  removeClip: (trackId: string, clipId: string) => void;
  selectClip: (clipId: string | null) => void;

  // Playback actions
  setCurrentTime: (t: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
};

const defaultProject: Project = {
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  tracks: [],
};

export const useAppStore = create<AppState>((set) => ({
  project: defaultProject,
  playerState: "idle",
  currentTime: 0,
  selectedClipId: null,

  setResolution: (width, height) =>
    set((s) => ({ project: { ...s.project, resolution: { width, height } } })),

  setFps: (fps) =>
    set((s) => ({ project: { ...s.project, fps } })),

  addTrack: (type) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: [...s.project.tracks, { id: nanoid(), type, clips: [] }],
      },
    })),

  removeTrack: (trackId) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.filter((t) => t.id !== trackId),
      },
    })),

  addClip: (trackId, clip) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: [...t.clips, { ...clip, id: nanoid() }] }
            : t
        ),
      },
    })),

  updateClip: (trackId, clipId, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === clipId ? { ...c, ...patch } : c
                ),
              }
            : t
        ),
      },
    })),

  removeClip: (trackId, clipId) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
            : t
        ),
      },
    })),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  setCurrentTime: (t) => set({ currentTime: t }),
  play: () => set({ playerState: "playing" }),
  pause: () => set({ playerState: "paused" }),
  stop: () => set({ playerState: "idle", currentTime: 0 }),
}));
