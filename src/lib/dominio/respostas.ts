import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obterProvedorWhatsApp, type MensagemRecebida } from "@/lib/mensageria";

type Intencao = "confirmar" | "cancelar" | "desconhecida";

function interpretar(texto: string): Intencao {
  const normalizado = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  if (/^(confirm|sim\b|ok\b|1$)/.test(normalizado)) return "confirmar";
  if (/^(cancel|nao\b|desmarc|2$)/.test(normalizado)) return "cancelar";
  return "desconhecida";
}

/** Trata a resposta do paciente ao lembrete: confirma ou cancela a próxima consulta. */
export async function processarResposta(supabase: SupabaseClient, mensagem: MensagemRecebida) {
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, profissional_id")
    .eq("telefone_whatsapp", mensagem.telefone)
    .eq("ativo", true);

  if (!pacientes?.length) return;

  const { data: consulta } = await supabase
    .from("consultas")
    .select("id, profissional_id, paciente_id")
    .in("paciente_id", pacientes.map((p) => p.id))
    .eq("status", "agendada")
    .gte("inicio", new Date().toISOString())
    .order("inicio")
    .limit(1)
    .maybeSingle();

  await supabase.from("mensagens").insert({
    profissional_id: consulta?.profissional_id ?? pacientes[0].profissional_id,
    paciente_id: consulta?.paciente_id ?? pacientes[0].id,
    direcao: "entrada",
    tipo: "resposta",
    provedor: process.env.WHATSAPP_PROVIDER ?? "console",
    provedor_message_id: mensagem.idMensagem,
    conteudo: mensagem.texto,
  });

  if (!consulta) return;

  const intencao = interpretar(mensagem.texto);
  if (intencao === "desconhecida") return; // TODO: encaminhar ao profissional

  await supabase
    .from("consultas")
    .update({ status: intencao === "confirmar" ? "confirmada" : "cancelada" })
    .eq("id", consulta.id);

  // Dentro da janela de 24h aberta pela resposta do paciente: texto livre, sem custo de template.
  await obterProvedorWhatsApp().enviarTexto(
    mensagem.telefone,
    intencao === "confirmar"
      ? "Consulta confirmada. Até lá!"
      : "Consulta cancelada. Se quiser remarcar, é só responder por aqui.",
  );
}
