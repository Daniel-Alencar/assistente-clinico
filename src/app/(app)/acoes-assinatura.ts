"use server";

import { MPBadRequestError } from "mercadopago";
import { redirect } from "next/navigation";
import { cancelarAssinaturaMercadoPago, criarAssinatura } from "@/lib/pagamentos/mercadopago";
import { sincronizarAssinatura } from "@/lib/dominio/sincronizar-assinatura";
import { usuarioAtual } from "@/lib/servidor";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function assinar() {
  const { supabase, user } = await usuarioAtual();
  if (!user.email) redirect("/assinatura?erro=email");

  const { data: atual } = await supabase.from("profissionais").select("assinatura_status, mp_assinatura_id").eq("id", user.id).single();
  if (atual?.assinatura_status === "ativa") redirect("/assinatura");

  let link: string;
  try {
    // Uma assinatura antiga com cartão recusado segue ativa no Mercado Pago e cobraria em dobro.
    if (atual?.mp_assinatura_id) await cancelarAssinaturaMercadoPago(atual.mp_assinatura_id).catch(() => null);
    link = await criarAssinatura({ profissionalId: user.id, email: user.email });
  } catch (erro) {
    console.error("Falha ao criar assinatura", erro);
    redirect(`/assinatura?erro=${erro instanceof MPBadRequestError ? "recusado" : "mercadopago"}`);
  }
  redirect(link);
}

export async function cancelarAssinatura() {
  const { supabase, user } = await usuarioAtual();
  const { data } = await supabase.from("profissionais").select("mp_assinatura_id").eq("id", user.id).single();
  if (data?.mp_assinatura_id) {
    try {
      await cancelarAssinaturaMercadoPago(data.mp_assinatura_id);
      await sincronizarAssinatura(criarClienteAdmin(), data.mp_assinatura_id, user.id);
    } catch (erro) {
      console.error("Falha ao cancelar assinatura", erro);
      redirect("/assinatura?erro=cancelar");
    }
  }
  redirect("/assinatura");
}
