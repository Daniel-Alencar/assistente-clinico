"use server";

import { redirect } from "next/navigation";
import { cancelarAssinaturaMercadoPago, criarAssinatura } from "@/lib/pagamentos/mercadopago";
import { sincronizarAssinatura } from "@/lib/dominio/sincronizar-assinatura";
import { usuarioAtual } from "@/lib/servidor";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function assinar() {
  const { user } = await usuarioAtual();
  if (!user.email) redirect("/assinatura?erro=email");
  let link: string;
  try {
    link = await criarAssinatura({ profissionalId: user.id, email: user.email });
  } catch (erro) {
    console.error("Falha ao criar assinatura", erro);
    redirect("/assinatura?erro=mercadopago");
  }
  redirect(link);
}

export async function cancelarAssinatura() {
  const { supabase, user } = await usuarioAtual();
  const { data } = await supabase.from("profissionais").select("mp_assinatura_id").eq("id", user.id).single();
  if (data?.mp_assinatura_id) {
    await cancelarAssinaturaMercadoPago(data.mp_assinatura_id);
    await sincronizarAssinatura(criarClienteAdmin(), data.mp_assinatura_id, user.id);
  }
  redirect("/assinatura");
}
