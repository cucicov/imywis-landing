# Public Changelog

This changelog tracks public releases and delivered changes.

## Versioning Rules
- Version format: `MAJOR.MINOR.PATCH` (Semantic Versioning)
- `MAJOR`: breaking changes
- `MINOR`: new backward-compatible features
- `PATCH`: backward-compatible fixes

---
## [1.1.0] - 2026-04-19
### Summary
- Added signin/signup functionality.

### Added
- New login/signup page.
- Autosave option: OFF by default. Saves user project automatically each minute.
- Images can be uploaded from local machine. Drag and drop an image on the Image Node.

### Changed
- Now users will have to sign up with their email address before publishing. The publishing happens at the user custom url, not at /test anymore. The user custom user for now is the email handle used for the singup.

### Fixed
- User handle sanitization → remove any non alphanumeric characters from the user email handle.
- Fixed nodes disappearing when adding an event and a page node subsequently.

### Removed


### Security
- Users publishing dont interfere with each other. 

### Notes
- User handles are not configurable for the time being.

---
## [1.1.1] - 2026-04-23
### Summary
- Added fullscreen mode on Background Node.

### Added
- Now the Background Node can be set to fullscreen mode. Works like a cover for the whole size of the target page node.

### Changed

### Fixed

### Removed

### Security

### Notes

---
## [1.2.0] - 2026-04-23
### Summary
- New fonts available in the Text node. Minor bug fixes.

### Added
- New fonts in the Text node: Arimo-Regular, ChangaOne-Regular, HomeVideo-Regular, LiberationMono-Regular, PixelatedElegance, RasterForge, Tinos-Regular, Arvo-Regular, Comic-sans, Inter, Orbitron-Regular, PressStart2P-Regular, Roboto, VT323-Regular.

### Changed

### Fixed
- Bug with background node not scaling properly.
- Bug with event node click event not working properly in certain cases.

### Removed

### Security

### Notes
