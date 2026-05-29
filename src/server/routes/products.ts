import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { prisma } from "../prisma";
import { isUsingPrisma } from "../db";
import { database } from "../state";
import { isOssConfigured, uploadToOss } from "../oss";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(file.mimetype));
  },
});

const router = Router();

async function resolveImageUrl(file: Express.Multer.File | undefined): Promise<string | null> {
  if (!file) return null;

  if (isOssConfigured()) {
    const ext = path.extname(file.originalname) || ".jpg";
    const key = `products/${Date.now()}-${crypto.randomUUID()}${ext}`;
    return await uploadToOss(key, file.buffer, file.mimetype);
  }

  const fs = await import("fs/promises");
  const destDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(destDir, { recursive: true });
  const filename = `${Date.now()}-${file.originalname}`;
  await fs.writeFile(path.join(destDir, filename), file.buffer);
  return `/uploads/${filename}`;
}

router.post("/add", upload.single("photo"), async (req: Request, res: Response) => {
  const { tenantId, name, description, price } = req.body;

  if (!tenantId || !name || !price) {
    return res.status(400).json({ success: false, error: "Campos obrigatórios: tenantId, name, price" });
  }

  try {
    const imageUrl = await resolveImageUrl(req.file);

    if (!isUsingPrisma()) {
      const tenant = Object.values(database).find((t: any) => t.id === tenantId);
      if (!tenant) return res.status(404).json({ success: false, error: "Loja não encontrada." });
      const p = { id: (tenant as any).products.length + 1, name, price: `${parseFloat(price).toFixed(2)} MT`, description: description || "", category: "Destaques", imageUrl };
      (tenant as any).products.unshift(p);
      return res.status(201).json({ success: true, message: "Produto adicionado (modo dev).", product: p });
    }

    const product = await prisma.product.create({
      data: {
        tenantId,
        name,
        description: description || null,
        finalPrice: parseFloat(price),
        imageUrl,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Produto inserido com foto.",
      product,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/list/:tenantId", async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  if (!isUsingPrisma()) {
    const tenant = Object.values(database).find((t: any) => t.id === tenantId);
    return res.json({ success: true, products: tenant ? (tenant as any).products : [] });
  }

  try {
    const products = await prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, products });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
