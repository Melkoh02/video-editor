# Agent Progress Log & Architecture Blueprint

## Executive Overview & Status
- **Status**: Multi-track NLE Video Editor with dynamic timeline zoom scaling (10px/s - 300px/s), track reordering, interactive Canvas Gizmo, Text Overlay renderer, Media Library, Property Inspector, Audio Engine, Resizable Dock Splitters, and Keyboard Shortcuts.

---

## 🏗️ Architecture & Data Flow Blueprint

### 1. State Management (`src/state/store.ts`)
- Powered by **Zustand**.
- Contains sequence state (`Project`, `Track[]`, `Clip[]`), active selection (`selectedClipId`), player state (`idle` | `playing` | `paused`), playhead time (`currentTime`), and timeline zoom (`zoom` in pixels per second).
- Actions support track CRUD, track reordering (`moveTrack`), clip CRUD, clip duplication, clip splitting (`splitClipAtCurrentTime`), cross-track clip movement (`moveClipToTrack`), precision frame stepping (`stepFrames`), and zoom controls (`zoomIn`, `zoomOut`, `zoomToFit`, `setZoom`).

### 2. Media Registry & Decoders (`src/engine/sourceRegistry.ts`)
- Maps `sourceId` → `SourceEntry` containing live elements (`<video>`, `<audio>`, `<img>`) with duration, width, and height.
- Handles Object URL creation (`URL.createObjectURL`) and explicit resource disposal (`URL.revokeObjectURL`) upon removal.

### 3. Canvas Compositor Render Engine (`src/engine/compositor.ts` & `src/utils/geometry.ts`)
- Driven by a `requestAnimationFrame` loop on `<canvas>`.
- Renders video tracks in timeline order (bottom-to-top).
- Draws Video, Image, and Text Overlay clips with transform matrices (Position X/Y, Scale X/Y, Rotation 0-360°, Opacity 0-1, Text font/color/stroke/background styling).
- `computeClipBounds` and `isPointInsideClip` perform coordinate transformations between Project resolution space and DOM viewport pixels.

### 4. Audio Engine & Synchronization (`src/engine/audioEngine.ts` & `src/engine/playback.ts`)
- Syncs media playback clock, seeking, volume levels, and mute states across all video and audio tracks.
- Web Audio API integration feeds live volume levels to `PeakMeter.tsx`.

---

## 🎨 Component Sitemap & Atomic UI System
```
src/
  types/index.ts              — Core data models (Project, Track, Clip, Transform, TextProperties, MediaType, MediaBinItem)
  state/store.ts              — Zustand state management store (includes timeline zoom state & actions)
  utils/
    nanoid.ts                 — Unique ID generator
    geometry.ts               — Clip geometry, matrix transforms, rotated polygon hit testing
  engine/
    sourceRegistry.ts         — Binary source manager with URL object revoking
    compositor.ts             — Canvas rendering loop (Video, Image & Text Overlay renderer)
    playback.ts               — Playback clock & audio/video synchronization controller
    audioEngine.ts            — Web Audio levels engine
    layout.ts                 — Side-by-side & fullscreen preset layout generators
  components/
    ui/                       — Atomic UI Component Library
      Button.tsx              — Reusable button with primary, danger, ghost variants
      Input.tsx               — Reusable input field with label and error handling
      Slider.tsx              — Reusable range slider with numerical value display
      Select.tsx              — Reusable select dropdown
      Card.tsx                — Reusable card wrapper container
      Modal.tsx               — Reusable popup modal backdrop & header
    PreviewCanvas.tsx         — Canvas viewport with ResizeObserver
    CanvasGizmo.tsx           — Interactive SVG transform gizmo (translate, corner scale, rotation knob)
    MediaBin.tsx              — Media library (video, image, audio upload & object URL disposal)
    Inspector.tsx             — Clip properties inspector (Position, Scale, Rotation, Opacity, Text styling)
    PeakMeter.tsx             — Stereo audio peak meter
    ResizableLayout.tsx       — Draggable layout splitters (Left dock, Right dock, Timeline height)
    ShortcutsModal.tsx        — Keyboard shortcuts guide modal
    Toolbar.tsx               — Transport & action buttons (+Video, +Track, +Text)
    Timeline.tsx              — Multi-track timeline, dynamic zoom controls (🔍− / 🔍+ / Fit), track reorder controls (▲/▼), clip lanes, playhead
  App.tsx / App.css           — Main NLE shell, dock layout & Pro Studio theme styles
```

---

## 📋 Feature Roadmap for Future Agents
If user asks to **continue** or build next features, proceed in this order:

1. **Magnet Snapping (`🧲`)**:
   - Implement snapping to clip edges (inPoint/outPoint/timelineStart) and playhead position during clip dragging.
2. **Video Filters & Color Grading**:
   - Add canvas filters (`ctx.filter`): Brightness, Contrast, Saturation, Blur, Sepia, and Invert sliders in Inspector.
3. **Clip Fades & Cross-Dissolve Transitions**:
   - Audio/Video Fade In / Fade Out sliders on clips.
   - Cross-dissolve transitions between adjacent clips.
4. **WebCodecs Video Export Pipeline**:
   - `VideoEncoder` + `mp4-muxer` to export final MP4/WebM video file.

---
*Updated automatically for seamless agent handoff.*
