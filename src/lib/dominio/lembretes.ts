import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obterProvedorWhatsApp } from "@/lib/mensageria";
import { formatarDataHora, primeiroNome } from "./formatacao";

type ConsultaParaLembrete = {
  id: string;
  inicio: string;
  profissional_id: string;
  paciente_id: string;
  paciente: { nome: string; telefone_whatsapp: string | null; aceita_whatsapp: boolean };
  profissional: { nome: string; fuso_horario: string };
};

/** Envia lembrete para consultas nas próximas 24h que ainda não receberam. Idempotente. */
export async function enviarLembretesPendentes(supabase: SupabaseClient) {
  const agora = new Date();
  const limite = new Date(agora.getTime() + 24 * 3_600_000);

  const { data, error } = await supabase
    .from("consultas")
    .select(
      "id, inicio, profissional_id, paciente_id, paciente:pacientes!inner(nome, telefone_whatsapp, aceita_whatsapp), profissional:profissionais!inner(nome, fuso_horario)",
    )
    .eq("status", "agendada")
    .is("lembrete_enviado_em", null)
    .gte("inicio", agora.toISOString())
    .lte("inicio", limite.toISOString());

  if (error) throw error;

  const whatsapp = obterProvedorWhatsApp();
  const resultado = { enviados: 0, ignorados: 0, falhas: 0 };

  for (const consulta of (data ?? []) as unknown as ConsultaParaLembrete[]) {
    const { paciente, profissional } = consulta;
    if (!paciente.aceita_whatsapp || !paciente.telefone_whatsapp) {
      resultado.ignorados++;
      continue;
    }

    const { data: dia, hora } = formatarDataHora(consulta.inicio, profissional.fuso_horario);
    const parametros = [primeiroNome(paciente.nome), profissional.nome, dia, hora];

    try {
      // Template de utilidade "lembrete_consulta" precisa estar aprovado na Meta,
      // com botões de resposta rápida "Confirmar" e "Cancelar".
      const envio = await whatsapp.enviarTemplate({
        telefone: paciente.telefone_whatsapp,
        template: "lembrete_consulta",
        parametros,
        textoAlternativo:
          `Olá, ${parametros[0]}! Lembrete da sua consulta com ${profissional.nome} ` +
          `${dia} às ${hora}. Responda CONFIRMAR ou CANCELAR.`,
      });

      await supabase
        .from("consultas")
        .update({ lembrete_enviado_em: new Date().toISOString() })
        .eq("id", consulta.id);

      await supabase.from("mensagens").insert({
        profissional_id: consulta.profissional_id,
        paciente_id: consulta.paciente_id,
        direcao: "saida",
        tipo: "lembrete",
        provedor: envio.provedor,
        provedor_message_id: envio.idMensagem,
      });
      resultado.enviados++;
    } catch (erro) {
      console.error(`Falha ao enviar lembrete da consulta ${consulta.id}`, erro);
      resultado.falhas++;
    }
  }

  return resultado;
}
