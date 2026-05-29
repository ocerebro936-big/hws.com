import { Router } from "express";
import { handleMpesaCallback, handleStripeWebhook } from "../controllers/webhookController";

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post("/v1/mpesa/callback", asyncHandler(handleMpesaCallback));

router.post("/v1/stripe/webhook", asyncHandler(handleStripeWebhook));

export default router;
