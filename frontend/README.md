# Fundoo Notes — frontend

React 19 + TypeScript, built with Vite. Tailwind CSS v4, shadcn/ui (Radix), Motion, Redux Toolkit, React Router.

## Run it

The frontend talks to the Django API in `../config`. For a full local setup run all three:

```bash
# 1. API (port 8000)
cd ../config && ../venv/Scripts/python.exe manage.py runserver 8000

# 2. Email worker — sign-in and sign-up codes are sent by Celery (Redis on :6379)
cd ../config && ../venv/Scripts/celery.exe -A config worker --pool=solo -l info

# 3. Frontend (port 3000)
npm install
npm run dev
```

In development Vite proxies `/api`, `/notes/api` and `/labels/api` to `http://localhost:8000`.
For a production build set `VITE_API_BASE_URL` (see `.env`).

## Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Dev server on http://localhost:3000       |
| `npm run build`     | Type-check and build to `dist/`           |
| `npm run preview`   | Serve the production build                |
| `npm test`          | Run the Vitest suite once                 |
| `npm run lint`      | ESLint with zero warnings allowed         |
| `npm run typecheck` | `tsc --noEmit`                            |

## Layout

- `src/app` — routes, Redux store, auth hooks
- `src/shell` — signed-in layout: sidebar, top bar, invitations
- `src/features/*` — landing, auth, notes, labels, profile
- `src/components/ui` — shadcn/ui primitives and the halftone wordmark footer
- `src/index.css` — design tokens for the dark ("night") and light ("paper") themes
