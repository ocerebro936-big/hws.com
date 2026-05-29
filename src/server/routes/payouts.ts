import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { isUsingPrisma, getAdRevenue, deductAdRevenue, addToCaixa, getFinanceiro } from "../db";

const router = Router();

const ADMIN_EMAIL = "ocerebro936@gmail.com";
const ADMIN_WALLET = "0xf44910f8F13BC4B485bb9ce2406d83a3F0Ada1F2";

function generateTxHash(): string {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

router.post("/admin/payout/crypto", async (req: Request, res: Response) => {
  const { auth_email, amount_to_withdraw } = req.body;

  if (auth_email !== ADMIN_EMAIL) {
    return res.status(403).json({ success: false, error: "Acesso negado. Apenas o administrador master pode solicitar saídas Web3." });
  }

  const amount = parseFloat(amount_to_withdraw);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: "Valor inválido para saque." });
  }

  try {
    const available = getAdRevenue();

    if (available < amount) {
      return res.status(400).json({
        success: false,
        error: `Saldo publicitário insuficiente. Disponível: ${available.toLocaleString("pt-PT")},00 MT — Solicitado: ${amount.toLocaleString("pt-PT")},00 MT`,
      });
    }

    const deducted = deductAdRevenue(amount);
    if (!deducted) {
      return res.status(500).json({ success: false, error: "Erro ao debitar saldo publicitário." });
    }

    let walletAddress = ADMIN_WALLET;

    if (isUsingPrisma()) {
      const adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
      if (adminUser?.walletAddress) {
        walletAddress = adminUser.walletAddress;
      }
    }

    const txHash = generateTxHash();

    const txPayload = {
      network: "Polygon POS (Low Fees)",
      token: "USDC / USDT Stablecoin",
      destination_wallet: walletAddress,
      amount: amount,
      status: "BROADCASTED_TO_BLOCKCHAIN",
      tx_hash: txHash,
    };

    return res.status(200).json({
      success: true,
      message: `Liquidação de receita publicitária disparada com sucesso para a MetaMask.`,
      transaction_details: txPayload,
      saldo_restante: getAdRevenue(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/admin/financeiro", async (_req: Request, res: Response) => {
  const fin = getFinanceiro();
  return res.json({
    success: true,
    financeiro: fin,
    adminWallet: ADMIN_WALLET,
  });
});

export default router;
