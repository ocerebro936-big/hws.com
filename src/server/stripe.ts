import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY || "sk_sandbox_UvXAXsM1wrTfU4mIHy3w9bC2rTbyGcIx";
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}
