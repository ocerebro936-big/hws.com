import { Router } from "express";
import { handleMpesaCallback, handleStripeWebhook } from "../controllers/webhookController";

const router = Router();

router.post("/v1/mpesa/callback", handleMpesaCallback);

router.post("/v1/stripe/webhook", handleStripeWebhook);

export default router;
