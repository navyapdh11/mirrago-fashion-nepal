# Mirrago Fashion Nepal - Setup & Deployment Guide

AI-powered multi-warehouse e-commerce platform for the Nepalese market.

## 🚀 Quick Start

### Prerequisites

**Backend (Laravel):**
- PHP 8.2+
- Composer
- SQLite or MySQL

**Frontend (Next.js):**
- Node.js 18+
- npm or yarn

### Local Setup

#### 1. Backend Setup

```bash
# Navigate to project root
cd /data/data/com.termux/files/home/app

# Install PHP dependencies
composer install

# Configure environment
cp .env.example .env
php artisan key:generate

# Run migrations
php artisan migrate

# Seed database with sample data
php artisan db:seed

# Start Laravel development server
php artisan serve --host=127.0.0.1 --port=8080
```

#### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Configure environment
cp .env.local.example .env.local

# Update API URL in .env.local
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8080/api

# Start Next.js development server
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://127.0.0.1:8080/api

## 📦 Deployment

### Vercel Deployment (Frontend)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set Environment Variables:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL=https://your-api-url.com/api`

4. **Rebuild:**
   ```bash
   vercel --prod
   ```

### Vercel Deployment (Backend - Laravel)

The backend is configured for Vercel deployment using `vercel-php`.

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables in Vercel:**
   - `APP_KEY` - Generate with `php artisan key:generate --show`
   - `DB_CONNECTION` - sqlite
   - `DB_DATABASE` - /tmp/database.sqlite
   - `ESEWA_MERCHANT_ID` - Your eSewa merchant ID
   - `ESEWA_SECRET_KEY` - Your eSewa secret key
   - `KHALTI_PUBLIC_KEY` - Your Khalti public key
   - `KHALTI_SECRET_KEY` - Your Khalti secret key
   - `MIRRAGO_API_KEY` - Your Mirrago API key

## 🔧 Configuration

### Payment Gateways

**eSewa:**
- Update `.env` with your eSewa credentials
- Test mode: `https://rc-epay.esewa.com.np`
- Production: `https://epay.esewa.com.np`

**Khalti:**
- Update `.env` with your Khalti credentials
- Test mode: `https://a.khalti.com`
- Production: Same URL with live keys

### AI Features (Mirrago)

- Sign up at [Mirrago](https://mirrago.com)
- Get API key and update `.env`
- Configure webhook URL for real-time updates

## 📊 Features

### Frontend
- ✅ Product catalog with search & filtering
- ✅ Product details with AI recommendations
- ✅ Virtual Try-On (Mirrago AI)
- ✅ Shopping cart with persistent storage
- ✅ Checkout with shipping validation
- ✅ Order tracking & confirmation
- ✅ User profile & order history
- ✅ Analytics dashboard
- ✅ Responsive design (mobile-first)

### Backend
- ✅ RESTful API (Laravel Sanctum auth)
- ✅ Product & inventory management
- ✅ Order processing & tracking
- ✅ Payment integration (eSewa & Khalti)
- ✅ Payment failover mechanism
- ✅ AI recommendation engine
- ✅ Virtual try-on integration
- ✅ Analytics & reporting
- ✅ Multi-warehouse inventory

## 🧪 Testing

```bash
# Backend tests
cd /data/data/com.termux/files/home/app
php artisan test

# Frontend tests
cd frontend
npm test
```

## 📁 Project Structure

```
app/
├── app/                    # Laravel application
│   ├── Http/Controllers/Api/  # API controllers
│   ├── Models/                # Eloquent models
│   └── Services/              # Domain services
├── database/
│   ├── migrations/            # Database migrations
│   └── seeders/               # Database seeders
├── frontend/               # Next.js frontend
│   ├── app/                   # App router pages
│   ├── components/            # React components
│   ├── context/               # React contexts (Auth, Cart)
│   └── lib/                   # Utilities & API client
└── public/                 # Public assets
```

## 🔐 Security

- Change all default API keys before production
- Enable HTTPS in production
- Configure CORS properly
- Use environment variables for sensitive data
- Enable rate limiting on API endpoints

## 📝 API Documentation

### Public Endpoints
- `GET /api/products` - List products
- `GET /api/products/{slug}` - Product details
- `GET /api/products/trending` - Trending products
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Authenticated Endpoints
- `POST /api/orders` - Create order
- `GET /api/orders` - User orders
- `GET /api/orders/{id}` - Order details
- `GET /api/user/recommendations` - AI recommendations
- `POST /api/mirrago/try-on/{slug}` - Virtual try-on

## 🤝 Support

For issues or questions:
- Create an issue on GitHub
- Check API documentation
- Review environment variables in `.env.example`

## 📄 License

MIT License
