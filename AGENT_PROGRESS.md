# Agent Progress Log & Architecture Blueprint

## Executive Overview & Status
- **Status**: Professional NLE **Video Editor** studio featuring SVG vector icon design system, interactive dropdown menu system (File, Edit, Clip, Sequence, View, Help), Multi-track timeline with dynamic zoom scaling (10px/s - 300px/s), track reordering, magnet timeline snapping, Undo/Redo stack (`⌘Z`/`⌘⇧Z`), interactive Canvas Transform Gizmo, Text Overlay renderer, Color Grading & CSS Filters (Brightness, Contrast, Saturation, Blur, Sepia, Hue Rotate), Keyframe Motion Automation (Position X/Y, Scale X/Y, Rotation, Opacity), Clip Fade In / Fade Out & Cross-Dissolve Blend transitions, Real-time Canvas Waveform rendering on timeline audio/video clips, Audio Volume Fades & Peak Metering, Resizable Dock Splitters, Keyboard Shortcuts modal, and Pro Studio 2-Column Offline Browser Video Export Modal (`WebM`/`MP4`).

---

## 🏗️ Architecture & Data Flow Blueprint

### 1. State Management (`src/state/store.ts`)
- Powered by **Zustand**.
- Contains sequence state (`Project`, `Track[]`, `Clip[]`), active selection (`selectedClipId`), player state (`idle` | `playing` | `paused`), playhead time (`currentTime`), timeline zoom (`zoom`), magnet snapping state (`snappingEnabled`), and Undo/Redo stacks (`undoStack`, `redoStack`).
- Actions support track CRUD, track reordering (`moveTrack`), clip CRUD, clip duplication (`duplicateSelectedClip`), clip splitting (`splitClipAtCurrentTime`), cross-track clip movement (`moveClipToTrack`), keyframe automation management (`addKeyframe`, `removeKeyframe`), precision frame stepping (`stepFrames`), zoom controls (`zoomIn`, `zoomOut`, `zoomToFit`, `setZoom`), magnet snapping toggle (`toggleSnapping`), and `undo()` / `redo()`.

### 2. Media Registry & Decoders (`src/engine/sourceRegistry.ts` & `src/engine/audioWaveforms.ts`)
- Maps `sourceId` → `SourceEntry` containing live elements (`<video>`, `<audio>`, `<img>`) with duration, width, and height.
- Handles Object URL creation (`URL.createObjectURL`) and explicit resource disposal (`URL.revokeObjectURL`) upon removal.
- Decodes audio data buffers via Web Audio API AudioContext and generates normalized peak arrays for real-time waveform canvas rendering on timeline clips.

### 3. Canvas Compositor Render Engine (`src/engine/compositor.ts` & `src/utils/geometry.ts`)
- Driven by a `requestAnimationFrame` loop on `<canvas>`.
- Renders video tracks in timeline order (bottom-to-top).
- Draws Video, Image, and Text Overlay clips with interpolated Keyframe transform matrices (`computeAnimatedTransform`: Position X/Y, Scale X/Y, Rotation 0-360°, Opacity 0-1, CSS Color Grading filters, Fade-in / Fade-out opacity transitions, Cross-Dissolve blend transitions, Text font/color/stroke/background styling).
- `computeClipBounds` and `isPointInsideClip` perform coordinate transformations between Project resolution space and DOM viewport pixels.

### 4. Audio Engine & Synchronization (`src/engine/audioEngine.ts` & `src/engine/playback.ts`)
- Syncs media playback clock, seeking, volume levels, fade-in / fade-out audio volume curves, and mute states across all video and audio tracks.
- Web Audio API integration feeds live volume levels to `PeakMeter.tsx`.

### 5. Pro Studio Video Export Pipeline (`src/components/ExportModal.tsx`)
- Renders project frames frame-by-frame on a canvas stream via `HTMLCanvasElement.captureStream()` and `MediaRecorder`.
- 2-Column Studio UI: Output file name, resolution presets (4K UHD, 1080p, 720p, Vertical 9:16), format containers (`WebM` / `MP4`), target FPS (24, 30, 60), bitrate slider (4–50 Mbps), live encoding monitor viewport with timestamp (PTS), local render progress bar, metrics grid (render speed, time left, estimated file size), zero-cloud security badge, and file download (`URL.createObjectURL`).

