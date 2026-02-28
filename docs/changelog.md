# Changelog

## [0.7.0] - Current Release
### Added
- **Documentation**: Added comprehensive `documentation.md` covering core concepts and hotkeys.
- **Changelog**: Added `changelog.md` to track project history.
- **Version Bump**: Updated application version to 0.7.0 across all files.
- **Mentions**: Added a "Mentions" button in the top bar to show all notes linking to the current note.
- **Context Highlighting**: Navigating from the Mentions list highlights the reference in the target note.
- **Content Search**: Added a clear button to the search input field.

### Maintenance
- Updated dependency references to ensure cache consistency.
- **Code Quality**: Extensive refactoring of variable names and state management for better readability and maintenance.

---

## [0.6.0] - Previous Release
### Features
- **Content Search**: Added `Ctrl+Shift+F` modal to search within note content, with snippet highlighting.
- **Manual Sorting**: Added ability to reorder child notes using `Ctrl+Shift+Up/Down`.
- **Attachment Aliases**: Added settings to map short aliases to long file paths for local file linking.
- **Theme System**: Introduced a robust theming engine with multiple presets (Dracula, Nord, Solarized, etc.).
- **Vault Management**: Added support for multiple isolated vaults (databases).
- **Split View**: Added a resizable divider between the navigation list and the content pane.
- **Persistent Storage**: Added logic to request persistent storage permission from the browser to prevent data eviction.

### Improvements
- **Editor**: Enhanced autocomplete for `[[wiki-links]]` with caret positioning.
- **Navigation**: Improved keyboard navigation between sections and history.
- **Database**: Optimized database schema (v6) to support custom sorting orders.

---

## [Early Versions]
### v0.5.0
- Added "Related" links migration to `outgoingLinks`.
- Improved WikiLink parsing.

### v0.4.0
- Added `outgoingLinks` index to database for better backlink tracking.

### v0.1.0 - v0.3.0
- Initial release of the Outliner concept.
- Basic CRUD operations.
- Implementation of "Up/Center/Down" topology.