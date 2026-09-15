# Agent Progress

## Status
Steps 1-4 complete. Canvas compositor + timeline UI working. Ready for step 5 (text overlay).

## Done
- Vite + React + TS scaffold, zustand, mp4-muxer, webm-muxer installed
- Core data model: `src/types/index.ts` (Project / Track / Clip / Transform)
- Zustand store: full CRUD for project/tracks/clips + playback state
- `SourceRegistry` — maps sourceId → HTMLVideoElement (preview decode via `<video>`, not WebCodecs)
- `Compositor` — rAF loop, draws clips with transform math (drawImage centered + scale + rotation)
- `PlaybackController` — rAF delta loop advancing currentTime; video elements seeked by compositor
- `PreviewCanvas` component — mounts compositor on canvas ref
- `Toolbar` — "+ Video" (append to track 1), "+ Track" (new track), play/pause/stop, layout buttons
- `layout.ts` — `applySideBySideLayout()` / `applyFullscreenLayout()` helpers; called on new track add
- `Timeline` — ruler (click-to-seek), track lanes, clip blocks (drag-move + left/right trim handles), playhead, empty state

## Next
1. **Text overlay tool** (step 5): add a `TextClip` type (or extend Clip with `text?: {content, fontSize, color, fontFamily}`), render text on canvas in compositor, add text clip via toolbar button
2. **Project settings panel** (step 6): resolution, fps, aspect ratio picker — modal or side panel
3. **Audio tracks + Web Audio mixing** (step 7)

## Decisions / gotchas
- Preview decode uses `HTMLVideoElement.currentTime` seeking, NOT WebCodecs. WebCodecs reserved for export.
- Seeking `videoEl.currentTime` only when >1/60s off avoids thrash but may show stale frame on slow seeks — acceptable for now.
- `mp4-muxer` / `webm-muxer` deprecated in favour of Mediabunny — fine until export step.
- `applySideBySideLayout` uses `setTimeout(..., 0)` after `addClip` to let store settle before reading updated tracks.
- Playhead left offset = `currentTime * PX_PER_SEC + 48px` (48 = lane-label column width).
- `PX_PER_SEC = 80` hardcoded — zoom control deferred to after core features done.

## File map
```
src/
  types/index.ts            — Project, Track, Clip, Transform
  state/store.ts            — Zustand store
  utils/nanoid.ts           — ID generator
  engine/
    sourceRegistry.ts       — sourceId → HTMLVideoElement
    compositor.ts           — rAF canvas render loop
    playback.ts             — PlaybackController (time advance)
    layout.ts               — side-by-side / fullscreen layout helpers
  components/
    PreviewCanvas.tsx       — canvas + compositor mount
    Toolbar.tsx             — file open, playback, layout buttons
    Timeline.tsx            — ruler, lanes, clip blocks, trim, playhead
  App.tsx / App.css         — shell layout + all styles
```
