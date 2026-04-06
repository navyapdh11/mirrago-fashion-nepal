# Mirrago Fashion Nepal - Frontend

Next.js 13 frontend for Nepal's AI-powered fashion e-commerce platform.

## Tech Stack

- **Framework:** Next.js 13.5 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **API:** Laravel Backend (port 8080)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Homepage
│   ├── globals.css         # Global styles
│   ├── products/
│   │   ├── page.tsx        # Product catalog
│   │   └── [slug]/page.tsx # Product detail
│   ├── cart/page.tsx       # Shopping cart
│   └── checkout/page.tsx   # Checkout
├── components/
│   ├── Header.tsx          # Navigation header
│   ├── Footer.tsx          # Site footer
│   ├── ProductCard.tsx     # Product card component
│   └── ProductGrid.tsx     # Product grid
├── lib/
│   └── api.ts              # API client for Laravel backend
├── types/
│   └── index.ts            # TypeScript type definitions
└── public/                 # Static assets
```

## API Integration

The frontend connects to the Laravel backend at `http://127.0.0.1:8080/api`.

Configure in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080/api
```

## Design System

Colors are Nepal-themed:
- **Red:** `#DC143C` (Crimson)
- **Blue:** `#003893` (Nepal Blue)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with hero, features, product grid |
| `/products` | Product catalog with filtering |
| `/products/[slug]` | Product detail page |
| `/cart` | Shopping cart |
| `/checkout` | Checkout with payment selection |

---

Built with ❤️ in Nepal 🇳🇵
