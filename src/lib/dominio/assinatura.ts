// Regras da assinatura da plataforma (o profissional paga o SaaS).

export type StatusAssinatura = "teste" | "ativa" | "inadimplente" | "cancelada";

export type DadosAssinatura = { assinatura_status: StatusAssinatura; teste_ate: string };

export const PRECO_MENSAL = Number(process.env.NEXT_PUBLIC_PRECO_MENSAL ?? 49);

/** Pode criar e alterar dados? Sem assinatura válida, o app fica somente leitura (os dados nunca são bloqueados). */
export function podeEscrever(a: DadosAssinatura, agora = new Date()): boolean {
  if (a.assinatura_status === "ativa") return true;
  if (a.assinatura_status === "teste") return new Date(a.teste_ate) > agora;
  return false;
}

export function diasRestantesTeste(a: DadosAssinatura, agora = new Date()): number {
  return Math.max(0, Math.ceil((new Date(a.teste_ate).getTime() - agora.getTime()) / 86_400_000));
}

/** Status do Mercado Pago (preapproval) -> status interno. */
export function statusDaAssinaturaMercadoPago(status: string | undefined): StatusAssinatura | null {
  switch (status) {
    case "authorized":
      return "ativa";
    case "paused":
      return "inadimplente";
    case "cancelled":
      return "cancelada";
    default:
      return null; // "pending": ainda não pagou a primeira vez, mantém como está
  }
}

/**
 * Resultado de uma cobrança mensal -> status interno. O cartão recusado não muda o status da assinatura no
 * Mercado Pago: depois das novas tentativas, a fatura fica "processed" com pagamento recusado.
 */
export function statusPelaCobrancaMensal(fatura: string | undefined, pagamento: string | undefined): StatusAssinatura | null {
  if (pagamento === "approved") return "ativa";
  if (fatura === "processed" && pagamento === "rejected") return "inadimplente";
  return null; // agendada ou ainda em novas tentativas
}

/** Avisos de um checkout abandonado ou de uma assinatura anterior não podem derrubar a assinatura ativa atual. */
export function assinaturaAntiga(
  atual: { assinatura_status: StatusAssinatura; mp_assinatura_id: string | null },
  preapprovalId: string,
  novoStatus: StatusAssinatura | null,
): boolean {
  return atual.assinatura_status === "ativa" && !!atual.mp_assinatura_id && atual.mp_assinatura_id !== preapprovalId && novoStatus !== "ativa";
}

export const MENSAGEM_SOMENTE_LEITURA =
  "Sua assinatura não está ativa: o app está em modo somente leitura. Seus dados continuam disponíveis. Regularize em Perfil > Assinatura.";
