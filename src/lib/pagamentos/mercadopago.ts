import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { PRECO_MENSAL } from "@/lib/dominio/assinatura";
import { exigirEnv } from "@/lib/env";

// Mercado Pago é usado só para a ASSINATURA DA PLATAFORMA (o profissional paga o SaaS),
// por isso há um único access token: o do dono do Assistente Clínico.
// A cobrança das sessões (paciente -> profissional) usa a chave Pix do profissional; ver dominio/cobrancas.ts.

function assinaturas() {
  return new PreApproval(new MercadoPagoConfig({ accessToken: exigirEnv("MERCADOPAGO_ACCESS_TOKEN") }));
}

/** Cria a assinatura mensal e devolve o link de checkout do Mercado Pago. */
export async function criarAssinatura(params: { profissionalId: string; email: string }): Promise<string> {
  const assinatura = await assinaturas().create({
    body: {
      reason: "Assistente Clínico — plano mensal",
      external_reference: params.profissionalId,
      payer_email: params.email,
      back_url: `${exigirEnv("NEXT_PUBLIC_APP_URL")}/assinatura`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PRECO_MENSAL,
        currency_id: "BRL",
      },
    },
  });
  if (!assinatura.init_point) throw new Error("Mercado Pago não retornou o link da assinatura.");
  return assinatura.init_point;
}

export function buscarAssinatura(id: string) {
  return assinaturas().get({ id });
}

export function cancelarAssinaturaMercadoPago(id: string) {
  return assinaturas().update({ id, body: { status: "cancelled" } });
}

/**
 * Valida o header x-signature ("ts=...,v1=...") das notificações do Mercado Pago.
 * Manifesto: id:{data.id};request-id:{x-request-id};ts:{ts};
 */
export function assinaturaMercadoPagoValida(params: {
  assinatura: string | null;
  requestId: string | null;
  dataId: string;
}): boolean {
  if (!params.assinatura || !params.requestId) return false;

  const partes = Object.fromEntries(
    params.assinatura.split(",").map((parte) => parte.trim().split("=") as [string, string]),
  );
  const { ts, v1 } = partes;
  if (!ts || !v1) return false;

  const manifesto = `id:${params.dataId.toLowerCase()};request-id:${params.requestId};ts:${ts};`;
  const esperado = createHmac("sha256", exigirEnv("MERCADOPAGO_WEBHOOK_SECRET")).update(manifesto).digest("hex");

  return esperado.length === v1.length && timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
}
