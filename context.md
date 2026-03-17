# Project Context: PKM Outliner

This file provides a persistent context for AI assistants to understand the project's goals and technical details across different chat sessions.

## 1. Project Goal

The project is a **client-side Personal Knowledge Management (PKM) outliner**. It's designed as a fast, keyboard-driven tool for structuring thoughts and building a personal wiki. The core workflow is centered around a "Central Note" and its parent/child and mentions relationships. It needs to be 'installable' without any dependencies.  

## 2. Core Technologies

*   **Frontend:** Vanilla JavaScript (ES6+), using the `htm` library for a React-like component structure.
*   **Database:** **IndexedDB** is the sole storage mechanism, managed via the `Dexie.js` library. All user data is stored locally in the browser. The application logic for this is primarily in `js/services/db.js`.
*   **Dependencies:** Key libraries are pre-included in `js/libs/`, such as `react`, `react-dom`, `marked.js`, and `dexie.min.js`.
*   **Structure:** This is a single-page application (SPA) with `index.html` as the entry point. The main application logic resides in `js/App.js`.

## 3. Deployment

*   **Target Platform:** The application is intended to be used locally on any computer (OS independant) using a browser and indexedDB. 
*   **Build Process:** Since it's a vanilla JS project, there is no complex build step required for deployment. The files can be deployed as is.

## 4. Current Development Focus

*   **Local-First:** The current priority is local development and testing.
*   **Security Feature:** A key feature under consideration is adding **client-side encryption** to the JSON import/export functionality. The proposed method is to use the browser's native `Web Crypto API` (AES-GCM) to encrypt the data with a user-provided password.

## Instructions for AI Assistant

*   Before providing assistance, review this file to understand the project's architecture and goals.
*   Recognize that this is a **client-side only** application. There is no backend server component.
*   When suggesting changes, respect the existing technology stack (vanilla JS, htm, Dexie.js).
*   Keep the communication simple and as clear as possible without leaving things out for clarity/simplicity. A little bit of technical language, if really needed, is not a problem. But I am not a developer. 
*   Keep a professional tone. 
