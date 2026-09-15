# 🎬 Web NLE Video Editor Studio

> A powerful, browser-based Non-Linear Video Editor (NLE) engineered with **React**, **TypeScript**, **Vite**, **Zustand**, **Web Audio API**, and HTML5 **Canvas 2D Compositor**.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Vite](https://img.shields.io/badge/Vite-8-purple.svg)

---

## ✨ Features

- 🎞️ **Multi-Track Timeline**: Unlimited video and audio track lanes with track reordering (▲/▼), track muting/locking, magnet timeline snapping (`N`), and dynamic zoom scaling (`10px/s` to `300px/s`).
- 🎨 **Canvas Compositor Render Engine**: Real-time `requestAnimationFrame`-driven canvas rendering loop for video, image, and dynamic text overlay clips.
- 📐 **Interactive Canvas Transform Gizmo**: On-canvas transform gizmo supporting position translation, corner scaling, and 360° rotation handle.
- 🎯 **Keyframe Motion Automation**: Set keyframe points for Position (X/Y), Scale (X/Y), Rotation, and Opacity over time with interpolated keyframe animation curves and playhead keyframe seek.
- 🌊 **Real-time Audio Waveforms & Peak Metering**: Web Audio API decoded audio buffer waveform rendering on timeline clip blocks alongside stereo peak volume metering (`PeakMeter`).
- 🌈 **Color Grading & CSS Filters**: Live brightness, contrast, saturation, blur, sepia, hue rotate, invert, and grayscale sliders with instant reset.
- 🔀 **Transitions & Fades**: Fade-in and fade-out opacity/volume curves plus cross-dissolve blend transitions.
- ⌨️ **Keyboard Shortcuts & Undo/Redo**: Full NLE keyboard navigation stack (`Space`, `J`/`K`/`L`, `S` split clip, `⌘Z` / `⌘⇧Z` undo/redo stack up to 50 steps).
- 🚀 **Pro Studio Offline Video Export**: Render project frames in-browser via `HTMLCanvasElement.captureStream()` and `MediaRecorder` into `WebM` or `MP4` formats with customizable resolution presets (4K, 1080p, 720p, Vertical 9:16), frame rates (24, 25, 30, 60 FPS), and target bitrates (4–50 Mbps).

---

## 🛠️ Tech Stack

- **Framework**: React 18 & TypeScript
- **Build Tool**: Vite 8
- **State Management**: Zustand
- **Graphics Rendering**: HTML5 Canvas 2D API & Custom Transform Matrix Engine
- **Audio Processing**: Web Audio API (`AudioContext`, `AnalyserNode`, `AudioBuffer` peak extraction)
- **Video Export**: MediaRecorder API & Canvas Stream Capture

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn` / `pnpm`

### Installation & Local Setup

```bash
# Clone the repository
git clone https://github.com/Melkoh02/video-editor.git

# Navigate to project directory
cd video-editor

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser to start editing!

---

## 🏗️ Production Build

To build the project for production:

```bash
npm run build
```

The optimized static assets will be output to the `dist/` directory.

---

## ⌨️ Keyboard Shortcuts Reference

| Action | Shortcut |
| :--- | :--- |
| **Play / Pause** | `Space` / `K` |
| **Step Backward / Forward** | `←` / `→` (or `Shift + ←` / `Shift + →` for 1s jump) |
| **Shuttle Playback Left / Right** | `J` / `L` |
| **Split Clip at Playhead** | `S` |
| **Duplicate Selected Clip** | `⌘D` / `Ctrl+D` |
| **Delete Selected Clip** | `Delete` / `Backspace` |
| **Undo / Redo** | `⌘Z` / `⌘⇧Z` |
| **Toggle Snapping** | `N` |
| **Add Marker** | `M` |
| **Zoom Timeline** | `⌘ + Scroll` or `⌘+` / `⌘-` |
| **Shortcuts Guide** | `?` or `Shift + /` |

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
