# Mirrago Fashion Nepal

AI-powered multi-warehouse e-commerce platform for the Nepalese market.

## Features

- **AI Virtual Try-On** - Mirrago integration for virtual clothing try-on
- **AI Recommendations** - "Frequently Bought Together", "Shop the Look", personalized suggestions
- **Multi-Warehouse Inventory** - Stock management across 5 warehouses in Nepal
- **Nepali Payment Gateways** - eSewa & Khalti with automatic failover
- **Real-time Stock Sync** - WebSocket broadcasting via Pusher
- **API Authentication** - Laravel Sanctum token-based auth

## Requirements

- PHP 8.2+
- Composer
- SQLite or MySQL

## Quick Start

```bash
# Install dependencies
composer install

# Configure environment
cp .env.example .env
php artisan key:generate

# Run migrations and seed
php artisan migrate:fresh --seed

# Start development server
php artisan serve
```

## API Endpoints

### Public
- `GET /api/products` - List all products
- `GET /api/products/{slug}` - Product details
- `GET /api/products/trending` - Trending products
- `GET /api/inventory/warehouses` - List warehouses
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Authenticated (Bearer Token)
- `POST /api/orders` - Create order
- `GET /api/orders` - List user orders
- `POST /api/payments/initiate` - Initiate payment
- `GET /api/user/recommendations` - Personalized recommendations
- `POST /api/mirrago/try-on/{slug}` - AI virtual try-on

## Architecture

```
app/
├── Models/          # 10 Eloquent models
├── Services/        # 5 domain services
│   └── PaymentGateways/  # eSewa, Khalti, Failover
├── Http/Controllers/Api/  # 6 API controllers
└── Events/          # InventoryUpdated, LowStockAlert
```

## Configuration

| Service | Environment Variables |
|---------|----------------------|
| eSewa | `ESEWA_MERCHANT_ID`, `ESEWA_SECRET_KEY` |
| Khalti | `KHALTI_PUBLIC_KEY`, `KHALTI_SECRET_KEY` |
| Mirrago | `MIRRAGO_API_KEY`, `MIRRAGO_BASE_URL` |
| Pusher | `PUSHER_APP_ID`, `PUSHER_APP_KEY` |

## License

MIT
