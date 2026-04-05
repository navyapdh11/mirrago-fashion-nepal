<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mirrago Fashion Nepal - AI-Powered E-Commerce</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
        }
        .hero {
            background: linear-gradient(135deg, #dc143c 0%, #003893 100%);
            color: white;
            padding: 4rem 2rem;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 2rem;
        }
        .hero h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        .hero p { font-size: 1.2rem; opacity: 0.9; }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
        }
        .feature {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .feature h3 { color: #dc143c; margin-bottom: 0.5rem; }
        .api-endpoints {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            margin-top: 2rem;
        }
        .api-endpoints h2 { color: #003893; }
        code {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 1rem;
            border-radius: 4px;
            display: block;
            overflow-x: auto;
            font-size: 0.9rem;
        }
        .flag { font-size: 2rem; }
    </style>
</head>
<body>
    <div class="hero">
        <div class="flag">🇳🇵</div>
        <h1>Mirrago Fashion Nepal</h1>
        <p>AI-Powered Multi-Warehouse E-Commerce Platform</p>
    </div>

    <div class="features">
        <div class="feature">
            <h3>🤖 AI Virtual Try-On</h3>
            <p>Try clothes virtually using Mirrago AI technology. Upload your photo and see how you look in any outfit.</p>
        </div>
        <div class="feature">
            <h3>📦 Multi-Warehouse</h3>
            <p>Smart inventory management across 5 warehouses in Kathmandu, Birgunj, Nepalgunj, Pokhara, and Biratnagar.</p>
        </div>
        <div class="feature">
            <h3>💳 Nepali Payments</h3>
            <p>Seamless integration with eSewa and Khalti payment gateways with automatic failover.</p>
        </div>
        <div class="feature">
            <h3>🎯 AI Recommendations</h3>
            <p>Smart product suggestions based on frequently bought together, shop the look, and personalized recommendations.</p>
        </div>
    </div>

    <div class="api-endpoints">
        <h2>API Endpoints</h2>
        <code>
GET    /api/products                          # List all products<br>
GET    /api/products/trending                 # Trending products<br>
GET    /api/products/{slug}                   # Product details<br>
GET    /api/products/{id}/frequently-bought-together<br>
GET    /api/products/{id}/shop-the-look<br>
GET    /api/products/recommendations<br>
POST   /api/orders                            # Create order<br>
GET    /api/orders                            # List orders<br>
POST   /api/payments/initiate                 # Initiate payment<br>
POST   /api/mirrago/try-on/{productSlug}     # AI virtual try-on<br>
GET    /api/mirrago/status/{sessionId}       # Check try-on status<br>
GET    /api/inventory                        # Inventory levels<br>
GET    /api/inventory/warehouses             # List warehouses<br>
        </code>
    </div>
</body>
</html>
