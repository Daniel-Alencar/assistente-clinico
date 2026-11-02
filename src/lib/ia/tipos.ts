/** O modelo recusou responder (ex.: filtro de segurança). */
export class EvolucaoRecusadaError extends Error {}
/** Provedor sem chave configurada ou com chave inválida. */
export class IaNaoConfiguradaError extends Error {}
/** Limite de uso ou provedor sobrecarregado: vale tentar de novo depois. */
export class IaIndisponivelError extends Error {}

export type Mensagem = { papel: "usuario" | "assistente"; conteudo: string };

export type EntradaProvedor = {
  sistema: string;
  mensagens: Mensagem[]; // começa e termina com "usuario", alternando
  esforco?: "low" | "medium" | "high"; // profundidade de raciocínio (onde o provedor suporta)
};
