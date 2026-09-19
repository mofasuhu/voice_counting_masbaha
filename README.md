# Voice Counting Masbaha

A browser-based Arabic voice counter for dhikr (zikr). Speak a configured phrase and the app detects matching phrases, increments the selected counter, and keeps your data in the browser.

## Features

- Arabic speech recognition using the Web Speech API (`ar-SA`).
- Built-in dhikr phrases with add, edit, delete, and selection controls.
- Arabic text normalization and matching of repeated phrases in one transcript.
- Manual reset, listening status, last-heard transcript, and optional vibration feedback.
- Local persistence with `localStorage`, plus JSON export/import for backups.
- Responsive RTL interface and GitHub Pages deployment workflow.

## Tech stack

React 19, Vite, Tailwind CSS 4, and the browser Web Speech API. There is no backend or account system; counters and custom phrases stay in the current browser unless exported.

## Run locally

Requirements: Node.js 20 or newer and a browser with speech-recognition support (Google Chrome is recommended).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create and preview a production build:

```bash
npm run build
npm run preview
```

`npm run lint` checks the source with ESLint.

## Usage

1. Choose a built-in dhikr or add your own phrase and matching variants.
2. Select **Start listening** and allow microphone access when prompted.
3. Speak the selected phrase in Arabic; each detected match increments the counter.
4. Use the management panel to edit phrases, reset the counter, or export/import JSON data.

Microphone access is required for voice counting and may only work on secure origins (HTTPS or localhost). Speech recognition quality depends on the browser and microphone. The app does not send counters or audio to an application server.

## Deployment

Pushes to `main` build the app and deploy it through the included GitHub Pages workflow. Configure GitHub Pages to use GitHub Actions in the repository settings.
