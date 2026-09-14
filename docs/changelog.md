---
layout: page
title: Changelog
permalink: /changelog/
---

# Release History

## [0.9.0] - Current Release
- Fixed: changed the workflow to first write the changelog and then create the release zip. Upgraded to version 0.8.5.
- Fixed: the changelog will now first show added features and then the fixed issues.
- Merge pull request #6 from jaroet/jr/zondag120926
- Simplified the history logic to behave in one state instead of two.
- removed the encryption feature as it is not implemented currently.
- removed unused and leftover files and references.
- updated versions to 0.8.2 in general and removed frontmatter js file that was not really implemented.

## [0.9.1] - Current Release
- Added: the versionnumber is now upgraded during the build release step. So the release and versionnumber are always in sync.
- Merge pull request #7 from jaroet:jr/20260924
- docs: update changelog for v0.9.0
- updated context

<!-- LATEST_RELEASE_MARKER -->

## [0.8.2] - Previous Release
### Maintenance
- Removed a leftover script reference to the not-yet-implemented FrontmatterDisplay component.
- Version bumped to 0.8.2 across the project, matching the latest released version.

## [0.8.1] - Previous Release
### Maintenance
- General code quality and stability improvements.

## [0.8.0] - Previous Release
### Maintenance
- General code quality and stability improvements.


## [0.7.3] - Previous Release
### Maintenance
- Added: an automated website update when release is created. 
- Added: a context.md to bring the AI uptodate with the current status of the project. 
- Updated: the readme.md is now giving a full explanation of the app. 
- Fixed: the presentation of favorites on Windows 11 was not correct. 

## [0.7.2] - Previous Release
### Maintenance
- Version bump and general improvements.

## [0.7.1] - Previous Release
### Added
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
