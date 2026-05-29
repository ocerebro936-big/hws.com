const NUVEM_BLUE_API_URL = process.env.NUVEM_BLUE_API_URL || "https://api.nuvemblue.co.mz";
const NUVEM_BLUE_API_KEY = process.env.NUVEM_BLUE_API_KEY || "";
const NUVEM_BLUE_SECRET = process.env.NUVEM_BLUE_SECRET || "";

export function isNuvemBlueConfigured(): boolean {
  return !!(NUVEM_BLUE_API_KEY && NUVEM_BLUE_SECRET && NUVEM_BLUE_SECRET !== "COLE_A_NUVEM_BLUE_SECRET_AQUI");
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  if (!isNuvemBlueConfigured()) {
    console.log(`[Nuvem Blue SMS] Não configurado. Simulação:\n  Para: ${to}\n  Mensagem: ${message}`);
    return { success: true, messageId: "simulated" };
  }

  try {
    const response = await fetch(`${NUVEM_BLUE_API_URL}/v1/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NUVEM_BLUE_API_KEY,
        "x-secret": NUVEM_BLUE_SECRET,
      },
      body: JSON.stringify({
        destinatario: to,
        mensagem: message,
        origem: "HWS",
      }),
    });
    const data: any = await response.json();
    if (response.ok) {
      return { success: true, messageId: data.id || data.messageId };
    }
    return { success: false, error: data.error || data.message || "Erro desconhecido" };
  } catch (err: any) {
    console.error("[Nuvem Blue SMS] Erro de rede:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendRegistrationSms(phone: string, name: string, userId: string): Promise<SmsResult> {
  const msg = `${name}, bem-vindo(a) ao Hub World Shopping! O seu ID único é: ${userId}. Guarde-o para aceder ao seu painel. Bluewhite Corporation Lda.`;
  return sendSms(phone, msg);
}

export async function sendStoreCreatedSms(phone: string, storeName: string, domain: string): Promise<SmsResult> {
  const msg = `Parabéns! A sua loja "${storeName}" foi criada com sucesso no HWS. Aceda em: https://${domain}. Bluewhite Corporation Lda.`;
  return sendSms(phone, msg);
}

export async function sendPayoutSms(phone: string, amount: number, method: string): Promise<SmsResult> {
  const msg = `Pagamento de ${amount.toLocaleString("pt-PT")} MT solicitado via ${method}. A Bluewhite Corporation Lda. processará em até 2 dias úteis.`;
  return sendSms(phone, msg);
}
