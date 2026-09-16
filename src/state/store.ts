import { create } from "zustand";
import type { Project, Clip, Track, MediaBinItem } from "../types";
import { nanoid } from "../utils/nanoid";

type PlayerState = "idle" | "playing" | "paused";

/** Maximum undo history depth */
const MAX_UNDO = 50;

type AppState = {
  project: Project;
  playerState: PlayerState;
  currentTime: number;
  zoom: number; // pixels per second (pxPerSec)
  selectedClipId: string | null;
  mediaBin: MediaBinItem[];

  // Panel & UI Visibility
  leftDockOpen: boolean;
  rightDockOpen: boolean;
  timelineDockOpen: boolean;
  activeLeftTab: "media" | "text" | "effects" | "transitions" | "keyframes";
  activePanel: "timeline" | "preview" | "leftDock" | "rightDock" | "inspector" | null;
  setActivePanel: (panel: "timeline" | "preview" | "leftDock" | "rightDock" | "inspector" | null) => void;
  autoSelectCanvas: boolean;
  transformControlsCanvas: boolean;

  // Timeline playback loop & Work Area (In / Out points)
  isLooping: boolean;
  inPoint: number | null;
  outPoint: number | null;
  toggleLooping: () => void;
  setIsLooping: (val: boolean) => void;
  setInPoint: (time: number | null) => void;
  setOutPoint: (time: number | null) => void;
  clearWorkArea: () => void;

  // Timeline snapping
  snappingEnabled: boolean;
  toggleSnapping: () => void;

  // Undo / Redo
  undoStack: Project[];
  redoStack: Project[];
  undo: () => void;
  redo: () => void;

  toggleLeftDock: () => void;
  toggleRightDock: () => void;
  toggleTimelineDock: () => void;
  setActiveLeftTab: (tab: "media" | "text" | "effects" | "transitions" | "keyframes") => void;
  setAutoSelectCanvas: (val: boolean) => void;
  setTransformControlsCanvas: (val: boolean) => void;

  // Project
  setResolution: (width: number, height: number) => void;
  setFps: (fps: number) => void;
  setProjectName: (name: string) => void;

  // Zoom
  setZoom: (pxPerSec: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: (viewportWidth: number) => void;

  // Media bin
  addToBin: (item: Omit<MediaBinItem, "id">) => string;
  removeFromBin: (id: string) => void;

  // Tracks
  addTrack: (type: "video" | "audio", name?: string) => string;
  removeTrack: (trackId: string) => void;
  reorderTracks: (tracks: Track[]) => void;
  moveTrack: (fromIndex: number, toIndex: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;
  setTrackSoloed: (trackId: string, soloed: boolean) => void;
  setTrackLocked: (trackId: string, locked: boolean) => void;

  // Clips
  addClip: (trackId: string, clip: Omit<Clip, "id">) => string;
  updateClip: (trackId: string, clipId: string, patch: Partial<Clip>) => void;
  removeClip: (trackId: string, clipId: string) => void;
  removeSelectedClip: () => void;
  duplicateSelectedClip: () => void;
  selectClip: (clipId: string | null) => void;
  moveClipToTrack: (fromTrackId: string, toTrackId: string, clipId: string, newStart?: number) => void;
  splitClipAtCurrentTime: () => void;
  separateAudioFromVideo: (trackId?: string, clipId?: string) => void;
  rippleDeleteSelectedClip: () => void;

  // Keyframes
  addKeyframe: (trackId: string, clipId: string, keyframe: Omit<import("../types").Keyframe, "id">) => void;
  removeKeyframe: (trackId: string, clipId: string, keyframeId: string) => void;

  // Canvas Viewport Zoom Scale (100 = fit/100%, 50 = 50%, 200 = 200%)
  canvasScale: number;
  setCanvasScale: (scale: number) => void;

  // Markers
  addMarker: (time?: number, label?: string, color?: string) => void;
  removeMarker: (id: string) => void;

  // Project Load / Save / Reset
  loadProject: (project: Project) => void;
  resetProject: () => void;

  // Playback
  setCurrentTime: (t: number) => void;
  stepFrames: (frames: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
};

// Initial state with default video V1 & audio A1 tracks
const defaultProject: Project = {
  name: "Untitled Sequence",
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  tracks: [
    { id: "v1-default", type: "video", name: "V1", muted: false, locked: false, clips: [] },
    { id: "a1-default", type: "audio", name: "A1", muted: false, locked: false, clips: [] },
  ],
  markers: [],
};

const STORAGE_KEY = "video_editor_project_v1";

function loadSavedProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tracks)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load saved project state:", err);
  }
  return defaultProject;
}

