# Deployment Guide - Mirrago Fashion Nepal

## 🚀 Quick Deploy to Vercel

### Frontend Deployment

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy Frontend:**
   ```bash
   cd /data/data/com.termux/files/home/app/frontend
   vercel --prod
   ```

4. **Set Environment Variables:**
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   # Enter your backend API URL (e.g., https://your-backend.vercel.app/api)
   ```

5. **Redeploy with env:**
   ```bash
   vercel --prod
   ```

### Backend Deployment (Alternative Platforms)

Since Laravel requires PHP support, consider these options:

#### Option 1: Deploy to Railway.app

1. Create a Railway account at https://railway.app
2. Connect your GitHub repository
3. Add the following environment variables:
   - `APP_KEY` - Generate with `php artisan key:generate --show`
   - `DB_CONNECTION` - `sqlite`
   - `DB_DATABASE` - `/app/database/database.sqlite`
   - Payment gateway credentials
   - Mirrago API credentials

4. Deploy automatically on push to main

#### Option 2: Deploy to Render.com

1. Create account at https://render.com
2. Create a new Web Service
3. Connect your GitHub repo
4. Build command: `composer install && php artisan key:generate`
5. Start command: `php artisan serve --host=0.0.0.0 --port=$PORT`
6. Add environment variables

#### Option 3: Traditional VPS/Cloud

1. **Server Requirements:**
   - PHP 8.2+
   - SQLite or MySQL
   - Nginx/Apache
   - Composer

2. **Setup Steps:**
   ```bash
   # Clone repository
   git clone https://github.com/yourusername/mirrago-fashion-nepal.git
   cd mirrago-fashion-nepal

   # Install dependencies
   composer install --no-dev --optimize-autoloader

   # Setup environment
   cp .env.example .env
   php artisan key:generate

   # Configure database
   # Update .env with your database credentials

   # Run migrations
   php artisan migrate --force

   # Seed database (optional)
   php artisan db:seed --force

   # Optimize
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache

   # Setup Nginx/Apache to point to public/ directory
   ```

## 📋 Pre-Deployment Checklist

### Security
- [ ] Change `APP_KEY` in production
- [ ] Update all payment gateway credentials
- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set `APP_DEBUG=false` in production
- [ ] Remove all test/demo data

### Database
- [ ] Backup database before deployment
- [ ] Run all migrations: `php artisan migrate --force`
- [ ] Clear and cache config: `php artisan config:cache`
- [ ] Clear and cache routes: `php artisan route:cache`

### Frontend
- [ ] Update `NEXT_PUBLIC_API_URL` to production backend
- [ ] Build production version: `npm run build`
- [ ] Test all API endpoints
- [ ] Verify payment gateway integration
- [ ] Test virtual try-on feature

### Performance
- [ ] Enable opcache for PHP
- [ ] Use CDN for static assets
- [ ] Enable gzip/brotli compression
- [ ] Optimize images
- [ ] Enable caching strategies

## 🔧 Environment Variables

### Backend (.env)
```env
APP_NAME="Mirrago Fashion Nepal"
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:YOUR_GENERATED_KEY
APP_URL=https://your-domain.com

DB_CONNECTION=sqlite
DB_DATABASE=/path/to/database.sqlite

# eSewa
ESEWA_MERCHANT_ID=your_merchant_id
ESEWA_SECRET_KEY=your_secret_key
ESEWA_API_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form

# Khalti
KHALTI_PUBLIC_KEY=your_public_key
KHALTI_SECRET_KEY=your_secret_key
KHALTI_WEBHOOK_SECRET=your_webhook_secret

# Mirrago AI
MIRRAGO_API_KEY=your_api_key
MIRRAGO_BASE_URL=https://api.mirrago.com/v1
MIRRAGO_WEBHOOK_SECRET=your_webhook_secret

# Pusher (Real-time updates)
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=mt1
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api
```

## 📊 Monitoring & Maintenance

### Logs
- Laravel logs: `storage/logs/laravel.log`
- View logs: `tail -f storage/logs/laravel.log`
- Next.js logs: Automatically logged in Vercel dashboard

### Database Backups
```bash
# SQLite backup
cp database/database.sqlite database/database.backup.sqlite

# MySQL backup
mysqldump -u username -p database_name > backup.sql
```

### Health Checks
- API Health: `GET /api/health`
- Frontend: Monitor via Vercel dashboard
- Database: Check migrations status

## 🚨 Troubleshooting

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in Laravel
- Ensure backend API is accessible

### Payment gateway errors
- Verify credentials in `.env`
- Check if using test vs production URLs
- Review payment gateway logs

### Virtual try-on not working
- Verify Mirrago API key is valid
- Check API rate limits
- Review Mirrago dashboard for errors

### Database migration errors
- Backup database first
- Run `php artisan migrate:status` to check
- Rollback if needed: `php artisan migrate:rollback`

## 📈 Post-Deployment

1. **Test all features:**
   - User registration/login
   - Product browsing
   - Add to cart
   - Checkout process
   - Payment integration
   - Order tracking
   - Virtual try-on
   - AI recommendations

2. **Monitor performance:**
   - Check response times
   - Monitor error rates
   - Track conversion rates

3. **Set up analytics:**
   - Google Analytics (optional)
   - Vercel analytics
   - Laravel Telescope (dev only)

4. **Configure backups:**
   - Database backups
   - File storage backups
   - Environment variable backups

## 🎯 Production Optimization

### Laravel
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
composer install --no-dev --optimize-autoloader
```

### Next.js
```bash
npm run build  # Already optimized in vercel.json
```

### Database
- Add indexes to frequently queried columns
- Use query caching
- Optimize slow queries

## 📞 Support

If you encounter issues during deployment:
1. Check logs for error messages
2. Review environment variables
3. Verify all dependencies are installed
4. Test locally first before deploying
5. Create a GitHub issue if needed
