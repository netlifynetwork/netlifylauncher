# Netlify MC

A Windows-first Minecraft Java launcher desktop app with a crimson-and-obsidian interface.

## Windows downloads
The GitHub Releases page publishes direct Windows `.exe` assets. Use **Netlify MC Setup** for automatic in-app updates. The portable EXE is available for running without installation, but automatic replacement updates are supported by the installed NSIS build.

## Current UI
- Crimson-to-scarlet brand accent with dark obsidian surfaces.
- Dashboard, Content Hub, Servers, Customization, Library, instance detail, New Instance dialog, and Settings.
- Modrinth live search and filters.
- Interactive navigation, filters, sorting controls, dialogs, session-only instance cards, and Windows title-bar controls.
- Installed Windows build update notification with user-controlled download and restart.

## Important implementation status
This repository currently contains the launcher interface and a working Modrinth discovery/search view. Creating an instance currently adds it to the in-memory UI for the current session only; it does **not** download Minecraft or create a persistent game installation. Microsoft account sign-in, Minecraft asset/runtime installation, persistent instance storage, game launching, actual server directory integration, and full skin editing are not implemented yet. Some buttons therefore explain that their underlying integration is not connected rather than pretending an operation succeeded.

Use a legitimate Minecraft account and game license. This launcher does not bypass ownership checks.

## Automatic in-app updates
- The installed launcher checks GitHub Releases shortly after startup and periodically while open.
- When a new release is available, an in-app notification offers **Update now** or **Later (30 min)**.
- Choosing Update now downloads the update inside the app and shows progress.
- When the download finishes, choose **Restart and install**.
- The Windows workflow publishes EXE files plus `latest.yml` update metadata and blockmaps when the build succeeds. Differential download depends on a compatible blockmap being available.

## Run from source
1. Install Node.js 20 or newer.
2. Clone this repository.
3. Run `npm install`.
4. Run `npm start`.
