import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../prisma";
import { isUsingPrisma } from "../db";
import { database } from "../state";
import { sendStoreCreatedSms, sendRegistrationSms, isNuvemBlueConfigured } from "../services/sms";

const router = Router();

router.post("/register-store", async (req: Request, res: Response) => {
  const { name, email, password, storeName, hostSubdomain, customDomain, phone } = req.body;

  if (!name || !email || !password || !storeName || !hostSubdomain) {
    return res.status(400).json({ success: false, error: "Campos obrigatórios: name, email, password, storeName, hostSubdomain" });
  }

  if (!isUsingPrisma()) {
    const subdomain = `${hostSubdomain.toLowerCase().trim()}.hws.com`;
    if ((database as any)[subdomain]) {
      return res.status(400).json({ success: false, error: "Subdomínio já registado." });
    }
    (database as any)[subdomain] = {
      id: hostSubdomain.toLowerCase().trim(),
      name: storeName,
      type: "store",
      theme: "dark",
      description: `Loja de ${storeName}`,
      domain: subdomain,
      tagline: "Bem-vindo à nossa loja.",
      accentColor: "#6366f1",
      products: [],
      licenseStatus: "PAID",
      ownerId: `usr_${Date.now()}`,
      balance: "0 MT",
      plan: "Starter",
      accumulatedSales: 0,
    };
    /* Notificar por SMS se configurado */
    if (phone && isNuvemBlueConfigured()) {
      sendStoreCreatedSms(phone, storeName, subdomain).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: "Conta criada em modo desenvolvimento.",
      store: (database as any)[subdomain],
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        tenants: {
          create: {
            name: storeName,
            host: hostSubdomain.toLowerCase().trim(),
            customDomain: customDomain ? customDomain.toLowerCase().trim() : null,
          },
        },
      },
      include: { tenants: true },
    });

    /* Notificar por SMS se configurado */
    if (phone && isNuvemBlueConfigured()) {
      sendStoreCreatedSms(phone, storeName, `${hostSubdomain}.hws.com`).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: "Conta e infraestrutura criadas.",
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      store: newUser.tenants[0],
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: "O e-mail, subdomínio ou domínio já se encontra registado na rede.",
      detail: error.message,
    });
  }
});

export default router;
