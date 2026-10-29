# Unsplash-inspired Photo Gallery (local learning project)

React + Vite frontend, Express backend, real Unsplash API results, search, categories, pagination, preview and tracked JPG download.

## Setup (Node.js 20+)

1. Get an Unsplash Access Key at https://unsplash.com/developers
2. Copy `server/.env.example` to `server/.env` and enter your key (do not commit it).
3. Open terminal A: `cd server && npm install && npm run dev`
4. Open terminal B: `cd client && npm install && npm run dev`
5. Visit http://localhost:5173

The Vite dev server proxies `/api` to Express on port 5000. Search requires no authentication from the frontend.

## Endpoints

- `GET /api/photos?query=mountains&page=1&order_by=relevant&orientation=landscape`
- `GET /api/photos/:id/download`

### Important

This is for local UI study and is not an official Unsplash product. Unsplash's API rules prohibit publishing applications that reproduce Unsplash's core user experience. You must use the returned photo URLs and photographer attribution; this project includes these and calls `download_location` before streaming a JPG. Do not use the Unsplash name/logo as your public app branding. The image in the hero is a visual-only static Unsplash CDN URL for the layout study. For deployment replace that static example with an API-returned URL and add appropriate creator attribution.

### Known limits

- Demo API rate limit: 50 requests/hour. A one-minute server response cache limits repeated requests.
- Home feed pagination assumes another page when a full page was received.
- Favorites are temporary React state, not saved after refresh.
