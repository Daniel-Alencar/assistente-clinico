import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obterProvedorWhatsApp, type MensagemRecebida } from "@/lib/mensageria";
import { primeiroNome } from "./formatacao";
import { interpretarResposta } from "./intencao";

type Paciente = { id: string; nome: string; profissional_id: string };

/**
 * Trata uma mensagem recebida de paciente: confirma ou cancela a próxima consulta,
 * descadastra quem pedir para sair e encaminha ao profissional o que não for reconhecido.
 */
export async function processarResposta(supabase: SupabaseClient, mensagem: MensagemRecebida) {
  const { data } = await supabase
    .from("pacientes")
    .select("id, nome, profissional_id")
    .eq("telefone_whatsapp", mensagem.telefone)
    .eq("ativo", true);
  const pacientes = (data ?? []) as Paciente[];
  if (!pacientes.length) return;

  const whatsapp = obterProvedorWhatsApp();
  const intencao = interpretarResposta(mensagem.texto);

  // Descadastro vale para todos os profissionais que atendem esse telefone (LGPD).
  if (intencao === "descadastrar") {
    await supabase
      .from("pacientes")
      .update({ aceita_whatsapp: false, whatsapp_descadastrado_em: new Date().toISOString() })
      .in("id", pacientes.map((p) => p.id));
    await registrar(supabase, pacientes[0], mensagem, "descadastro");
    await whatsapp.enviarTexto(mensagem.telefone, "Pronto, você não receberá mais mensagens automáticas.");
    return;
  }

  const { data: consulta } = await supabase
    .from("consultas")
    .select("id, profissional_id, paciente_id")
    .in("paciente_id", pacientes.map((p) => p.id))
    .eq("status", "agendada")
    .gte("inicio", new Date().toISOString())
    .order("inicio")
    .limit(1)
    .maybeSingle();

  const paciente = pacientes.find((p) => p.id === consulta?.paciente_id) ?? pacientes[0];

  if (consulta && intencao !== "desconhecida") {
    await registrar(supabase, paciente, mensagem, "resposta");
    await supabase
      .from("consultas")
      .update({ status: intencao === "confirmar" ? "confirmada" : "cancelada" })
      .eq("id", consulta.id);
    // Dentro da janela de 24h aberta pela resposta do paciente: texto livre, sem custo de template.
    await whatsapp.enviarTexto(
      mensagem.telefone,
      intencao === "confirmar"
        ? "Consulta confirmada. Até lá!"
        : "Consulta cancelada. Se quiser remarcar, é só responder por aqui.",
    );
    return;
  }

  // Não reconhecida: encaminha ao profissional, que decide o que fazer.
  await registrar(supabase, paciente, mensagem, "nao_reconhecida");
  const { data: profissional } = await supabase
    .from("profissionais")
    .select("nome, telefone")
    .eq("id", paciente.profissional_id)
    .single();
  if (profissional?.telefone) {
    await whatsapp.enviarTemplate({
      telefone: profissional.telefone,
      template: "aviso_profissional",
      parametros: [primeiroNome(profissional.nome), paciente.nome, mensagem.texto.slice(0, 500)],
      textoAlternativo: `Mensagem de ${paciente.nome} (não respondida automaticamente):\n\n${mensagem.texto.slice(0, 500)}`,
    });
  }
}

async function registrar(supabase: SupabaseClient, paciente: Paciente, mensagem: MensagemRecebida, tipo: string) {
  await supabase.from("mensagens").insert({
    profissional_id: paciente.profissional_id,
    paciente_id: paciente.id,
    direcao: "entrada",
    tipo,
    provedor: process.env.WHATSAPP_PROVIDER ?? "console",
    provedor_message_id: mensagem.idMensagem,
    conteudo: mensagem.texto,
  });
}
