import { createHmac, timingSafeEqual } from "node:crypto";
import { exigirEnv } from "@/lib/env";
import type { MensagemRecebida, MensagemTemplate, ProvedorWhatsApp, ResultadoEnvio } from "./tipos";

/** WhatsApp Cloud API oficial da Meta. Use este provedor em produção. */
export class ProvedorMetaCloud implements ProvedorWhatsApp {
  readonly nome = "meta";

  private get url() {
    const versao = process.env.META_GRAPH_API_VERSION ?? "v23.0";
    return `https://graph.facebook.com/${versao}/${exigirEnv("META_WHATSAPP_PHONE_NUMBER_ID")}/messages`;
  }

  private async enviar(corpo: Record<string, unknown>): Promise<ResultadoEnvio> {
    const resposta = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${exigirEnv("META_WHATSAPP_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...corpo }),
    });
    if (!resposta.ok) {
      throw new Error(`Meta Cloud API ${resposta.status}: ${await resposta.text()}`);
    }
    const dados = (await resposta.json()) as { messages?: { id: string }[] };
    return { provedor: this.nome, idMensagem: dados.messages?.[0]?.id ?? null };
  }

  /** Só funciona dentro da janela de 24h após a última mensagem do paciente. */
  enviarTexto(telefone: string, texto: string) {
    return this.enviar({ to: telefone, type: "text", text: { body: texto } });
  }

  enviarTemplate(mensagem: MensagemTemplate) {
    return this.enviar({
      to: mensagem.telefone,
      type: "template",
      template: {
        name: mensagem.template,
        language: { code: mensagem.idioma ?? "pt_BR" },
        components: [
          {
            type: "body",
            parameters: mensagem.parametros.map((text) => ({ type: "text", text })),
          },
        ],
      },
    });
  }
}

/** Valida o header X-Hub-Signature-256 enviado pela Meta. */
export function assinaturaMetaValida(corpoBruto: string, assinatura: string | null): boolean {
  if (!assinatura?.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", exigirEnv("META_APP_SECRET")).update(corpoBruto).digest("hex");
  const recebido = assinatura.slice("sha256=".length);
  return (
    esperado.length === recebido.length &&
    timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido))
  );
}

type PayloadWebhookMeta = {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          id: string;
          from: string;
          type: string;
          text?: { body: string };
          button?: { text: string; payload?: string };
          interactive?: { button_reply?: { id: string; title: string } };
        }[];
      };
    }[];
  }[];
};

export function extrairMensagensMeta(payload: PayloadWebhookMeta): MensagemRecebida[] {
  const recebidas: MensagemRecebida[] = [];
  for (const entrada of payload.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      for (const msg of mudanca.value?.messages ?? []) {
        const texto =
          msg.text?.body ??
          msg.button?.payload ??
          msg.button?.text ??
          msg.interactive?.button_reply?.title;
        if (texto) recebidas.push({ telefone: msg.from, texto, idMensagem: msg.id });
      }
    }
  }
  return recebidas;
}