function saveProjectToStorage(p: Project) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch (err) {
    console.warn("Failed to save project to localStorage:", err);
  }
}

/** Deep-clone a Project for undo snapshots (tracks + clips are plain objects) */
function cloneProject(p: Project): Project {
  return JSON.parse(JSON.stringify(p));
}

export const useAppStore = create<AppState>((set, get) => ({
  project: loadSavedProject(),
  playerState: "idle",
  currentTime: 0,
  zoom: 80, // 80px per second by default
  selectedClipId: null,
  mediaBin: [],

  // Panel & UI Visibility
  leftDockOpen: true,
  rightDockOpen: true,
  timelineDockOpen: true,
  activeLeftTab: "media",
  activePanel: "timeline",
  setActivePanel: (panel) => set({ activePanel: panel }),
  autoSelectCanvas: true,
  transformControlsCanvas: true,

  // Timeline playback loop & Work Area
  isLooping: false,
  inPoint: null,
  outPoint: null,
  toggleLooping: () => set((s) => ({ isLooping: !s.isLooping })),
  setIsLooping: (val) => set({ isLooping: val }),
  setInPoint: (time) => set({ inPoint: time }),
  setOutPoint: (time) => set({ outPoint: time }),
  clearWorkArea: () => set({ inPoint: null, outPoint: null }),

  // Timeline snapping
  snappingEnabled: true,
  toggleSnapping: () => set((s) => ({ snappingEnabled: !s.snappingEnabled })),

  // Undo / Redo
  undoStack: [],
  redoStack: [],

  undo: () =>
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const prev = s.undoStack[s.undoStack.length - 1];
      return {
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
        project: prev,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const next = s.redoStack[s.redoStack.length - 1];
      return {
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
        project: next,
      };
    }),

  toggleLeftDock: () => set((s) => ({ leftDockOpen: !s.leftDockOpen })),
  toggleRightDock: () => set((s) => ({ rightDockOpen: !s.rightDockOpen })),
  toggleTimelineDock: () => set((s) => ({ timelineDockOpen: !s.timelineDockOpen })),
  setActiveLeftTab: (tab) => set({ activeLeftTab: tab, leftDockOpen: true }),
  setAutoSelectCanvas: (val) => set({ autoSelectCanvas: val }),
  setTransformControlsCanvas: (val) => set({ transformControlsCanvas: val }),

  setResolution: (width, height) =>
    set((s) => ({ project: { ...s.project, resolution: { width, height } } })),

  setFps: (fps) =>
    set((s) => ({ project: { ...s.project, fps } })),

  setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name } })),

  setZoom: (pxPerSec) => set({ zoom: Math.min(300, Math.max(10, pxPerSec)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(300, Math.round(s.zoom * 1.25)) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(10, Math.round(s.zoom * 0.8)) })),
  zoomToFit: (viewportWidth) => {
    const tracks = get().project.tracks;
    let maxDuration = 10;
    for (const t of tracks) {
      for (const c of t.clips) {
        const end = c.timelineStart + (c.outPoint - c.inPoint);
        if (end > maxDuration) maxDuration = end;
      }
    }
    const fitZoom = Math.max(10, Math.min(300, (viewportWidth - 180) / (maxDuration + 1)));
    set({ zoom: Math.round(fitZoom) });
  },

  addToBin: (item) => {
    const id = nanoid();
    set((s) => ({ mediaBin: [...s.mediaBin, { ...item, id }] }));
    return id;
  },

  removeFromBin: (id) =>
    set((s) => ({ mediaBin: s.mediaBin.filter((m) => m.id !== id) })),

  addTrack: (type, name) => {
    const id = nanoid();
    const trackName = name || nextTrackName(type, get().project.tracks);
    set((s) => {
      const undoStack = [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)];
      return {
        undoStack,
        redoStack: [],
        project: {
          ...s.project,
          tracks: [
            ...s.project.tracks,
            { id, type, name: trackName, muted: false, locked: false, clips: [] },
          ],
        },
      };
    });
    return id;
  },

  removeTrack: (trackId) =>
    set((s) => {
      const undoStack = [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)];
      return {
        undoStack,
        redoStack: [],
        project: {
          ...s.project,
          tracks: s.project.tracks.filter((t) => t.id !== trackId),
        },
      };
    }),

  reorderTracks: (tracks) =>
    set((s) => ({
      project: { ...s.project, tracks },
    })),

  moveTrack: (fromIndex, toIndex) =>
    set((s) => {
      const tracks = [...s.project.tracks];
      if (fromIndex < 0 || fromIndex >= tracks.length || toIndex < 0 || toIndex >= tracks.length) return s;
      const undoStack = [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)];
      const [moved] = tracks.splice(fromIndex, 1);
      tracks.splice(toIndex, 0, moved);
      return { undoStack, redoStack: [], project: { ...s.project, tracks } };
    }),

  setTrackMuted: (trackId, muted) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => (t.id === trackId ? { ...t, muted } : t)),
      },
    })),

  setTrackSoloed: (trackId, soloed) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => (t.id === trackId ? { ...t, soloed } : t)),
      },
    })),

  setTrackLocked: (trackId, locked) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => (t.id === trackId ? { ...t, locked } : t)),
      },
    })),

  addClip: (trackId, clip) => {
    const id = nanoid();
    set((s) => {
      const undoStack = [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)];
      return {
        undoStack,
        redoStack: [],
        project: {
          ...s.project,
          tracks: s.project.tracks.map((t) =>
            t.id === trackId
              ? { ...t, clips: [...t.clips, { ...clip, id }] }
              : t
          ),
        },
        selectedClipId: id,
      };
    });
    return id;
  },

  updateClip: (trackId, clipId, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
              }
            : t
        ),
      },
    })),

  removeClip: (trackId, clipId) =>
    set((s) => {
      const undoStack = [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)];
      return {
        undoStack,
        redoStack: [],
        project: {
          ...s.project,
          tracks: s.project.tracks.map((t) =>
            t.id === trackId
              ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
              : t
          ),
        },
        selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
      };
    }),

  removeSelectedClip: () => {
    const state = get();
    if (!state.selectedClipId) return;
    const { track, clip } = findClipAndTrack(state.project.tracks, state.selectedClipId) || {};
    if (track && clip) {
      state.removeClip(track.id, clip.id);
    }
  },

  rippleDeleteSelectedClip: () => {
    const state = get();
    if (!state.selectedClipId) return;
    const res = findClipAndTrack(state.project.tracks, state.selectedClipId);
    if (!res) return;

    const { track, clip } = res;
    const clipDuration = clip.outPoint - clip.inPoint;
    const deletedStart = clip.timelineStart;

    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => {
          if (t.id !== track.id) return t;
          const remainingClips = t.clips.filter((c) => c.id !== clip.id);
          const shiftedClips = remainingClips.map((c) => {
            if (c.timelineStart > deletedStart) {
              return {
                ...c,
                timelineStart: Math.max(0, c.timelineStart - clipDuration),
              };
            }
            return c;
          });
          return { ...t, clips: shiftedClips };
        }),
      },
      selectedClipId: null,
    }));
  },

  duplicateSelectedClip: () => {
    const state = get();
    if (!state.selectedClipId) return;
    const res = findClipAndTrack(state.project.tracks, state.selectedClipId);
    if (!res) return;
    const { track, clip } = res;

    const duration = clip.outPoint - clip.inPoint;
    const newStart = clip.timelineStart + duration + 0.2;

    const dup: Omit<Clip, "id"> = {
      sourceId: clip.sourceId,
      name: clip.name ? `${clip.name} (Copy)` : undefined,
      mediaType: clip.mediaType,
      inPoint: clip.inPoint,
      outPoint: clip.outPoint,
      timelineStart: newStart,
      transform: clip.transform ? { ...clip.transform } : undefined,
      opacity: clip.opacity,
      volume: clip.volume,
      filters: clip.filters ? { ...clip.filters } : undefined,
      fadeIn: clip.fadeIn,
      fadeOut: clip.fadeOut,
    };

    state.addClip(track.id, dup);
  },

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  moveClipToTrack: (fromTrackId, toTrackId, clipId, newStart) => {
    set((s) => {
      const fromTrack = s.project.tracks.find((t) => t.id === fromTrackId);
      const clip = fromTrack?.clips.find((c) => c.id === clipId);
      if (!fromTrack || !clip) return s;

      const updatedClip = {
        ...clip,
        timelineStart: newStart !== undefined ? Math.max(0, newStart) : clip.timelineStart,
      };

      return {
        project: {
          ...s.project,
          tracks: s.project.tracks.map((t) => {
            if (t.id === fromTrackId && fromTrackId === toTrackId) {
              return {
                ...t,
                clips: t.clips.map((c) => (c.id === clipId ? updatedClip : c)),
              };
            }
            if (t.id === fromTrackId) {
              return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
            }
            if (t.id === toTrackId) {
              return { ...t, clips: [...t.clips, updatedClip] };
            }
            return t;
          }),
        },
      };
    });
  },

  splitClipAtCurrentTime: () => {
    const state = get();
    const { currentTime, selectedClipId } = state;
    const tracks = state.project.tracks;

    let targetTrack: Track | undefined;
    let targetClip: Clip | undefined;

    if (selectedClipId) {
      const result = findClipAndTrack(tracks, selectedClipId);
      if (result) {
        targetTrack = result.track;
        targetClip = result.clip;
      }
    }

    if (!targetClip) {
      for (const t of tracks) {
        for (const c of t.clips) {
          const end = c.timelineStart + (c.outPoint - c.inPoint);
          if (currentTime > c.timelineStart && currentTime < end) {
            targetTrack = t;
            targetClip = c;
            break;
          }
        }
        if (targetClip) break;
      }
    }

    if (!targetTrack || !targetClip) return;

    const clipEnd = targetClip.timelineStart + (targetClip.outPoint - targetClip.inPoint);
    if (currentTime <= targetClip.timelineStart || currentTime >= clipEnd) return;

    const offset = currentTime - targetClip.timelineStart;
    const splitSourceTime = targetClip.inPoint + offset;

    // Push undo before split
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
    }));

    state.updateClip(targetTrack.id, targetClip.id, { outPoint: splitSourceTime });

    const secondClip: Omit<Clip, "id"> = {
      sourceId: targetClip.sourceId,
      name: targetClip.name ? `${targetClip.name} (Split)` : undefined,
      mediaType: targetClip.mediaType,
      inPoint: splitSourceTime,
      outPoint: targetClip.outPoint,
      timelineStart: currentTime,
      transform: targetClip.transform ? { ...targetClip.transform } : undefined,
      opacity: targetClip.opacity,
      volume: targetClip.volume,
      filters: targetClip.filters ? { ...targetClip.filters } : undefined,
      fadeIn: targetClip.fadeIn,
      fadeOut: targetClip.fadeOut,
    };

    // addClip without double-undo (we already pushed above)
    const id = nanoid();
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === targetTrack!.id
            ? { ...t, clips: [...t.clips, { ...secondClip, id }] }
            : t
        ),
      },
      selectedClipId: id,
    }));
  },

  separateAudioFromVideo: (trackIdParam, clipIdParam) => {
    const state = get();
    const clipId = clipIdParam || state.selectedClipId;
    if (!clipId) return;

    let targetTrack = trackIdParam
      ? state.project.tracks.find((t) => t.id === trackIdParam)
      : state.project.tracks.find((t) => t.clips.some((c) => c.id === clipId));
    let targetClip = targetTrack?.clips.find((c) => c.id === clipId);

    if (!targetTrack || !targetClip || targetClip.mediaType !== "video") return;

    // Find existing audio track or create a new audio track
    const audioTracks = state.project.tracks.filter((t) => t.type === "audio");
    let audioTrackId: string;
    if (audioTracks.length > 0) {
      audioTrackId = audioTracks[0].id;
    } else {
      audioTrackId = state.addTrack("audio");
    }

    const audioClipId = nanoid();
    const audioClip: Clip = {
      id: audioClipId,
      sourceId: targetClip.sourceId,
      name: `${targetClip.name || "Video"} (Audio)`,
      mediaType: "audio",
      inPoint: targetClip.inPoint,
      outPoint: targetClip.outPoint,
      timelineStart: targetClip.timelineStart,
      volume: targetClip.volume !== undefined ? targetClip.volume : 1,
      fadeIn: targetClip.fadeIn,
      fadeOut: targetClip.fadeOut,
      speed: targetClip.speed,
    };

    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => {
          if (t.id === targetTrack!.id) {
            return {
              ...t,
              clips: t.clips.map((c) => (c.id === clipId ? { ...c, volume: 0 } : c)),
            };
          }
          if (t.id === audioTrackId) {
            return {
              ...t,
              clips: [...t.clips, audioClip],
            };
          }
          return t;
        }),
      },
      selectedClipId: audioClipId,
    }));
  },

  addKeyframe: (trackId, clipId, keyframeData) => {
    const kfId = nanoid();
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === clipId
                    ? {
                        ...c,
                        keyframes: [...(c.keyframes || []), { ...keyframeData, id: kfId }].sort(
                          (a, b) => a.time - b.time
                        ),
                      }
                    : c
                ),
              }
            : t
        ),
      },
    }));
  },

  removeKeyframe: (trackId, clipId, keyframeId) => {
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === clipId
                    ? {
                        ...c,
                        keyframes: (c.keyframes || []).filter((k) => k.id !== keyframeId),
                      }
                    : c
                ),
              }
            : t
        ),
      },
    }));
  },

  canvasScale: 100,
  setCanvasScale: (scale) => set({ canvasScale: scale }),

  addMarker: (time, label, color) => {
    const t = time !== undefined ? time : get().currentTime;
    const markerId = nanoid();
    const newMarker = {
      id: markerId,
      time: t,
      label: label || `Marker ${ (get().project.markers?.length || 0) + 1}`,
      color: color || "#f59e0b",
    };
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
      project: {
        ...s.project,
        markers: [...(s.project.markers || []), newMarker],
      },
    }));
  },

  removeMarker: (id) => {
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
      project: {
        ...s.project,
        markers: (s.project.markers || []).filter((m) => m.id !== id),
      },
    }));
  },

  loadProject: (newProject) => {
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
      project: newProject,
      selectedClipId: null,
      currentTime: 0,
    }));
  },

  resetProject: () => {
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_UNDO - 1)), cloneProject(s.project)],
      redoStack: [],
      project: cloneProject(defaultProject),
      selectedClipId: null,
      currentTime: 0,
    }));
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Failed to clear localStorage:", err);
    }
  },

  setCurrentTime: (t) => set({ currentTime: Math.max(0, t) }),
  stepFrames: (frames) => {
    const fps = get().project.fps || 30;
    const delta = frames / fps;
    const nextTime = Math.max(0, get().currentTime + delta);
    set({ currentTime: nextTime });
  },
  play: () => set({ playerState: "playing" }),
  pause: () => set({ playerState: "paused" }),
  stop: () => set({ playerState: "idle", currentTime: 0 }),
}));

// Auto-save project changes to localStorage
useAppStore.subscribe((state) => {
  saveProjectToStorage(state.project);
});

// ── Helpers ────────────────────────────────────────────────────────────────

export function nextTrackName(type: "video" | "audio", tracks?: Track[]): string {
  const currentTracks = tracks || useAppStore.getState().project.tracks;
  const count = currentTracks.filter((t) => t.type === type).length;
  return type === "video" ? `V${count + 1}` : `A${count + 1}`;
}

export function findClipAndTrack(tracks: Track[], clipId: string): { track: Track; clip: Clip } | undefined {
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return { track, clip };
  }
  return undefined;
}
