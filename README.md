# RST Store

RST Store is a university-focused e-commerce web app with:

- Frontend: single-page HTML/CSS/JS with UniPlanner-style UI/UX
- Backend: Node.js + Express API integration with Fake Store API

## Features

- Mandatory university categories and query mapping
- Secure backend-only API integration (no frontend direct external API credentials)
- Endpoints:
  - `GET /api/products?category=Engineering`
  - `GET /api/products?search=keyword`
  - `GET /api/featured`
  - `GET /api/categories`
- Smart behavior:
  - `search` overrides `category`
  - category-based fetching uses mapped query terms
  - fallback local dataset when Fake Store API fails
- Frontend:
  - Home with hero, category cards, featured rail
  - Product listing with category filters and search
  - Dynamic product modal
  - Slide-in cart with total in L.E
  - Profile page with grouped fake order history
  - Contact page with styled form
  - Loading skeletons, animated toasts, transitions, dark mode

## Environment Variables

Copy `.env.example` to `.env` and set (optional):

- `FAKE_STORE_API_BASE` (default: `https://fakestoreapi.com`)

Optional:

- `PORT` (default: 3000)
- `USD_TO_EGP` (default: `50`)
- `CACHE_TTL_MS` (default: `600000`)

## Run

```bash
npm install
npm start
```

Open:

- `http://localhost:3000`

## Notes

- If Fake Store API is unavailable, the app serves a category-aware fallback catalog automatically.
