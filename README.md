# ElysStay - Frontend

Next.js 16 + React 19 frontend for the ElysStay rental management system.

## Prerequisites

- Node.js 18+
- npm
- Backend API running (default: `http://localhost:5027`)
- Keycloak running (default: `http://localhost:8080`)

## Environment Variables

Create `.env.local` in this folder with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5027/api/v1
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=elysstay
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=elysstay-fe
```

Notes:
- In development, sensible localhost defaults are applied if variables are missing.
- In non-development builds, these variables are required and the app fails fast if missing.

## Run Locally

```bash
npm install
npm run dev
```

App URL:
- `http://localhost:3000`

## Build

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

## Project Structure

- `src/app/` - App Router pages and layouts
- `src/components/` - Reusable UI and page components
- `src/lib/` - API client and query modules
- `src/providers/` - Auth and React Query providers
- `src/types/` - Shared TypeScript types

## Related Repo

Backend repo lives at sibling path:
- `../ElysStay-be`

From backend root, you can start the full stack with:

```powershell
.\dev-tools\dev.bat
```
