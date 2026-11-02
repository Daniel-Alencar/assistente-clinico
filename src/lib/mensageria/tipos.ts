export type ResultadoEnvio = {
  provedor: string;
  idMensagem: string | null;
};

/**
 * Mensagem baseada em template. A API oficial da Meta exige templates
 * aprovados para iniciar conversa; provedores sem templates usam `textoAlternativo`.
 */
export type MensagemTemplate = {
  telefone: string; // E.164 sem "+", ex: 5511999998888
  template: string; // nome do template aprovado na Meta
  idioma?: string; // padrão pt_BR
  parametros: string[]; // variáveis {{1}}, {{2}}... do corpo
  textoAlternativo: string;
};

export interface ProvedorWhatsApp {
  readonly nome: string;
  enviarTexto(telefone: string, texto: string): Promise<ResultadoEnvio>;
  enviarTemplate(mensagem: MensagemTemplate): Promise<ResultadoEnvio>;
}

/** Mensagem recebida, já normalizada, independente do provedor. */
export type MensagemRecebida = {
  telefone: string;
  texto: string;
  idMensagem: string | null;
};
