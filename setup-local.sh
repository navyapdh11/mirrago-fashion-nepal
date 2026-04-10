#!/bin/bash

# Mirrago Fashion Nepal - Setup Script
# This script sets up the entire application for local development

set -e

echo "🚀 Setting up Mirrago Fashion Nepal..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}📦 Step 1: Setting up Backend (Laravel)${NC}"
echo "----------------------------------------"

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo -e "${RED}❌ PHP is not installed. Please install PHP 8.2+ first.${NC}"
    exit 1
fi

# Check PHP version
PHP_VERSION=$(php -r "echo PHP_VERSION;")
echo -e "${GREEN}✓ PHP version: $PHP_VERSION${NC}"

# Check if Composer is installed
if ! command -v composer &> /dev/null; then
    echo -e "${YELLOW}⚠️  Composer not found. Installing...${NC}"
    # Install Composer if not present
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    php composer-setup.php
    php -r "unlink('composer-setup.php');"
    mv composer.phar /usr/local/bin/composer
    echo -e "${GREEN}✓ Composer installed${NC}"
fi

# Install PHP dependencies
echo "Installing PHP dependencies..."
composer install --no-interaction --optimize-autoloader
echo -e "${GREEN}✓ PHP dependencies installed${NC}"

# Setup environment
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Generate app key
echo "Generating application key..."
php artisan key:generate
echo -e "${GREEN}✓ Application key generated${NC}"

# Create database directory if it doesn't exist
mkdir -p database
touch database/database.sqlite
echo -e "${GREEN}✓ SQLite database created${NC}"

# Run migrations
echo "Running database migrations..."
php artisan migrate --force
echo -e "${GREEN}✓ Migrations completed${NC}"

# Seed database
echo "Seeding database with sample data..."
php artisan db:seed --force
echo -e "${GREEN}✓ Database seeded${NC}"

# Create storage link
php artisan storage:link 2>/dev/null || true

echo ""
echo -e "${BLUE}📦 Step 2: Setting up Frontend (Next.js)${NC}"
echo "----------------------------------------"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"

# Navigate to frontend
cd frontend

# Install Node dependencies
echo "Installing Node dependencies..."
npm install
echo -e "${GREEN}✓ Node dependencies installed${NC}"

# Setup environment file
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
    else
        echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8080/api" > .env.local
    fi
    echo -e "${GREEN}✓ .env.local file created${NC}"
fi

# Build frontend
echo "Building frontend..."
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"

cd ..

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 To start the application:"
echo ""
echo "  ${YELLOW}Terminal 1 (Backend):${NC}"
echo "  cd $SCRIPT_DIR"
echo "  php artisan serve --host=127.0.0.1 --port=8080"
echo ""
echo "  ${YELLOW}Terminal 2 (Frontend):${NC}"
echo "  cd $SCRIPT_DIR/frontend"
echo "  npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access points:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://127.0.0.1:8080/api"
echo ""
echo "🔑 Default admin credentials (if seeded):"
echo "  - Email: admin@mirrago.com"
echo "  - Password: password123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 For more information, see README.md"
echo ""
