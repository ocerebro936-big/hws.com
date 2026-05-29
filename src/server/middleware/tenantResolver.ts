import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { isUsingPrisma } from "../db";
import { database } from "../state";
import { renderStorefront } from "../../views/storefront";

export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/") || req.method !== "GET") {
    return next();
  }

  const requestHost = (req.headers.host || "").toLowerCase().split(":")[0];

  try {
    if (!isUsingPrisma()) {
      const entry = Object.entries(database).find(([key]) => key === requestHost || key.startsWith(requestHost.split(".")[0] + "."));
      if (!entry) return next();
      const t = entry[1] as any;
      const html = renderStorefront(t.name, (t.products || []).map((p: any) => ({
        name: p.name,
        description: p.description,
        finalPrice: parseFloat(p.price?.replace(/[^0-9]/g, "") || "0") || 0,
        imageUrl: p.imageUrl,
      })));
      return res.send(html);
    }

    let tenant;
    if (requestHost.endsWith("hws.com") || requestHost.includes("localhost") || requestHost.includes("127.0.0.1")) {
      const subdomain = requestHost.split(".")[0];
      tenant = await prisma.tenant.findUnique({
        where: { host: subdomain },
        include: { products: true },
      });
    } else {
      tenant = await prisma.tenant.findUnique({
        where: { customDomain: requestHost },
        include: { products: true },
      });
    }

    if (!tenant) return next();

    const html = renderStorefront(tenant.name, tenant.products);
    return res.send(html);
  } catch {
    return next();
  }
}
