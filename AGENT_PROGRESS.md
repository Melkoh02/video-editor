# Agent Progress

## Status
Scaffold complete — step 1 done, ready to build canvas compositor (step 2).

## Done
- Vite + React + TS project created in `/video-editor`
- Installed: zustand, mp4-muxer, webm-muxer
- Core data model in `src/types/index.ts` (Project / Track / Clip / Transform)
- Zustand store in `src/state/store.ts` (project CRUD + playback state)
- Dark-theme shell layout: topbar / preview canvas / timeline placeholder
- Git repo init'd, initial commit made

## Next
1. Implement canvas compositor: load a video file, decode frames, draw to canvas at 60fps with a transform (position/scale) — proves render loop
2. Wire a file-open button to read a video file and add it to the store as a clip on a video track
3. Confirm `VideoDecoder` decode → `drawImage(VideoFrame)` loop works end-to-end

## Decisions / gotchas
- `mp4-muxer` and `webm-muxer` show deprecation warnings (superseded by Mediabunny) — fine for now, migrate at export step if needed
- Safari/Firefox: no WebCodecs → need `<video>` element fallback for preview decode
- `nanoid` not installed as dep; using `src/utils/nanoid.ts` (crypto.getRandomValues)
- Canvas sized at 1280×720 in DOM; actual project resolution is 1920×1080 — scale on draw

## File map
```
src/
  types/index.ts       — Project, Track, Clip, Transform types
  state/store.ts       — Zustand store (all app state)
  utils/nanoid.ts      — ID generator
  App.tsx              — Shell layout (topbar, preview, timeline placeholder)
  App.css              — Dark theme layout CSS
  main.tsx             — Entry point
```
