# Penny Pilot — Client

React + Vite frontend for Penny Pilot. See the [root README](../README.md) for the full project overview.

## Scripts

```bash
npm run dev       # start the Vite dev server
npm run build     # production build
npm run preview   # preview the production build locally
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID (used for "Sign in with Google")
- `VITE_API_URL` — base URL of the backend API (defaults to `http://localhost:3001/api`)

## Structure

```
src/
  api/          axios client with token refresh interceptors
  components/   shared UI, grouped by feature (dashboard/, expense/, income/, ...)
  context/      auth + theme providers
  pages/        route-level views
  utils/        date/month key helpers
```
