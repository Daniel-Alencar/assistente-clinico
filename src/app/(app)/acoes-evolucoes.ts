"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EvolucaoSchema } from "@/lib/ia/esquemas";
import { bloqueioDeEscrita, registrarAcesso, usuarioAtual } from "@/lib/servidor";
import type { EstadoForm } from "./acoes";

const Uuid = z.uuid();

/** Uma linha por item nos campos de lista. */
const lista = (form: FormData, campo: string) =>
  String(form.get(campo) ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Salva as edições do profissional. Com `revisar`, marca como revisada e trava:
 * a partir daí a evolução vale como prontuário e não pode mais ser alterada.
 */
export async function salvarEvolucao(
  evolucaoId: string,
  revisar: boolean,
  _: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();
  const bloqueio = await bloqueioDeEscrita(supabase, user.id);
  if (bloqueio) return { erro: bloqueio };
  if (!Uuid.safeParse(evolucaoId).success) return { erro: "Evolução inválida." };

  const conteudo = EvolucaoSchema.safeParse({
    resumo: String(form.get("resumo") ?? "").trim(),
    temas_abordados: lista(form, "temas_abordados"),
    intervencoes: lista(form, "intervencoes"),
    observacoes_clinicas: String(form.get("observacoes_clinicas") ?? "").trim(),
    plano_proxima_sessao: String(form.get("plano_proxima_sessao") ?? "").trim(),
    alertas: lista(form, "alertas"),
    // Ao revisar, o profissional já resolveu os pontos em aberto.
    pontos_a_confirmar: revisar ? [] : lista(form, "pontos_a_confirmar"),
  });
  if (!conteudo.success || !conteudo.data.resumo) return { erro: "O resumo da evolução é obrigatório." };

  const agora = new Date().toISOString();
  const { data, error } = await supabase
    .from("evolucoes")
    .update({ conteudo: conteudo.data, atualizado_em: agora, ...(revisar ? { revisada: true, revisada_em: agora } : {}) })
    .eq("id", evolucaoId)
    .eq("revisada", false)
    .select("paciente_id")
    .maybeSingle();
  if (error || !data) return { erro: "Não foi possível salvar. Evoluções revisadas não podem ser alteradas." };

  await registrarAcesso(supabase, {
    profissionalId: user.id,
    pacienteId: data.paciente_id,
    recurso: "evolucao",
    recursoId: evolucaoId,
    acao: revisar ? "revisar" : "editar",
  });
  revalidatePath(`/evolucoes/${evolucaoId}`);
  revalidatePath(`/pacientes/${data.paciente_id}`);
  return { ok: true, mensagem: revisar ? "Evolução revisada e registrada no prontuário." : "Rascunho salvo." };
}

/** Exclui um rascunho que não será usado. Evoluções revisadas não podem ser excluídas. */
export async function excluirEvolucao(evolucaoId: string) {
  const { supabase, user } = await usuarioAtual();
  if (!Uuid.safeParse(evolucaoId).success || (await bloqueioDeEscrita(supabase, user.id))) return;
  const { data } = await supabase
    .from("evolucoes")
    .delete()
    .eq("id", evolucaoId)
    .eq("revisada", false)
    .select("paciente_id")
    .maybeSingle();
  if (data) {
    await registrarAcesso(supabase, {
      profissionalId: user.id,
      pacienteId: data.paciente_id,
      recurso: "evolucao",
      recursoId: evolucaoId,
      acao: "excluir",
    });
    revalidatePath(`/pacientes/${data.paciente_id}`);
    redirect(`/pacientes/${data.paciente_id}`);
  }
  redirect("/pacientes");
}
