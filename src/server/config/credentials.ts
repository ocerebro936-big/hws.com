export const credentials = {
  nacional: {
    mpesa: {
      api_host: process.env.MPESA_API_URL || "https://api.vm.co.mz/ipg/v1x/",
      service_provider_code: process.env.MPESA_SERVICE_CODE || "898989",
      api_encrypted_api_key: process.env.MPESA_PUBLIC_KEY || "",
      initiator_identifier: process.env.MPESA_INITIATOR_ID || "hws_bluewhite"
    },
    emola: {
      api_host: process.env.EMOLA_API_URL || "https://api.emola.movitel.co.mz/v1/payment",
      merchant_id: process.env.EMOLA_MERCHANT_ID || "HW001",
      application_id: process.env.EMOLA_APP_ID || "",
      secret_key: process.env.EMOLA_SECRET_KEY || ""
    },
    banco_local_direct: {
      titular: "Bluewhite Corporation Lda.",
      nuit: "500123456",
      nib_bim: process.env.BIM_NIB || "",
      nib_bci: process.env.BCI_NIB || ""
    }
  },
  internacional: {
    stripe: {
      secret_key: process.env.STRIPE_SECRET_KEY || "sk_sandbox_UvXAXsM1wrTfU4mIHy3w9bC2rTbyGcIx",
      public_key: process.env.STRIPE_PUBLIC_KEY || "pk_test_placeholder",
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || ""
    },
    paypal: {
      client_id: process.env.PAYPAL_CLIENT_ID || "sb",
      client_secret: process.env.PAYPAL_SECRET || "",
      mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
    }
  }
};
