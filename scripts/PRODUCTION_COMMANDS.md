## Comandos de Produção

```bash
# Setup completo (Ubuntu server)
sudo bash scripts/init-production.sh

# Gestão PM2
pm2 status                    # Estado
pm2 logs hws-production       # Logs em tempo real
pm2 restart hws-production    # Reiniciar
pm2 stop hws-production       # Parar
pm2 startup                   # Auto-start ao boot
pm2 save                      # Salvar configuração

# Base de Dados
npm run db:push               # Sincronizar schema Prisma
npm run db:studio             # Abrir Prisma Studio (GUI)
npx prisma migrate dev        # Criar migrações
npx prisma migrate deploy     # Aplicar migrações em produção

# Caddy (Docker)
docker-compose up -d caddy    # Iniciar Caddy com SSL on-demand
docker-compose logs -f caddy  # Ver logs Caddy

# Variáveis de Ambiente
nano .env                     # Editar credenciais de produção
```
