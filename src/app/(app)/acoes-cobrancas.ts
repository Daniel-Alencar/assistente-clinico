"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { registrarPagamento, reenviarCobranca } from "@/lib/dominio/cobrancas";
import { bloqueioDeEscrita, usuarioAtual } from "@/lib/servidor";

const Uuid = z.uuid();
const FORMAS = ["pix", "dinheiro", "cartao", "transferencia", "outro"];

async function permitido(cobrancaId: string) {
  const { supabase, user } = await usuarioAtual();
  if (!Uuid.safeParse(cobrancaId).success || (await bloqueioDeEscrita(supabase, user.id))) return null;
  return supabase;
}

function atualizarTelas() {
  revalidatePath("/financeiro");
  revalidatePath("/agenda");
}

export async function marcarCobrancaPaga(cobrancaId: string, forma: string) {
  const supabase = await permitido(cobrancaId);
  if (!supabase || !FORMAS.includes(forma)) return;
  await registrarPagamento(supabase, cobrancaId, forma);
  atualizarTelas();
}

export async function cancelarCobranca(cobrancaId: string) {
  const supabase = await permitido(cobrancaId);
  if (!supabase) return;
  await supabase.from("cobrancas").update({ status: "cancelada" }).eq("id", cobrancaId).eq("status", "pendente");
  atualizarTelas();
}

export async function reenviarPix(cobrancaId: string) {
  const supabase = await permitido(cobrancaId);
  if (!supabase) return;
  await reenviarCobranca(supabase, cobrancaId);
}
