import { Router, Request, Response } from "express";
import { generateStoreCSS, buildImagePrompt, getDesignTokens } from "../services/storeDesign";
import { database } from "../state";

const router = Router();

/* GET /api/v1/design/store-css/:storeId — retorna CSS dinâmico da loja */
router.get("/store-css/:storeId", (req: Request, res: Response) => {
  const storeId = req.params.storeId;
  const tenant = (database as any)[storeId] ?? Object.values(database as any).find((t: any) => t.id === storeId);
  const niche = tenant?.niche ?? "tech";
  const css = generateStoreCSS(storeId, niche);
  res.setHeader("Content-Type", "text/css");
  res.send(css);
});

/* GET /api/v1/design/tokens/:storeId — retorna tokens de design (JSON) */
router.get("/tokens/:storeId", (req: Request, res: Response) => {
  const storeId = req.params.storeId;
  const tenant = (database as any)[storeId] ?? Object.values(database as any).find((t: any) => t.id === storeId);
  const niche = tenant?.niche ?? "tech";
  const tokens = getDesignTokens(niche);
  res.json({ success: true, storeId, niche, tokens, tenantName: tenant?.name ?? "Desconhecida" });
});

/* POST /api/v1/design/build-prompt — constrói prompt profissional para DALL-E / Midjourney */
router.post("/build-prompt", (req: Request, res: Response) => {
  const { productName, category, niche, extra } = req.body;
  if (!productName) {
    res.status(400).json({ success: false, error: "productName é obrigatório" });
    return;
  }
  const prompt = buildImagePrompt(productName, category ?? "Geral", niche, extra);
  res.json({ success: true, prompt });
});

/* POST /api/v1/design/generate — gera imagem via Gemini (ou fallback) */
router.post("/generate", async (req: Request, res: Response) => {
  const { productName, category, niche, extra } = req.body;
  if (!productName) {
    res.status(400).json({ success: false, error: "productName é obrigatório" });
    return;
  }

  const prompt = buildImagePrompt(productName, category ?? "Geral", niche, extra);

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_KEY && GEMINI_KEY !== "SUA_GEMINI_API_KEY") {
    try {
      const { GoogleGenAI } = require("@google/genai");
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
        config: {
          responseModalities: ["Text", "Image"],
        },
      });
      if (result.candidates?.[0]?.content?.parts) {
        for (const part of result.candidates[0].content.parts) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            const b64 = part.inlineData.data;
            const mime = part.inlineData.mimeType;
            res.json({ success: true, image: `data:${mime};base64,${b64}`, prompt });
            return;
          }
        }
      }
      const text = result.text ?? "";
      res.json({ success: true, image: null, text, prompt, note: "Gemini não retornou imagem inline; texto gerado abaixo." });
      return;
    } catch (err: any) {
      console.error("Gemini generation error:", err);
      res.json({ success: true, image: null, prompt, note: `API Key configurada mas erro: ${err.message}. Use o prompt com DALL-E / Midjourney.`, promptPreview: prompt });
      return;
    }
  }

  res.json({ success: true, image: null, prompt, note: "GEMINI_API_KEY não configurada. Use o prompt abaixo com DALL-E 3, Midjourney ou Imagen." });
});

