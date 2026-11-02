import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { exigirEnv } from "@/lib/env";

function clientePagamentos() {
  return new Payment(new MercadoPagoConfig({ accessToken: exigirEnv("MERCADOPAGO_ACCESS_TOKEN") }));
}

export type CobrancaPix = {
  mpPaymentId: string;
  copiaECola: string | null;
  qrBase64: string | null;
  linkPagamento: string | null;
};

export async function criarCobrancaPix(params: {
  cobrancaId: string; // vira external_reference, usado para conciliar no webhook
  valor: number;
  descricao: string;
  emailPagador: string;
  expiraEmHoras?: number;
}): Promise<CobrancaPix> {
  const expiracao = new Date(Date.now() + (params.expiraEmHoras ?? 72) * 3_600_000);

  const pagamento = await clientePagamentos().create({
    body: {
      transaction_amount: params.valor,
      description: params.descricao,
      payment_method_id: "pix",
      payer: { email: params.emailPagador },
      external_reference: params.cobrancaId,
      date_of_expiration: expiracao.toISOString(),
      notification_url: `${exigirEnv("NEXT_PUBLIC_APP_URL")}/api/webhooks/mercadopago`,
    },
    requestOptions: { idempotencyKey: params.cobrancaId },
  });

  const dadosPix = pagamento.point_of_interaction?.transaction_data;
  return {
    mpPaymentId: String(pagamento.id),
    copiaECola: dadosPix?.qr_code ?? null,
    qrBase64: dadosPix?.qr_code_base64 ?? null,
    linkPagamento: dadosPix?.ticket_url ?? null,
  };
}

export function buscarPagamento(id: string) {
  return clientePagamentos().get({ id });
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
  const esperado = createHmac("sha256", exigirEnv("MERCADOPAGO_WEBHOOK_SECRET"))
    .update(manifesto)
    .digest("hex");

  return esperado.length === v1.length && timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
}
