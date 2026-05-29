import { Router, Request, Response } from "express";
import { fetchMultiplePrices, getMtzRate, getSupportedCoins, fetchCryptoPrice } from "../services/coingecko";

const router = Router();

/* GET /api/v1/crypto/prices — cotações de criptomoedas principais */
router.get("/prices", async (_req: Request, res: Response) => {
  const coins = await fetchMultiplePrices(["bitcoin", "ethereum", "tether", "usd-coin", "solana", "polygon"], "usd");
  const mtzRate = await getMtzRate();
  res.json({
    success: true,
    coins,
    metical: mtzRate,
    updatedAt: new Date().toISOString(),
    note: mtzRate ? "1 MT ≈ 1 USD (referência CG token)" : "Taxa MT não disponível",
  });
});

/* GET /api/v1/crypto/price/:coinId — cotação específica */
router.get("/price/:coinId", async (req: Request, res: Response) => {
  const { coinId } = req.params;
  const vsCurrency = (req.query.vs as string) || "usd";
  const data = await fetchCryptoPrice(coinId, vsCurrency);
  if (!data) {
    res.status(404).json({ success: false, error: `Moeda '${coinId}' não encontrada.` });
    return;
  }
  res.json({ success: true, coinId, vsCurrency, ...data });
});

/* GET /api/v1/crypto/coins — lista de moedas suportadas */
router.get("/coins", async (_req: Request, res: Response) => {
  const coins = await getSupportedCoins();
  res.json({ success: true, total: coins.length, coins });
});

export default router;
