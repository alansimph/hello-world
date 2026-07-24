# AGENTS.md

## Cursor Cloud specific instructions

This is an Expo / React Native app ("Hairstyle Preview"). There is a single app; the
web target is the one that runs headlessly in the cloud VM.

### Running

- Web (use this in the cloud VM): `npm run web` (alias for `expo start --web`). It serves on
  http://localhost:8081 via the Metro bundler. First request triggers a bundle (a few seconds).
- `npm run ios` / `npm run android` require simulators/emulators that are not available in the
  cloud VM — do not rely on them here. `npm run start` opens the interactive Expo CLI (needs a TTY).
- Run long-lived dev servers in a tmux session so they survive across commands.

### Lint / test / build

- Typecheck (the only automated check in this repo): `npm run typecheck` (`tsc --noEmit`).
- There is no lint config and no unit test suite; typecheck + manual web testing is the verification path.

### Notes / gotchas

- `npm run web` prints an Expo "packages should be updated for best compatibility" warning listing
  version mismatches. This is expected and non-fatal — the app bundles and runs correctly.
- Native-only features (photo library save via `expo-media-library`, `expo-sharing`) fall back to a
  browser download / `window.alert` on web (see `Platform.OS === "web"` branches in `App.tsx`), so
  the web build is fully exercisable without native permissions.
- `scripts/generate_assets.py` regenerates the bundled hairstyle overlay PNGs using only the Python
  stdlib (no PIL required); the assets are committed, so you normally don't need to run it.
