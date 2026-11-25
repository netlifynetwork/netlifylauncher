# Netlify MC

A Windows-first Minecraft Java launcher desktop app with a dark purple/pink interface inspired by the supplied SKlauncher screenshots.

## Windows build
The GitHub Actions workflow builds only Windows x64 and uploads:
- Netlify MC Setup 0.1.0.exe (installer)
- Netlify MC 0.1.0.exe (portable build)

Open the repository's Actions tab, select **Build Netlify MC (Windows)**, and download the **Netlify-MC-Windows** artifact from a successful run.

## Run from source
1. Install Node.js 20 or newer.
2. Clone this repository.
3. Run `npm install`.
4. Run `npm start`.

## Current implementation status
The Electron desktop shell, home dashboard, settings UI and Modrinth discovery/search interface are included. Actual Microsoft account authentication, Minecraft version installation, instance management and launching a game are not yet implemented.

Use a legitimate Minecraft account and game license. This launcher does not bypass ownership checks.
