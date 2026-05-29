import { Router, Request, Response } from "express";
import { database, storeVisits } from "../state";

const router = Router();

/* POST /api/v1/stores/:storeId/visit — regista uma visita ao terreno da loja */
router.post("/:storeId/visit", (req: Request, res: Response) => {
  const storeId = req.params.storeId;
  const tenant = Object.values(database).find((t: any) => t.id === storeId || t.domain === storeId);
  if (!tenant) {
    res.status(404).json({ success: false, error: "Loja não encontrada." });
    return;
  }
  const key = tenant.id;
  if (!storeVisits[key]) {
    storeVisits[key] = { storeName: tenant.name, visits: 0, lastVisit: null };
  }
  storeVisits[key].visits += 1;
  storeVisits[key].lastVisit = new Date().toISOString();
  res.json({ success: true, storeId: key, storeName: tenant.name, totalVisits: storeVisits[key].visits });
});

/* GET /api/v1/stores/visits — métricas de visitas de todas as lojas */
router.get("/visits", (_req: Request, res: Response) => {
  res.json({ success: true, visits: storeVisits });
});

export default router;
