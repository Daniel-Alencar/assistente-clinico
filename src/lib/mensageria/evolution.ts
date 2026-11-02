import { exigirEnv } from "@/lib/env";
import type { MensagemRecebida, MensagemTemplate, ProvedorWhatsApp } from "./tipos";

/**
 * Evolution API (conexão não oficial via QR Code).
 * Apenas para protótipo e testes com volume baixo: há risco de banimento do número
 * e não é adequado para dados de saúde em produção.
 */
export class ProvedorEvolution implements ProvedorWhatsApp {
  readonly nome = "evolution";

  async enviarTexto(telefone: string, texto: string) {
    const url = `${exigirEnv("EVOLUTION_API_URL")}/message/sendText/${exigirEnv("EVOLUTION_INSTANCE")}`;
    const resposta = await fetch(url, {
      method: "POST",
      headers: { apikey: exigirEnv("EVOLUTION_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ number: telefone, text: texto }),
    });
    if (!resposta.ok) {
      throw new Error(`Evolution API ${resposta.status}: ${await resposta.text()}`);
    }
    const dados = (await resposta.json()) as { key?: { id?: string } };
    return { provedor: this.nome, idMensagem: dados.key?.id ?? null };
  }

  enviarTemplate(mensagem: MensagemTemplate) {
    return this.enviarTexto(mensagem.telefone, mensagem.textoAlternativo);
  }
}

type PayloadWebhookEvolution = {
  event?: string;
  data?: {
    key?: { id?: string; remoteJid?: string; fromMe?: boolean };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
  };
};

export function extrairMensagemEvolution(payload: PayloadWebhookEvolution): MensagemRecebida | null {
  const { event, data } = payload;
  if (event !== "messages.upsert" || !data?.key || data.key.fromMe) return null;
  const texto = data.message?.conversation ?? data.message?.extendedTextMessage?.text;
  const telefone = data.key.remoteJid?.split("@")[0];
  if (!texto || !telefone) return null;
  return { telefone, texto, idMensagem: data.key.id ?? null };
}
