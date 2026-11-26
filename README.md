# Netlify MC

A Windows-first Minecraft Java launcher desktop app with a crimson-and-obsidian interface.

## Windows downloads
The GitHub Releases page publishes direct Windows `.exe` assets. Use **Netlify MC Setup** for automatic in-app updates. The portable EXE is available for running without installation; automatic replacement updates are supported by the installed NSIS build.

## Minecraft Java launcher engine
- Microsoft account sign-in through the MSMC authentication library.
- Checks the signed-in profile's Minecraft Java entitlement; no ownership bypass.
- Retrieves the official Mojang version manifest (releases and snapshots).
- Creates persistent instance records under the app's user data directory.
- Downloads the selected official Vanilla version on first launch and starts the game through Minecraft Launcher Core.
- Encrypts the saved Microsoft session using Electron safeStorage when Windows encryption is available.
- Displays download/launch status and game exit notifications.

**Requirements and current limitations:** This first game-engine milestone requires a compatible 64-bit Java runtime installed on Windows and available on PATH. The Java Manager page links to Adoptium. Automatic Java runtime provisioning is not yet implemented. Vanilla is the only loader currently wired to the launch engine; Fabric, Forge, NeoForge and Quilt can be selected in the creation UI but are not installed/launched yet. Microsoft authentication, game downloads, and first launch require an internet connection and a valid Minecraft Java entitlement.

## Current UI
- Crimson-to-scarlet brand accent with dark obsidian surfaces.
- Dashboard, Content Hub, Servers, Customization, Library, instance detail, New Instance dialog, and Settings.
- Modrinth live search and filters.
- Interactive navigation, filters, dialogs, persistent instance cards, and Windows title-bar controls.

## Not yet implemented
Mod-loader installers, Modrinth content installation into instances, persistent playtime tracking, server directory integration, world/file management, skin editing, and automatic Java runtime provisioning are not implemented yet. Buttons for these features must not imply that the feature has already completed an operation.

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
