"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { registrarPagamento, reenviarCobranca } from "@/lib/dominio/cobrancas";
import { enviarRecibo, ReciboEnvioError } from "@/lib/dominio/recibos";
import { bloqueioDeEscrita, usuarioAtual } from "@/lib/servidor";
import type { EstadoForm } from "./acoes";

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

export async function enviarReciboAoPaciente(cobrancaId: string, canal: "whatsapp" | "email"): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();
  if (!Uuid.safeParse(cobrancaId).success || !["whatsapp", "email"].includes(canal)) return { erro: "Recibo inválido." };
  const bloqueio = await bloqueioDeEscrita(supabase, user.id);
  if (bloqueio) return { erro: bloqueio };

  try {
    await enviarRecibo(supabase, cobrancaId, canal, user.email);
    return { ok: true };
  } catch (erro) {
    if (erro instanceof ReciboEnvioError) return { erro: erro.message };
    console.error("Falha ao enviar recibo", erro);
    return { erro: "Não foi possível enviar o recibo. Tente novamente." };
  }
}
