# Vibe Next.js Export

This directory is a standalone Next.js App Router version of the Lovable/TanStack app.

## Run

```sh
npm install
npm run dev
```

The package uses `next@latest`, `react@latest`, and `react-dom@latest` so installation resolves the latest stable Next.js release available from npm.

## Notes

- The original Vite/TanStack app is unchanged.
- App Router pages live in `app/`.
- Local mock state is still stored in `localStorage`.
- Mock recommendation data is still in `lib/mockAi.ts`.
- Prompt analysis now runs through `POST /api/traits`, which calls the Gemini API with structured JSON output for trait scores, prompt constraints, and trait weights. Set `GEMINI_API_KEY` before running the app. Override the default model with `GEMINI_TRAIT_MODEL`, `GEMINI_CONSTRAINT_MODEL`, or `GEMINI_TRAIT_WEIGHT_MODEL` if needed.
