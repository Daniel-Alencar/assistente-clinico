import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obterProvedorWhatsApp } from "@/lib/mensageria";
import { formatarMoeda, primeiroNome } from "./formatacao";
import { gerarPixCopiaECola } from "./pix";

// Cobrança da sessão (paciente paga o profissional). O Pix usa a chave do próprio
// profissional, então o dinheiro cai direto na conta dele; a plataforma não intermedeia.
// Como não há confirmação automática, o profissional marca a cobrança como paga.

type ConsultaParaCobranca = {
  id: string;
  inicio: string;
  valor: number | null;
  profissional_id: string;
  paciente_id: string;
  paciente: { nome: string; telefone_whatsapp: string | null; aceita_whatsapp: boolean };
  profissional: { nome: string; valor_sessao_padrao: number | null; chave_pix: string | null; fuso_horario: string };
};

export class CobrancaInvalidaError extends Error {}

/** Cria a cobrança Pix de uma consulta e envia o "copia e cola" ao paciente pelo WhatsApp. */
export async function cobrarConsulta(supabase: SupabaseClient, consultaId: string) {
  const { data, error } = await supabase
    .from("consultas")
    .select(
      "id, inicio, valor, profissional_id, paciente_id, paciente:pacientes!inner(nome, telefone_whatsapp, aceita_whatsapp), profissional:profissionais!inner(nome, valor_sessao_padrao, chave_pix, fuso_horario)",
    )
    .eq("id", consultaId)
    .single();
  if (error) throw error;

  const consulta = data as unknown as ConsultaParaCobranca;
  const valor = Number(consulta.valor ?? consulta.profissional.valor_sessao_padrao);
  if (!valor) throw new CobrancaInvalidaError("Consulta sem valor definido. Defina o valor ou o valor padrão no Perfil.");
  if (!consulta.profissional.chave_pix) {
    throw new CobrancaInvalidaError("Cadastre sua chave Pix em Perfil para cobrar pelo app.");
  }

  const dia = new Date(consulta.inicio).toLocaleDateString("pt-BR", { timeZone: consulta.profissional.fuso_horario });
  const pix = gerarPixCopiaECola({
    chave: consulta.profissional.chave_pix,
    nomeRecebedor: consulta.profissional.nome,
    valorCentavos: Math.round(valor * 100),
    descricao: `Sessao ${dia}`,
  });

  const { data: cobranca, error: erroInsercao } = await supabase
    .from("cobrancas")
    .insert({
      profissional_id: consulta.profissional_id,
      paciente_id: consulta.paciente_id,
      consulta_id: consulta.id,
      valor,
      descricao: `Sessão de ${dia}`,
      pix_copia_e_cola: pix,
    })
    .select("id")
    .single();
  if (erroInsercao) throw erroInsercao;

  const enviado = await enviarPix(consulta.paciente, valor, pix);
  return { cobrancaId: cobranca.id, pixCopiaECola: pix, enviadoWhatsApp: enviado };
}

async function enviarPix(
  paciente: { nome: string; telefone_whatsapp: string | null; aceita_whatsapp: boolean },
  valor: number,
  pix: string,
): Promise<boolean> {
  if (!paciente.aceita_whatsapp || !paciente.telefone_whatsapp) return false;
  await obterProvedorWhatsApp().enviarTemplate({
    telefone: paciente.telefone_whatsapp,
    template: "cobranca_sessao",
    parametros: [primeiroNome(paciente.nome), formatarMoeda(valor), pix],
    textoAlternativo:
      `Olá, ${primeiroNome(paciente.nome)}! Segue o Pix da sessão (${formatarMoeda(valor)}).\n\n` + `Copia e cola:\n${pix}`,
  });
  return true;
}

type CobrancaComPaciente = {
  id: string;
  valor: number;
  status: string;
  pix_copia_e_cola: string | null;
  paciente: { nome: string; telefone_whatsapp: string | null; aceita_whatsapp: boolean };
};

async function carregar(supabase: SupabaseClient, cobrancaId: string) {
  const { data } = await supabase
    .from("cobrancas")
    .select("id, valor, status, pix_copia_e_cola, paciente:pacientes!inner(nome, telefone_whatsapp, aceita_whatsapp)")
    .eq("id", cobrancaId)
    .maybeSingle();
  return data as unknown as CobrancaComPaciente | null;
}

export async function reenviarCobranca(supabase: SupabaseClient, cobrancaId: string): Promise<boolean> {
  const c = await carregar(supabase, cobrancaId);
  if (!c || c.status !== "pendente" || !c.pix_copia_e_cola) return false;
  return enviarPix(c.paciente, Number(c.valor), c.pix_copia_e_cola);
}

/** Registra o pagamento (Pix conferido no banco, dinheiro, cartão...) e avisa o paciente. */
export async function registrarPagamento(supabase: SupabaseClient, cobrancaId: string, forma: string) {
  const c = await carregar(supabase, cobrancaId);
  if (!c || c.status !== "pendente") return;

  await supabase
    .from("cobrancas")
    .update({ status: "paga", pago_em: new Date().toISOString(), forma_pagamento: forma })
    .eq("id", cobrancaId)
    .eq("status", "pendente");

  if (c.paciente.aceita_whatsapp && c.paciente.telefone_whatsapp) {
    await obterProvedorWhatsApp().enviarTemplate({
      telefone: c.paciente.telefone_whatsapp,
      template: "pagamento_recebido",
      parametros: [primeiroNome(c.paciente.nome), formatarMoeda(Number(c.valor))],
      textoAlternativo: `Pagamento de ${formatarMoeda(Number(c.valor))} recebido. Obrigado, ${primeiroNome(c.paciente.nome)}!`,
    });
  }
}
