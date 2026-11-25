# Netlify MC

A Windows-first Minecraft Java launcher desktop app with a dark purple/pink interface inspired by the supplied SKlauncher screenshots.

## Windows downloads
The GitHub Releases page publishes direct .exe assets. Use **Netlify MC Setup** for automatic in-app updates. The portable EXE is available for running without installation, but automatic replacement updates are supported by the installed NSIS build.

## Automatic in-app updates
- The installed launcher checks GitHub Releases shortly after startup and periodically while open.
- When a new release is available, an in-app notification offers **Update now** or **Later (30 min)**.
- Choosing Update now downloads the update inside the app and shows download progress.
- When the download finishes, choose **Restart and install**. If you choose Later, the update installs when you next close the launcher.
- The Windows workflow versions each build and publishes the EXE files plus latest.yml update metadata.

## Run from source
1. Install Node.js 20 or newer.
2. Clone this repository.
3. Run `npm install`.
4. Run `npm start`.

## Current implementation status
The Electron desktop shell, home dashboard, settings UI and Modrinth discovery/search interface are included. The update mechanism is implemented for installed Windows builds. Actual Microsoft account authentication, Minecraft version installation, instance management and launching a game are not yet implemented.

Use a legitimate Minecraft account and game license. This launcher does not bypass ownership checks.
