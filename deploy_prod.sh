#!/bin/bash

# Enterprise Risk Platform - Production Deploy Script

echo "🚀 Starting Deployment..."

# 1. Create Data Directories
mkdir -p certbot/conf
mkdir -p certbot/www

# 2. Check for Domain argument
DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./deploy.sh <your-domain.com> <your-email>"
    exit 1
fi

# 3. Update Configs with real domain
sed -i "s/your-domain.com/$DOMAIN/g" web_dashboard/nginx_prod.conf
sed -i "s/your-domain.com/$DOMAIN/g" docker-compose.prod.yml
sed -i "s/your-email@example.com/$EMAIL/g" docker-compose.prod.yml

echo "✅ Configurations updated for $DOMAIN"

# 4. Initial Run (Get Certs)
# We need to start Nginx first to serve the challenge, but it might fail if certs look missing.
# Trick: Start Nginx with dummy certs? Or just HTTP first.
# For simplicity in this script, we assume the Nginx config has been tweaked to allow HTTP startup first, OR we use a separate init.

echo "📦 Building Containers..."
docker-compose -f docker-compose.prod.yml build

echo "🚦 Starting Services..."
docker-compose -f docker-compose.prod.yml up -d

echo "📜 Requesting SSL Certificate..."
docker-compose -f docker-compose.prod.yml run --rm certbot

echo "🔄 Reloading Nginx to apply SSL..."
docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload

echo "🎉 Deployment Complete! Visit https://$DOMAIN"