---

## 🎨 Component Sitemap & Atomic UI System
```
src/
  types/index.ts              — Core data models (Project, Track, Clip, Transform, Keyframe, TextProperties, Filters, MediaType, MediaBinItem)
  state/store.ts              — Zustand state management store (includes undo/redo, keyframe automation, snapping state, zoom controls)
  utils/
    nanoid.ts                 — Unique ID generator
    geometry.ts               — Clip geometry, matrix transforms, rotated polygon hit testing
  engine/
    sourceRegistry.ts         — Binary source manager with URL object revoking
    audioWaveforms.ts         — Audio peak extraction & waveform peak cache
    compositor.ts             — Canvas rendering loop (Video, Image, Text Overlay, Keyframes, CSS Filters & Cross-Dissolve renderer)
    playback.ts               — Playback clock & audio/video synchronization controller with volume fades
    audioEngine.ts            — Web Audio levels engine
    layout.ts                 — Side-by-side & fullscreen preset layout generators
  components/
    ui/                       — Atomic UI Component Library
      Icon.tsx                — SVG Vector Icon system (over 30 clean studio icons)
      Button.tsx              — Reusable button with primary, danger, ghost variants
      Input.tsx               — Reusable input field with label and error handling
      Slider.tsx              — Reusable range slider with numerical value display
      Select.tsx              — Reusable select dropdown
      Card.tsx                — Reusable card wrapper container
      Modal.tsx               — Reusable popup modal backdrop & header
    PreviewCanvas.tsx         — Canvas viewport with ResizeObserver
    CanvasGizmo.tsx           — Interactive SVG transform gizmo (translate, corner scale, rotation knob)
    MediaBin.tsx              — Media library (video, image, audio upload & object URL disposal)
    Inspector.tsx             — Clip properties inspector (Position, Scale, Rotation, Opacity, Text, Keyframes, Color Grading Filters, Fades, Cross-Dissolve)
    PeakMeter.tsx             — Stereo audio peak meter
    ResizableLayout.tsx       — Draggable layout splitters (Left dock, Right dock, Timeline height)
    ShortcutsModal.tsx        — Keyboard shortcuts guide modal
    ExportModal.tsx           — Pro Studio 2-Column Video Export Modal
    Topbar.tsx                — Top navigation bar with brand badge, interactive dropdown menus (File, Edit, Clip, Sequence, View, Help), timecode display, transport controls, and export button
    Timeline.tsx              — Multi-track timeline, magnet snapping, audio waveform canvas overlays, snap guide lines, undo/redo, dynamic zoom controls, track reorder controls (▲/▼), clip lanes, playhead
  App.tsx / App.css           — Main NLE shell, dock layout & Pro Studio theme styles
```

---

## 📋 Completed Features & Roadmap Status
- [x] **Keyframe Motion Automation**: Interpolated position, scale, rotation, and opacity over time with Inspector controls and playback keyframe seek.
- [x] **Real-time Audio Waveforms**: Web Audio API decoded audio peak waveform rendering on timeline clip blocks.
- [x] **Cross-Dissolve Transitions**: Cross-dissolve sine-curve blend transition curves in canvas compositor and clip Inspector.
- [x] **Dedicated Left Dock Panels (`TextPanel` & `EffectsPanel`)**: Fully functional Text & Titles tab and Color Grading Presets tab hooked up to the Activity Bar buttons.
- [x] **Separate / Extract Audio from Video**: One-click action via right-click context menu, Inspector, and Topbar menu to split video audio onto a dedicated synced audio track.
- [x] **Media Bin Live Video & Image Thumbnails**: Automatic HTML canvas frame capture at 0.5s for video imports and image preview thumbnails in Media Library cards.

### 🎯 Sequential Execution Plan
1. [x] **Dedicated Left Dock Tabs** (`TextPanel` and `EffectsPanel`).
2. [x] **Separate Audio from Video** ("Extract Audio Track" action).
3. [x] **Media Bin Live Canvas Video Thumbnails**.
4. [ ] **Project Persistence & Auto-Save** (`localStorage` state sync).
5. [ ] **Ripple Delete & Gap Removal**.
6. [ ] **Interactive Volume Gain Line & Track Solo (`S`)**.

---
*Updated automatically for seamless agent handoff.*