/* POST /api/v1/design/chat — chat com IA de negócios usando Gemini */
router.post("/chat", async (req: Request, res: Response) => {
  const { message, history } = req.body;
  if (!message) {
    res.status(400).json({ success: false, error: "message é obrigatório" });
    return;
  }

  const SYSTEM_PROMPT = `Você é o Assistente de Negócios e Estratégia da HWS (Hub World Shopping), uma plataforma multitenant moçambicana operada pela Bluewhite Corporation Lda.

DIRETRIZES DE CONHECIMENTO:
- **Economia & Finanças:** Domínio sobre macroeconomia, microeconomia, taxas de juro, inflação, gestão de liquidez, fluxo de caixa e investimento em ativos reais e digitais.
- **Do Zero ao Primeiro Milhão:** Foco em engenharia reversa de riqueza. Divisão de metas macro em metas micro executáveis.
- **Ideias Práticas & Execução:** Cada resposta deve incluir um plano de ação estruturado em 3 passos pragmáticos imediatos.
- **Disciplina & Cultura de Trabalho:** Filosofia de alto rendimento, rotinas de foco profundo (deep work), gestão de energia e consistência de longo prazo.
- **O Mercado Hoje:** Análise focada em economias digitais, e-commerce multitenant, automação por inteligência artificial, descentralização financeira e posicionamento de marcas locais para o mercado global.
- **Sobre a HWS:** HWS significa Hub World Shopping. A plataforma permite que qualquer pessoa crie uma loja online em segundos, com suporte a dropshipping, pagamentos M-Pesa/e-Mola/Stripe, domínio próprio, SSL automático, e anúncios pagos.
- **Preços HWS:** Starter 1.500 MT/mês, Pro 3.500 MT/mês, Enterprise 45.000 MT (taxa única). Comissões: Starter 5%, Pro 3%, Enterprise 0%.
- **Endereço da Bluewhite:** A Bluewhite Corporation Lda. tem sede em Moçambique.

Responda sempre em português de Moçambique (PT-MZ). Seja direto, prático e acionável.`;

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_KEY && GEMINI_KEY !== "SUA_GEMINI_API_KEY") {
    try {
      const { GoogleGenAI } = require("@google/genai");
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      const contents: any[] = [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }];
      if (Array.isArray(history)) {
        for (const msg of history) {
          contents.push({ role: msg.role === "bot" ? "model" : "user", parts: [{ text: msg.text }] });
        }
      }
      contents.push({ role: "user", parts: [{ text: message }] });
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
      });
      const reply = result.text ?? "Desculpe, não consegui processar a sua pergunta.";
      res.json({ success: true, reply });
      return;
    } catch (err: any) {
      console.error("Gemini chat error:", err);
    }
  }

  const FALLBACK_RESPONSES: Record<string, string> = {
    dns: "Para configurar o seu DNS, aponte o registo A para o IP do servidor dedicado. O HWS valida o domínio automaticamente via API Caddy. Aguarde 5-10 min para propagação.",
    tema: "Pode personalizar o tema na sua loja. Temas disponíveis: Luxury (escuro elegante), Tech (cyberpunk), Streetwear (urbano). Aceda a Configurações > Aparência no seu painel.",
    checkout: "Erros de checkout podem dever-se a: 1) Webhook não configurado no gateway 2) Saldo insuficiente 3) Comissão pendente. Verifique os logs em /api/v1/hws/webhooks.",
    fatura: "O seu saldo disponível é calculado após dedução da comissão HWS (3%) e IVA (16%). O levantamento pode ser solicitado para conta BIM ou e-Mola.",
    dominio: "Domínios .com: 1.200 MT/ano | .co.mz: 2.500 MT/ano. A ativação inclui SSL automático via Caddy e proxy reverso.",
    milhao: "Para faturar 1 milhão de MT no ano: precisa de 83.333 MT/mês ou ~2.778 MT/dia. Com uma margem de 30%, precisa de ~9.260 MT em vendas diárias. Vamos criar um plano de 3 passos personalizado para a sua loja?",
    default: "Olá! Sou o assistente de negócios da Bluewhite Corporation. Posso ajudar com DNS, temas, checkout, faturamento, domínios ou estratégias para escalar a sua loja. Digite a sua dúvida.",
  };
  const lower = message.toLowerCase();
  let reply = FALLBACK_RESPONSES.default;
  if (lower.includes("dns")) reply = FALLBACK_RESPONSES.dns;
  else if (lower.includes("tema") || lower.includes("aparência")) reply = FALLBACK_RESPONSES.tema;
  else if (lower.includes("checkout") || lower.includes("pagamento") || lower.includes("erro")) reply = FALLBACK_RESPONSES.checkout;
  else if (lower.includes("fatura") || lower.includes("saldo") || lower.includes("levantamento")) reply = FALLBACK_RESPONSES.fatura;
  else if (lower.includes("domínio") || lower.includes("dominio") || lower.includes(".com") || lower.includes(".mz")) reply = FALLBACK_RESPONSES.dominio;
  else if (lower.includes("milhão") || lower.includes("milhao") || lower.includes("faturar") || lower.includes("crescer") || lower.includes("escalar")) reply = FALLBACK_RESPONSES.milhao;

  res.json({ success: true, reply });
});

export default router;
