import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarAssinatura, buscarFatura } from "@/lib/pagamentos/mercadopago";
import { assinaturaAntiga, statusDaAssinaturaMercadoPago, statusPelaCobrancaMensal, type StatusAssinatura } from "./assinatura";

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
  const { data: atual } = await admin
    .from("profissionais")
    .select("assinatura_status, mp_assinatura_id")
    .eq("id", profissionalId)
    .maybeSingle();
  if (!atual || assinaturaAntiga(atual as { assinatura_status: StatusAssinatura; mp_assinatura_id: string | null }, preapprovalId, status)) return null;

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

/** Aplica o resultado de uma cobrança mensal: só alterna entre ativa e inadimplente, nunca revive uma assinatura cancelada. */
export async function sincronizarCobrancaMensal(admin: SupabaseClient, faturaId: string) {
  const fatura = await buscarFatura(faturaId);
  const status = statusPelaCobrancaMensal(fatura.status, fatura.payment?.status);
  if (!status || !fatura.preapproval_id) return;

  const { error } = await admin
    .from("profissionais")
    .update({ assinatura_status: status, assinatura_atualizada_em: new Date().toISOString() })
    .eq("mp_assinatura_id", fatura.preapproval_id)
    .eq("assinatura_status", status === "ativa" ? "inadimplente" : "ativa");
  if (error) throw error;
}
