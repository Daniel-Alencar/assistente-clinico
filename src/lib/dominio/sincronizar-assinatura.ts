import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarAssinatura } from "@/lib/pagamentos/mercadopago";
import { statusDaAssinaturaMercadoPago } from "./assinatura";

/**
 * Lê a assinatura no Mercado Pago e atualiza o profissional.
 * `admin` precisa ser o cliente com service role: os campos de assinatura são protegidos contra o navegador.
 * `profissionalEsperado` (opcional) impede que alguém associe a assinatura de outra pessoa.
 */
export async function sincronizarAssinatura(admin: SupabaseClient, preapprovalId: string, profissionalEsperado?: string) {
  const assinatura = await buscarAssinatura(preapprovalId);
  const profissionalId = assinatura.external_reference;
  if (!profissionalId || (profissionalEsperado && profissionalId !== profissionalEsperado)) return null;

  const status = statusDaAssinaturaMercadoPago(assinatura.status);
  const { error } = await admin
    .from("profissionais")
    .update({
      mp_assinatura_id: preapprovalId,
      assinatura_atualizada_em: new Date().toISOString(),
      ...(status ? { assinatura_status: status } : {}),
    })
    .eq("id", profissionalId);
  if (error) throw error;
  return status;
}
