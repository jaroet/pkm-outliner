# Project Context & Agent Guidelines: PKM Outliner

This file provides persistent context and guidelines for AI assistants to understand the project's goals, architecture, and workflow rules across all chat sessions.

## 1. Project Goal

The project is a **client-side Personal Knowledge Management (PKM) outliner**. It is designed as a fast, keyboard-driven tool for structuring thoughts, daily journaling, and building a personal wiki. The core workflow is centered around a "Central Note" and its parent/child and mentions relationships. It is strictly local-first and installable without any server or external dependencies.

## 2. Core Technologies

* **Frontend:** Vanilla JavaScript (ES6+), using the `htm` library (JSX-like tagged templates) with React 18 (`react.production.min.js`, `react-dom.production.min.js`). No build or compile step (Babel/Webpack/Vite) is used.
* **Database:** **IndexedDB** is the sole storage mechanism, managed via `Dexie.js`. All data remains local to the user's browser. Database operations are modularized in `js/services/db/`:
  * `core.js`: Database initialization, vault switching/creation, migrations, persistent storage requests.
  * `notes.js`: CRUD operations for notes, topology (parent/child relationships), favorites.
  * `search.js`: Full-text content search and title prefix matching.
  * `themes.js`: Theme preset management and custom theme persistence.
  * `prefs.js`: User preferences (font size, split ratios, attachment aliases).
  * `import.js`: Vault import and conflict resolution logic.
* **Dependencies:** Pre-bundled in `js/libs/` (`react`, `react-dom`, `dexie.min.js`, `marked.min.js`, `htm.umd.js`, `tailwindcss.js`).
* **Code Structure:**
  * `index.html`: Entry point. Scripts are loaded in strict order (dependencies -> globals -> services -> hooks -> components -> App.js).
  * `js/globals.js`: Defines `window.Jaroet`, binds `window.html = htm.bind(React.createElement)`, holds `APP_VERSION`.
  * `js/components/`: UI components (modals, bars, cards), with subdirectories `app/` (pane, handle, favorites) and `settings/` (tab components).
  * `js/hooks/`: Reusable hooks (`useAutoSave.js`, `useClickOutside.js`, `useHistory.js`, `useListNavigation.js`, `useSplitPane.js`).
  * `js/services/`: Markdown rendering (`markdown.js`), date/journal calculations (`journal.js`), and database modules (`db/`).
  * `js/App.js`: Root application coordinator.

## 3. Deployment & Runtime

* **Target Platform:** Runs locally in any modern browser on any OS using IndexedDB and standard Web APIs.
* **No Build Step:** All JavaScript is executed directly by the browser. Any new `.js` file must be placed under `js/` and referenced in `index.html` in proper dependency order.

## 4. Current Version

* **Active Version:** **0.9.2**.
* **Version Management:** Version numbers are synchronized automatically during releases across `js/globals.js` (`APP_VERSION`) and `index.html` cache-busting query strings (`?v=...`).

## 5. Releasing a New Version

Releases are fully automated via GitHub Actions (`.github/workflows/release.yml`):

1. **Always merge to `main` first:** Do not tag working branches directly. Merge feature/fix branches into `main` before creating the release tag.
2. **Push the tag:** Tag `main` with a semantic version tag (e.g. `v0.9.3`) and push it:
   ```bash
   git checkout main
   git pull origin main
   git tag v0.9.3
   git push origin v0.9.3
   ```
3. **Automated workflow tasks:**
   * Gathers commits between tags (excluding automated version bump commits).
   * Inserts the new release at the top of `docs/changelog.md` below `<!-- LATEST_RELEASE_MARKER -->` as `Current Release`, marking previous entries as `Previous Release`.
   * Automatically bumps `APP_VERSION` in `js/globals.js` and `?v=` in `index.html`.
   * Commits the updated changelog and version numbers back to `main`.
   * Packages the release zip (excluding git, dev scripts, and agent docs).
   * Creates the GitHub Release with the changelog commit points shown directly in the release body.

## 6. Instructions for AI Assistants

* **Respect Architecture:** Keep everything strictly client-side. Do not introduce server dependencies, Node.js packages, npm scripts, or build toolchains.
* **Preserve Functionality:** Keep changes modular and adhere to the established namespaces under `window.Jaroet`.
* **Communication Style:** The user is an end user / power user rather than a software engineer. Explain changes in clear, accessible language, avoiding excessive technical jargon while remaining precise.
* **Tone:** Professional, direct, and constructive.
