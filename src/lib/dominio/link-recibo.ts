// Link do recibo enviado ao paciente, que não tem login no app. Puro: sem dependências do Next, testável.
// O link é assinado e expira, então não dá para adivinhar nem alterar o id da cobrança.
import { createHmac, timingSafeEqual } from "node:crypto";

export const VALIDADE_LINK_RECIBO_DIAS = 30;

function assinar(base: string, segredo: string) {
  return createHmac("sha256", segredo).update(base).digest("base64url");
}

export function gerarTokenRecibo(cobrancaId: string, segredo: string, agora = Date.now()): string {
  const expira = Math.floor(agora / 1000) + VALIDADE_LINK_RECIBO_DIAS * 86_400;
  const base = `${cobrancaId}.${expira}`;
  return `${base}.${assinar(base, segredo)}`;
}

/** Retorna o id da cobrança, ou null se o token for inválido ou estiver expirado. */
export function validarTokenRecibo(token: string, segredo: string, agora = Date.now()): string | null {
  const [cobrancaId, expira, assinatura, ...resto] = token.split(".");
  if (!cobrancaId || !expira || !assinatura || resto.length) return null;

  const esperado = Buffer.from(assinar(`${cobrancaId}.${expira}`, segredo));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;

  return Number(expira) * 1000 > agora ? cobrancaId : null;
}
