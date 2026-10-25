# חאגאי

A one-page, mobile-first joke site: tap "חאגאי" and collect yellow cards. No server; state lives in `localStorage`.

## Develop

```sh
npm install
npm run dev -- --host   # open the printed Network URL on a phone on the same Wi-Fi
npm test                # vitest
npm run build           # type check + production build into dist/
```

The site is served from `/chagai-yellow-card/` (GitHub Pages), set by `base` in `vite.config.ts`. Change it if the repo name changes.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main` (or by hand from the Actions tab): `npm ci`, `npm test`, `npm run build`, then publishes `dist/` to GitHub Pages.

One-time setup:

1. The GitHub repo must be named `chagai`, or `base` in `vite.config.ts` must be changed to `/<repo-name>/`.
2. In the repo, Settings > Pages > Build and deployment > Source: **GitHub Actions**.

The site is then at `https://<user>.github.io/chagai-yellow-card/`. To check the production build locally: `npm run build && npx vite preview`, then open `http://localhost:4173/chagai-yellow-card/`.

## Sounds

Clips live in `public/sounds/` (24 kHz mono WAV, decoded with Web Audio on the first tap). Mute is saved in `localStorage` under `chagai:muted`.

| File | Used for | Source | Author | License |
|---|---|---|---|---|
| `whistle-short.wav` | every yellow, giant yellow | Cut from [218318 referee whistle blow, gymnasium](https://commons.wikimedia.org/wiki/File:218318_splicesound_referee-whistle-blow-gymnasium.wav) (originally [Freesound #218318](https://freesound.org/people/SpliceSound/sounds/218318/)) | SpliceSound | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `whistle-long.wav` | red card | Same recording, the steady part of the blow stretched to ~1.2 s | SpliceSound | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `crowd-ooh.wav` | red card | Synthesized for this project by `scripts/make-sounds.mjs` (no CC0 crowd "ooh" recording was found) | this project | self-generated, no third-party rights |

To rebuild them, download the source WAV from the Commons page above and run `node scripts/make-sounds.mjs <that file>`.
