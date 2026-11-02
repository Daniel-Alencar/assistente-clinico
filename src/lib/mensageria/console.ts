import type { MensagemTemplate, ProvedorWhatsApp } from "./tipos";

/** Provedor de desenvolvimento: apenas registra no log, não envia nada. */
export class ProvedorConsole implements ProvedorWhatsApp {
  readonly nome = "console";

  async enviarTexto(telefone: string, texto: string) {
    console.info(`[whatsapp:console] -> ${telefone}: ${texto}`);
    return { provedor: this.nome, idMensagem: null };
  }

  async enviarTemplate(mensagem: MensagemTemplate) {
    return this.enviarTexto(mensagem.telefone, mensagem.textoAlternativo);
  }
}
