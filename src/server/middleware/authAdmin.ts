import { Request, Response, NextFunction } from "express";

const ADMIN_EMAIL = "ocerebro936@gmail.com";

export function authAdmin(req: Request, res: Response, next: NextFunction) {
  const userEmail = req.headers["x-admin-email"] as string | undefined;

  if (!userEmail || userEmail.toLowerCase().trim() !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      error: "ACESSO REJEITADO",
      message:
        "Esta zona financeira contém dados consolidados da Bluewhite Corporation Lda. Credenciais inválidas.",
    });
  }

  next();
}
