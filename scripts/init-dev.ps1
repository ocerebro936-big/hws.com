# HWS Init Script (PowerShell) — Ambiente de Desenvolvimento
# Bluewhite Corporation Lda.
# =============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HWS — Setup Desenvolvimento Windows"    -ForegroundColor Cyan
Write-Host "  Bluewhite Corporation Lda."             -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Instalar dependências
Write-Host "[SETUP] A instalar dependências npm..." -ForegroundColor Yellow
npm install

# 2. Gerar Prisma Client
Write-Host "[SETUP] A gerar Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# 3. Verificar PostgreSQL (opcional para dev)
$pg = Get-Command psql -ErrorAction SilentlyContinue
if (-not $pg) {
    Write-Host "[SETUP] ⚠️ PostgreSQL não encontrado. A usar modo in-memory (dev)." -ForegroundColor DarkYellow
    Write-Host "       Instale PostgreSQL de https://www.postgresql.org/download/windows/" -ForegroundColor DarkYellow
}

# 4. Verificar .env
if (-not (Test-Path ".env")) {
    Write-Host "[SETUP] A criar .env a partir de .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[SETUP] ⚠️ Edite o ficheiro .env com as suas credenciais!" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Setup concluído!"                    -ForegroundColor Green
Write-Host "  Execute: npm run dev"                   -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
