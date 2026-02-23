# PKM Outliner Documentation

**PKM Outliner** is a personal knowledge management tool designed around an outliner workflow. It focuses on a "Central Note" and visualizes its relationships with parent notes (Uppers) and child notes (Downers), allowing for rapid navigation and structuring of thoughts.

## Core Concepts

*   **Central Note**: The note currently in focus.
*   **Uppers (Parents)**: Notes that link *to* the central note. Displayed at the top of the left pane.
*   **Downers (Children)**: Notes that the central note links *to*. Displayed at the bottom of the left pane.
*   **Content**: The Markdown content of the central note, displayed in the right pane.

## Interface

The interface is divided into two main columns:
1.  **Navigation Pane (Left)**: Contains the hierarchy (Parents -> Center -> Children). You can resize this pane by dragging the divider.
2.  **Content Pane (Right)**: Displays the full content of the active note.

## Keyboard Shortcuts

### Navigation
| Key | Action |
| :--- | :--- |
| `Arrow Up` / `Arrow Down` | Navigate through the note list in the current section. |
| `Arrow Left` | Navigate "Up" (to Parents) or back to Center from Children. |
| `Arrow Right` | Navigate "Down" (to Children) or to Center from Parents. |
| `Alt` + `Arrow Left` | Go Back in history. |
| `Alt` + `Arrow Right` | Go Forward in history. |
| `Space` | Open (navigate to) the currently selected note in the list. |
| `Enter` | Center the currently selected note. |
| `Tab` | Switch focus between the Navigation Pane and the Content Pane. |

### Editing & Content
| Key | Action |
| :--- | :--- |
| `Shift` + `Enter` | Toggle **Edit Mode** for the content pane. |
| `[[` | Trigger auto-complete for linking notes while editing. |
| `F2` | Rename the currently active or selected note. |

### Organization & Linking
| Key | Action |
| :--- | :--- |
| `x` | Toggle selection of a note (allows multi-select). |
| `Ctrl` + `Up` | Link the selected note(s) as a **Parent** of the central note. |
| `Ctrl` + `Down` | Link the selected note(s) as a **Child** of the central note. |
| `Backspace` | **Unlink** the selected note(s) from the central note. |
| `Ctrl` + `Backspace` | **Delete** the selected note(s). |
| `Ctrl` + `Shift` + `Up/Down` | **Reorder** child notes (only works in the "Down" section). |

### Search & Tools
| Key | Action |
| :--- | :--- |
| `/` | Focus the **Quick Search** bar (search by title). |
| `Ctrl` + `Shift` + `F` | Open **Content Search** (search inside notes). |
| `Ctrl` + `J` | Go to **Today's Journal** entry. |
| `Ctrl` + `Alt` + `R` | Go to a **Random Note**. |
| `Ctrl` + `Shift` + `H` | Go to the **Home Note**. |

## Features

### Journaling
The app includes a built-in daily journal. Press `Ctrl+J` or click the Calendar icon to jump to today's note. Journal notes are automatically organized by Year and Month.

### Themes
Switch between Light and Dark modes, or select specific themes (like Dracula, Nord, Solarized) via the Moon/Sun icon in the top bar.

### Multiple Vaults
You can create separate "Vaults" (databases) to keep different projects or areas of life completely isolated. Click the vault name in the bottom status bar to manage vaults.

### Import / Export
*   **Export**: Download your entire vault as a JSON file via the Download icon.
*   **Import**: Restore or merge data from a JSON file via the Upload icon.

### Attachment Aliases
In Settings, you can define "Aliases" for local file paths.
*   *Example*: Map `ds` to `/Users/Documents`.
*   *Usage*: Link to `[[ds:Report.pdf]]` in your note, and it will resolve to the full file path when clicked.