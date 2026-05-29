import checkoutRoutes from "./src/server/routes/checkout";
console.log("Checkout routes loaded:", checkoutRoutes?.stack?.length || 0, "handlers");

import webhookRoutes from "./src/server/routes/webhooks";
console.log("Webhook routes loaded:", webhookRoutes?.stack?.length || 0, "handlers");
