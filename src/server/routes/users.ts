import { Router, Request, Response } from "express";

const router = Router();

export interface HwsUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  storeIds: string[];
}

const users = new Map<string, HwsUser>();

function generateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "HWS-";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/* POST /api/v1/users/register — cria conta e devolve ID único */
router.post("/register", (req: Request, res: Response) => {
  const { name, email, phone } = req.body;
  if (!name || !email) {
    res.status(400).json({ success: false, error: "name e email são obrigatórios" });
    return;
  }
  for (const u of users.values()) {
    if (u.email === email.toLowerCase().trim()) {
      res.status(400).json({ success: false, error: "Este email já está registado.", user: { id: u.id, name: u.name, email: u.email } });
      return;
    }
  }
  const id = generateId();
  const user: HwsUser = {
    id,
    name,
    email: email.toLowerCase().trim(),
    phone: phone || undefined,
    createdAt: new Date().toISOString(),
    storeIds: [],
  };
  users.set(id, user);
  res.status(201).json({ success: true, message: "Conta criada. Guarde o seu ID único para aceder ao painel.", user });
});

/* POST /api/v1/users/login — login por ID único */
router.post("/login", (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: "ID é obrigatório." });
    return;
  }
  const user = users.get(id.toUpperCase().trim());
  if (!user) {
    res.status(404).json({ success: false, error: "ID não encontrado. Verifique o código ou registe-se primeiro." });
    return;
  }
  res.json({ success: true, user });
});

/* POST /api/v1/users/sync — sincroniza dados do perfil (localização, telefone) */
router.post("/sync", (req: Request, res: Response) => {
  const { id, latitude, longitude, phone } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: "ID é obrigatório." });
    return;
  }
  const user = users.get(id.toUpperCase().trim());
  if (!user) {
    res.status(404).json({ success: false, error: "Utilizador não encontrado." });
    return;
  }
  if (latitude !== undefined) user.latitude = parseFloat(String(latitude));
  if (longitude !== undefined) user.longitude = parseFloat(String(longitude));
  if (phone !== undefined) user.phone = phone;
  res.json({ success: true, message: "Perfil sincronizado.", user });
});

/* GET /api/v1/users/profile/:id — obtém perfil */
router.get("/profile/:id", (req: Request, res: Response) => {
  const user = users.get(req.params.id.toUpperCase().trim());
  if (!user) {
    res.status(404).json({ success: false, error: "Utilizador não encontrado." });
    return;
  }
  res.json({ success: true, user });
});

export { users as hwsUsers };
export default router;
