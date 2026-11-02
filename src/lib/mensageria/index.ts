import { ProvedorConsole } from "./console";
import { ProvedorEvolution } from "./evolution";
import { ProvedorMetaCloud } from "./meta-cloud";
import type { ProvedorWhatsApp } from "./tipos";

export type { MensagemRecebida, MensagemTemplate, ProvedorWhatsApp, ResultadoEnvio } from "./tipos";

/** Ponto único de escolha do provedor: troque via WHATSAPP_PROVIDER, sem mudar regra de negócio. */
export function obterProvedorWhatsApp(): ProvedorWhatsApp {
  switch (process.env.WHATSAPP_PROVIDER ?? "console") {
    case "meta":
      return new ProvedorMetaCloud();
    case "evolution":
      return new ProvedorEvolution();
    case "console":
      return new ProvedorConsole();
    default:
      throw new Error(`WHATSAPP_PROVIDER inválido: ${process.env.WHATSAPP_PROVIDER}`);
  }
}
