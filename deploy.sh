#!/bin/bash
set -e

echo "============================================"
echo "  HWS - Hub World Shopping Deploy Script"
echo "  Bluewhite Corporation Lda."
echo "============================================"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required. Install it first."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required."; exit 1; }

# Check for .env file
if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Creating from .env.production template..."
  cp .env.production .env
  echo "⚠️  Edit .env and set STRIPE_SECRET_KEY and GEMINI_API_KEY before deploying."
  echo ""
fi

echo "🏗️  Building production images..."
docker-compose build --pull

echo ""
echo "🚀 Deploying HWS stack..."
docker-compose up -d

echo ""
echo "============================================"
echo "  ✅ HWS Deployed Successfully!"
echo "============================================"
echo "  🌐 Frontend:  https://hws.com"
echo "  🩺 Health:    http://localhost:3000/health"
echo "  🔒 Caddy UI:  http://localhost:2019/config/"
echo ""
echo "  📋 View logs: docker-compose logs -f"
echo "  🛑 Stop:      docker-compose down"
echo "============================================"
