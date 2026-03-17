# PKM Outliner

**PKM Outliner** is a personal knowledge management (PKM) tool designed for thinkers, writers, and developers who prefer an outliner-style workflow. It helps you structure your thoughts, connect ideas, and navigate your knowledge base with speed and efficiency.

The application is built on a "Central Note" concept, allowing you to visualize and interact with its relationships—seeing parent notes (Uppers) and child notes (Downers) at a glance. This provides a powerful way to build and explore your personal wiki.

## Core Concepts

*   **Central Note**: The note currently in focus.
*   **Uppers (Parents)**: Notes that link *to* the central note.
*   **Downers (Children)**: Notes that the central note links *to*.
*   **Content**: The Markdown content of the central note.

## Features

*   **Outliner-Based Navigation**: Fluidly move between parent, central, and child notes.
*   **Full Markdown Editor**: Write and format your notes using Markdown.
*   **Bi-Directional Linking**: Create connections between notes using `[[WikiLink]]` syntax with auto-completion.
*   **Mentions**: See a list of all notes that link to your current note, providing valuable context.
*   **Full-Text Search**: Search through the content of all your notes.
*   **Daily Journaling**: Jump to a daily journal note with a single shortcut (`Ctrl+J`).
*   **Multiple Vaults**: Keep different projects or areas of your life in separate, isolated databases.
*   **Customizable Themes**: Switch between light/dark mode and choose from themes like Dracula, Nord, and Solarized.
*   **Data Portability**: Import and export your entire vault as a JSON file.
*   **Keyboard-First Design**: A comprehensive set of keyboard shortcuts for navigation, editing, and organization.
*   **Manual Sorting**: Reorder child notes to structure your outlines precisely.
*   **Local File Linking**: Use aliases to create short, manageable links to local files on your machine.

## Getting Started

1.  **Open `index.html`**: Open the `index.html` file in your web browser to start the application.
2.  **Create Your First Note**: Begin typing in the editor to create your first note.
3.  **Link to a New Note**: Type `[[New Note]]` and then click the link to create and navigate to "New Note".
4.  **Explore with Keyboard Shortcuts**: Use the arrow keys to navigate and `Shift+Enter` to toggle edit mode. (See all shortcuts below).

## Keyboard Shortcuts

### Navigation
| Key | Action |
| :--- | :--- |
| `Arrow Up` / `Arrow Down` | Navigate through the note list. |
| `Arrow Left` / `Arrow Right` | Navigate between parent, center, and child notes. |
| `Alt` + `Arrow Left`/`Right`| Go back/forward in history. |
| `Space` / `Enter` | Open or center the selected note. |
| `Tab` | Switch focus between the navigation and content panes. |

### Editing & Organization
| Key | Action |
| :--- | :--- |
| `Shift` + `Enter` | Toggle Edit Mode. |
| `[[` | Trigger auto-complete for linking. |
| `F2` | Rename the current note. |
| `Ctrl` + `Up`/`Down` | Link selected notes as Parents/Children. |
| `Backspace` | Unlink selected notes. |
| `Ctrl` + `Backspace` | Delete selected notes. |

### Tools
| Key | Action |
| :--- | :--- |
| `/` | Quick Search by title. |
| `Ctrl` + `Shift` + `F` | Search by content. |
| `Ctrl` + `J` | Go to Today's Journal. |

## Recent Updates (v0.7.2)

This version includes general maintenance and stability improvements. Recent feature additions include the **Mentions** view to see all backlinks to a note and context highlighting when navigating from a mention.

---
*This README was generated based on the project's documentation.*
