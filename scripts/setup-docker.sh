#!/usr/bin/env bash
# =============================================================================
# HWS Docker Cloud Cluster — Setup Script
# Bluewhite Corporation Lda.
# Uso: curl -fsSL https://raw.githubusercontent.com/ocerebro936-big/hws.com/main/scripts/setup-docker.sh | bash
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ocerebro936-big/hws.com.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-/opt/hws}"
HWS_DOMAIN="${HWS_DOMAIN:-hws.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-ocerebro936@gmail.com}"
ADMIN_WALLET="${ADMIN_WALLET:-0xf44910f8F13BC4B485bb9ce2406d83a3F0Ada1F2}"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[HWS]${NC} $1"; }
warn() { echo -e "${RED}[HWS]${NC} $1"; }
info() { echo -e "${CYAN}[HWS]${NC} $1"; }

# ==========================================
# 1. Verificar root/sudo
# ==========================================
if [ "$(id -u)" -ne 0 ]; then
    warn "Este script precisa de sudo. A relançar com sudo..."
    exec sudo bash "$0" "$@"
fi

# ==========================================
# 2. Instalar dependências do sistema
# ==========================================
log "A atualizar pacotes do sistema..."
apt-get update -qq

log "A instalar Docker, Git e curl..."
apt-get install -y -qq ca-certificates curl git

if ! command -v docker &> /dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    log "Docker instalado: $(docker --version)"
fi

if ! docker compose version &> /dev/null; then
    warn "Docker Compose plugin não encontrado. A instalar manualmente..."
    apt-get install -y -qq docker-compose-plugin
fi

log "Docker Compose: $(docker compose version)"

# ==========================================
# 3. Clonar ou atualizar repositório
# ==========================================
if [ -d "$INSTALL_DIR" ]; then
    log "Diretório $INSTALL_DIR já existe. A atualizar..."
    cd "$INSTALL_DIR"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    log "A clonar repositório para $INSTALL_DIR..."
    git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# ==========================================
# 4. Criar .env com password segura
# ==========================================
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)}"

if [ ! -f .env ]; then
    log "A gerar .env com password segura..."
    cat > .env <<EOF
# =============================================================================
# HWS — Ambiente de Produção (gerado por setup-docker.sh)
# =============================================================================
PORT=3000
NODE_ENV=production
HWS_DOMAIN=${HWS_DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_WALLET=${ADMIN_WALLET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://hws_master_admin:${POSTGRES_PASSWORD}@postgres_db:5432/hws_production_db?schema=public
EOF
    log ".env criado em ${INSTALL_DIR}/.env"
else
    log ".env já existe. Mantido intacto."
    POSTGRES_PASSWORD=$(grep -oP 'POSTGRES_PASSWORD=\K.*' .env || echo "$POSTGRES_PASSWORD")
fi

# ==========================================
# 5. Criar diretório de uploads
# ==========================================
mkdir -p uploads logs
log "Diretórios uploads/ e logs/ prontos."

# ==========================================
# 6. Construir e iniciar contentores
# ==========================================
log "A construir e iniciar cluster Docker..."
docker compose up -d --build

# ==========================================
# 7. Aguardar healthcheck
# ==========================================
info "A aguardar que o cluster fique saudável..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        log "Cluster pronto! Resposta do health check:"
        curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health
        break
    fi
    if [ "$i" -eq 30 ]; then
        warn "Timeout ao aguardar o cluster. Verifique os logs com: docker compose logs -f"
    fi
    sleep 2
done

# ==========================================
# 8. Mostrar estado final
# ==========================================
echo ""
echo "========================================"
echo "  ✅ HWS Cloud Cluster em Produção!"
echo "========================================"
echo ""
echo "  URL:        https://${HWS_DOMAIN}"
echo "  Portas:     80 (HTTP) → 443 (HTTPS)"
echo "  Contentores:"
docker ps --format "  - {{.Names}} ({{.Image}}): {{.Status}}"
echo ""
echo "  Comandos úteis:"
echo "  docker compose ps                 # Estado dos contentores"
echo "  docker compose logs -f --tail=100 # Logs em tempo real"
echo "  docker compose up -d --scale hws_app=5  # Escalar para 5 réplicas"
echo "  docker compose down               # Parar tudo"
echo "  docker compose restart            # Reiniciar"
echo ""
echo "========================================"
