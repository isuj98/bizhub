<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c0d41f6d-4ac8-4d94-a55f-e010a3bfa38a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Electron (desktop) & installers

The app runs in the **browser** with `npm run dev` and also as a **desktop app** via Electron, with installers for Windows and Mac.

- **Web (unchanged):** `npm run dev` → open http://localhost:3000
- **Desktop dev (Vite + Electron):** `npm run electron:dev` → opens the app in an Electron window with hot reload
- **Build installers:**
  - **Windows:** `npm run electron:build:win` → `release/` gets **Business Hub-Setup-1.0.0.exe** (installer) and a portable exe
  - **Mac:** `npm run electron:build:mac` → `release/` gets **Business Hub-1.0.0.dmg** and a zip (run on macOS only)

The same Vite build is used for web and desktop; `base: './'` in Vite keeps both working.
