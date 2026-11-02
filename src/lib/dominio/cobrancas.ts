import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obterProvedorWhatsApp } from "@/lib/mensageria";
import { buscarPagamento, criarCobrancaPix } from "@/lib/pagamentos/mercadopago";
import { formatarMoeda, primeiroNome } from "./formatacao";

type ConsultaParaCobranca = {
  id: string;
  valor: number | null;
  profissional_id: string;
  paciente_id: string;
  paciente: { nome: string; email: string | null; telefone_whatsapp: string | null; aceita_whatsapp: boolean };
  profissional: { nome: string; valor_sessao_padrao: number | null };
};

/** Cria a cobrança Pix de uma consulta e envia o "copia e cola" ao paciente. */
export async function cobrarConsulta(supabase: SupabaseClient, consultaId: string) {
  const { data, error } = await supabase
    .from("consultas")
    .select(
      "id, valor, profissional_id, paciente_id, paciente:pacientes!inner(nome, email, telefone_whatsapp, aceita_whatsapp), profissional:profissionais!inner(nome, valor_sessao_padrao)",
    )
    .eq("id", consultaId)
    .single();
  if (error) throw error;

  const consulta = data as unknown as ConsultaParaCobranca;
  const valor = consulta.valor ?? consulta.profissional.valor_sessao_padrao;
  if (!valor) throw new Error("Consulta sem valor definido.");
  if (!consulta.paciente.email) throw new Error("Paciente sem e-mail (exigido pelo Mercado Pago).");

  const { data: cobranca, error: erroInsercao } = await supabase
    .from("cobrancas")
    .insert({
      profissional_id: consulta.profissional_id,
      paciente_id: consulta.paciente_id,
      consulta_id: consulta.id,
      valor,
    })
    .select("id")
    .single();
  if (erroInsercao) throw erroInsercao;

  const pix = await criarCobrancaPix({
    cobrancaId: cobranca.id,
    valor,
    descricao: `Sessão com ${consulta.profissional.nome}`,
    emailPagador: consulta.paciente.email,
  });

  await supabase
    .from("cobrancas")
    .update({
      mp_payment_id: pix.mpPaymentId,
      pix_copia_e_cola: pix.copiaECola,
      pix_qr_base64: pix.qrBase64,
    })
    .eq("id", cobranca.id);

  const { paciente } = consulta;
  if (paciente.aceita_whatsapp && paciente.telefone_whatsapp && pix.copiaECola) {
    await obterProvedorWhatsApp().enviarTemplate({
      telefone: paciente.telefone_whatsapp,
      template: "cobranca_sessao",
      parametros: [primeiroNome(paciente.nome), formatarMoeda(valor), pix.copiaECola],
      textoAlternativo:
        `Olá, ${primeiroNome(paciente.nome)}! Segue o Pix da sessão (${formatarMoeda(valor)}).\n\n` +
        `Copia e cola:\n${pix.copiaECola}`,
    });
  }

  return { cobrancaId: cobranca.id, ...pix };
}

const STATUS_MP: Record<string, string> = {
  approved: "paga",
  cancelled: "cancelada",
  expired: "expirada",
  refunded: "estornada",
  charged_back: "estornada",
};

/** Chamado pelo webhook: consulta o pagamento no Mercado Pago e atualiza a cobrança. */
export async function sincronizarPagamento(supabase: SupabaseClient, mpPaymentId: string) {
  const pagamento = await buscarPagamento(mpPaymentId);
  const novoStatus = pagamento.status ? STATUS_MP[pagamento.status] : undefined;
  if (!pagamento.external_reference || !novoStatus) return;

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .update({
      status: novoStatus,
      mp_payment_id: mpPaymentId,
      pago_em: novoStatus === "paga" ? (pagamento.date_approved ?? new Date().toISOString()) : null,
    })
    .eq("id", pagamento.external_reference)
    .neq("status", novoStatus) // evita reprocessar notificações repetidas
    .select("valor, paciente:pacientes!inner(nome, telefone_whatsapp, aceita_whatsapp)")
    .maybeSingle();

  const paciente = cobranca?.paciente as unknown as
    | { nome: string; telefone_whatsapp: string | null; aceita_whatsapp: boolean }
    | undefined;

  if (novoStatus === "paga" && paciente?.aceita_whatsapp && paciente.telefone_whatsapp) {
    await obterProvedorWhatsApp().enviarTemplate({
      telefone: paciente.telefone_whatsapp,
      template: "pagamento_recebido",
      parametros: [primeiroNome(paciente.nome), formatarMoeda(Number(cobranca!.valor))],
      textoAlternativo: `Pagamento de ${formatarMoeda(Number(cobranca!.valor))} recebido. Obrigado, ${primeiroNome(paciente.nome)}!`,
    });
  }
}
