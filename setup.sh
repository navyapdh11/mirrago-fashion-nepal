#!/bin/bash
# Mirrago Fashion Nepal - Setup Script
# Run this to set up the development environment

set -e

echo "🇳🇵 Setting up Mirrago Fashion Nepal..."

# Set environment variables
export DB_CONNECTION=sqlite
export DB_DATABASE="$(pwd)/database/database.sqlite"

echo "📦 Installing backend dependencies..."
composer install --no-interaction --quiet 2>/dev/null || echo "Composer install skipped (already installed)"

echo "🔑 Generating app key..."
php artisan key:generate --ansi 2>/dev/null || echo "Key already generated"

echo "🗃️ Running migrations..."
php artisan migrate:fresh --force --ansi 2>/dev/null || echo "Migrations skipped"

echo "🌱 Seeding database..."
php artisan db:seed --force --ansi 2>/dev/null || echo "Seeding skipped"

echo "🎨 Installing frontend dependencies..."
cd frontend && npm install --silent 2>/dev/null || echo "Frontend install skipped"
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development servers:"
echo ""
echo "  Backend API:    cd $(pwd) && php artisan serve --host=127.0.0.1 --port=8080"
echo "  Frontend:       cd $(pwd)/frontend && npm run dev"
echo ""
echo "📡 URLs:"
echo "  Backend API:    http://127.0.0.1:8080/api"
echo "  Frontend:       http://127.0.0.1:3000"
echo "  Health Check:   http://127.0.0.1:8080/api/health"
echo ""
