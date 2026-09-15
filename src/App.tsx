import { useState, useEffect, useRef } from "react";
import "./App.css";
import { Topbar } from "./components/Topbar";
import { ActivityBar } from "./components/ActivityBar";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { Timeline } from "./components/Timeline";
import { MediaBin } from "./components/MediaBin";
import { TextPanel } from "./components/TextPanel";
import { EffectsPanel } from "./components/EffectsPanel";
import { Inspector } from "./components/Inspector";
import { PeakMeter } from "./components/PeakMeter";
import { ResizableLayout } from "./components/ResizableLayout";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { ExportModal } from "./components/ExportModal";
import { useAppStore } from "./state/store";
import { playbackController } from "./engine/playback";
import { sourceRegistry } from "./engine/sourceRegistry";
import { applySideBySideLayout } from "./engine/layout";
import { nanoid } from "./utils/nanoid";

export default function App() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const forceNewTrackRef = useRef<boolean>(false);

  const activeLeftTab = useAppStore((s) => s.activeLeftTab);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const selectClip = useAppStore((s) => s.selectClip);
  const removeSelectedClip = useAppStore((s) => s.removeSelectedClip);
  const duplicateSelectedClip = useAppStore((s) => s.duplicateSelectedClip);
  const splitClipAtCurrentTime = useAppStore((s) => s.splitClipAtCurrentTime);
  const stepFrames = useAppStore((s) => s.stepFrames);
  const addTrack = useAppStore((s) => s.addTrack);
  const addClip = useAppStore((s) => s.addClip);

  const handleOpenFileInput = (forceNewTrack: boolean) => {
    forceNewTrackRef.current = forceNewTrack;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sourceId = nanoid();
    const entry = await sourceRegistry.register(sourceId, file);
    const forceNewTrack = forceNewTrackRef.current;

    const tracks = useAppStore.getState().project.tracks;
    const videoTracks = tracks.filter((t) => t.type === "video");

    let trackId: string;
    if (!forceNewTrack && videoTracks.length > 0) {
      trackId = videoTracks[0].id;
    } else {
      trackId = addTrack("video");
    }

    const freshTracks = useAppStore.getState().project.tracks;
    const track = freshTracks.find((t) => t.id === trackId);
    let timelineStart = 0;
    if (track && track.clips.length > 0) {
      const last = track.clips[track.clips.length - 1];
      timelineStart = last.timelineStart + (last.outPoint - last.inPoint);
    }

    addClip(trackId, {
      sourceId,
      name: entry.name || file.name,
      mediaType: entry.type || "video",
      inPoint: 0,
      outPoint: entry.duration,
      timelineStart,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      opacity: 1,
      volume: 1,
    });

    if (forceNewTrack) {
      setTimeout(() => applySideBySideLayout(), 0);
    }
    e.target.value = "";
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT")
      ) {
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl) {
        if (e.code === "KeyZ") {
          e.preventDefault();
          if (e.shiftKey) {
            useAppStore.getState().redo();
          } else {
            useAppStore.getState().undo();
          }
          return;
        }
        if (e.code === "KeyY") {
          e.preventDefault();
          useAppStore.getState().redo();
          return;
        }
        if (e.code === "KeyD") {
          e.preventDefault();
          duplicateSelectedClip();
          return;
        }
        if (e.code === "Equal" || e.code === "NumpadAdd") {
          e.preventDefault();
          useAppStore.getState().zoomIn();
          return;
        }
        if (e.code === "Minus" || e.code === "NumpadSubtract") {
          e.preventDefault();
          useAppStore.getState().zoomOut();
          return;
        }
      }

      if (e.code === "KeyN" && !isCmdOrCtrl) {
        e.preventDefault();
        useAppStore.getState().toggleSnapping();
        return;
      }

      if (e.code === "KeyM" && !isCmdOrCtrl) {
        e.preventDefault();
        useAppStore.getState().addMarker();
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        const playerState = useAppStore.getState().playerState;
        if (playerState === "playing") playbackController.pause();
        else playbackController.play();
      } else if (e.code === "KeyK") {
        e.preventDefault();
        playbackController.pause();
      } else if (e.code === "KeyJ") {
        e.preventDefault();
        const current = useAppStore.getState().currentTime;
        playbackController.seek(Math.max(0, current - 1));
      } else if (e.code === "KeyL") {
        e.preventDefault();
        const current = useAppStore.getState().currentTime;
        playbackController.seek(current + 1);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (e.shiftKey) {
          const current = useAppStore.getState().currentTime;
          playbackController.seek(Math.max(0, current - 1));
        } else {
          stepFrames(-1);
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (e.shiftKey) {
          const current = useAppStore.getState().currentTime;
          playbackController.seek(current + 1);
        } else {
          stepFrames(1);
        }
      } else if (e.code === "Home") {
        e.preventDefault();
        playbackController.seek(0);
      } else if (e.code === "End") {
        e.preventDefault();
        let max = 0;
        for (const t of useAppStore.getState().project.tracks) {
          for (const c of t.clips) {
            const end = c.timelineStart + (c.outPoint - c.inPoint);
            if (end > max) max = end;
          }
        }
        playbackController.seek(max);
      } else if (e.code === "KeyS") {
        e.preventDefault();
        splitClipAtCurrentTime();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          if (e.shiftKey) {
            useAppStore.getState().rippleDeleteSelectedClip();
          } else {
            removeSelectedClip();
          }
        }
      } else if (e.key === "?" || (e.shiftKey && e.code === "Slash")) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.code === "Escape") {
        setShowShortcuts(false);
        selectClip(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedClipId,
    removeSelectedClip,
    duplicateSelectedClip,
    splitClipAtCurrentTime,
    selectClip,
    stepFrames,
  ]);

  return (
    <div className="app-shell">
      <Topbar
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenFileInput={handleOpenFileInput}
        onOpenExport={() => setShowExport(true)}
      />

      <ResizableLayout
        activityBar={<ActivityBar onOpenShortcuts={() => setShowShortcuts(true)} />}
        leftDock={
          activeLeftTab === "media" ? (
            <MediaBin />
          ) : activeLeftTab === "text" ? (
            <TextPanel />
          ) : (
            <EffectsPanel />
          )
        }
        centerDock={
          <div className="preview-area">
            <PreviewCanvas />
          </div>
        }
        rightDock={
          <>
            <Inspector />
            <PeakMeter />
          </>
        }
        timelineDock={<Timeline />}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
