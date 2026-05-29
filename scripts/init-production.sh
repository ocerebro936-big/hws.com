#!/usr/bin/env bash
# =============================================================================
# HWS Init Script — Bluewhite Corporation Lda.
# Executar no servidor Ubuntu dedicado para setup inicial de produção.
# =============================================================================
set -euo pipefail

echo "========================================"
echo "  HWS — Setup de Produção"
echo "  Bluewhite Corporation Lda."
echo "========================================"

# 1. Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "[SETUP] A instalar PostgreSQL..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq postgresql postgresql-contrib
fi

# 2. Iniciar PostgreSQL se não estiver a correr
if ! pg_isready -q; then
    echo "[SETUP] A iniciar PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# 3. Criar base de dados e utilizador
DB_NAME="${DB_NAME:-hws_production_db}"
DB_USER="${DB_USER:-bluewhite_admin}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 32)}"

echo "[SETUP] A criar base de dados '${DB_NAME}'..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo "[SETUP] DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"

# 4. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[SETUP] A instalar Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi

# 5. Instalar PM2 globalmente
if ! command -v pm2 &> /dev/null; then
    echo "[SETUP] A instalar PM2..."
    npm install -g pm2
fi

# 6. Instalar dependências do projeto
echo "[SETUP] A instalar dependências npm..."
npm install

# 7. Gerar Prisma Client e executar migrações
echo "[SETUP] A gerar Prisma Client e migrar base de dados..."
npx prisma generate
npx prisma db push

# 8. Fazer build da aplicação
echo "[SETUP] A compilar aplicação..."
npm run build

# 9. Criar diretório de logs
mkdir -p logs

# 10. Iniciar com PM2
echo "[SETUP] A iniciar servidor com PM2..."
pm2 delete hws-production 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "========================================"
echo "  ✅ HWS em Produção!"
echo "  Porta: 3000"
echo "  Base de Dados: ${DB_NAME}"
echo "  PM2: $(pm2 --version)"
echo "========================================"
echo ""
echo "Comandos úteis:"
echo "  pm2 status                    # Estado dos processos"
echo "  pm2 logs hws-production       # Ver logs em tempo real"
echo "  pm2 restart hws-production    # Reiniciar servidor"
echo "  pm2 stop hws-production       # Parar servidor"
echo "  pm2 startup                   # Iniciar com o sistema"
