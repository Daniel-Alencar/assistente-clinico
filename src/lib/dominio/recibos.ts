import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obterProvedorWhatsApp } from "@/lib/mensageria";
import { emailConfigurado, enviarEmail } from "@/lib/mensageria/email";
import { escaparHtml, formatarMoeda, primeiroNome, valorPorExtenso } from "./formatacao";
import { gerarTokenRecibo, VALIDADE_LINK_RECIBO_DIAS } from "./link-recibo";

export type DadosRecibo = {
  id: string;
  valor: number;
  pago_em: string;
  forma_pagamento: string | null;
  descricao: string | null;
  paciente: { nome: string; cpf: string | null; email: string | null; telefone_whatsapp: string | null; aceita_whatsapp: boolean } | null;
  profissional: { nome: string; cpf: string | null; profissao: string; registro_conselho: string | null; fuso_horario: string };
};

export class ReciboEnvioError extends Error {}

const FORMAS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "dinheiro",
  cartao: "cartão",
  transferencia: "transferência bancária",
  outro: "outro meio",
};

const PROFISSOES: Record<string, string> = { psicologo: "Psicólogo(a)", medico: "Médico(a)", outro: "Profissional de saúde" };

const formatarCpf = (cpf: string | null) => (cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : null);

/** Só cobranças pagas têm recibo. Quem define o acesso é o cliente recebido (RLS ou service role). */
export async function carregarRecibo(supabase: SupabaseClient, cobrancaId: string): Promise<DadosRecibo | null> {
  const { data } = await supabase
    .from("cobrancas")
    .select(
      "id, valor, status, pago_em, forma_pagamento, descricao, paciente:pacientes(nome, cpf, email, telefone_whatsapp, aceita_whatsapp), profissional:profissionais!inner(nome, cpf, profissao, registro_conselho, fuso_horario)",
    )
    .eq("id", cobrancaId)
    .maybeSingle();
  if (!data || data.status !== "paga" || !data.pago_em) return null;
  return { ...(data as unknown as DadosRecibo), valor: Number(data.valor) };
}

/** Textos do recibo já formatados, usados na página e no e-mail. */
export function textosRecibo(r: DadosRecibo) {
  return {
    numero: r.id.slice(0, 8).toUpperCase(),
    valor: formatarMoeda(r.valor),
    valorExtenso: valorPorExtenso(r.valor),
    cpfPaciente: formatarCpf(r.paciente?.cpf ?? null),
    referente: r.descricao?.toLowerCase() ?? "atendimento",
    forma: r.forma_pagamento ? (FORMAS[r.forma_pagamento] ?? r.forma_pagamento) : null,
    data: new Date(r.pago_em).toLocaleDateString("pt-BR", {
      timeZone: r.profissional.fuso_horario,
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    cargo: [PROFISSOES[r.profissional.profissao] ?? "", r.profissional.registro_conselho].filter(Boolean).join(" · "),
    cpfProfissional: formatarCpf(r.profissional.cpf),
  };
}

function htmlRecibo(r: DadosRecibo) {
  const t = textosRecibo(r);
  const e = escaparHtml;
  const paciente = `<strong>${e(r.paciente?.nome ?? "—")}</strong>${t.cpfPaciente ? `, CPF ${t.cpfPaciente}` : ""}`;
  const forma = t.forma ? `, paga via ${e(t.forma)}` : "";
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px">
      <div style="background:#ffffff;border-radius:16px;padding:32px">
        <h1 style="margin:0;font-size:22px">RECIBO</h1>
        <p style="margin:4px 0 24px;font-size:13px;color:#78716c">Nº ${t.numero} · ${t.valor}</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7">
          Recebi de ${paciente}, a importância de <strong>${t.valor}</strong> (${e(t.valorExtenso)}), referente a ${e(t.referente)}${forma}.
        </p>
        <p style="margin:0 0 32px;font-size:15px">${e(t.data)}.</p>
        <p style="margin:0;font-size:15px;font-weight:bold">${e(r.profissional.nome)}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#57534e">${e(t.cargo)}</p>
        ${t.cpfProfissional ? `<p style="margin:4px 0 0;font-size:13px;color:#57534e">CPF ${t.cpfProfissional}</p>` : ""}
      </div>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#78716c;text-align:center">
        Guarde este e-mail para o Imposto de Renda. Dúvidas? Responda esta mensagem para falar com ${e(r.profissional.nome)}.
      </p>
    </div>
  </body>
</html>`;
}

async function enviarPorEmail(r: DadosRecibo, responderPara?: string) {
  if (!r.paciente?.email) throw new ReciboEnvioError("Paciente sem e-mail cadastrado.");
  if (!emailConfigurado()) throw new ReciboEnvioError("O envio por e-mail ainda não foi configurado no sistema.");
  await enviarEmail({
    para: r.paciente.email,
    assunto: `Recibo de ${formatarMoeda(r.valor)} - ${r.profissional.nome}`,
    html: htmlRecibo(r),
    responderPara,
  });
}

async function enviarPorWhatsApp(r: DadosRecibo) {
  const paciente = r.paciente;
  if (!paciente?.telefone_whatsapp || !paciente.aceita_whatsapp) {
    throw new ReciboEnvioError("Paciente sem WhatsApp autorizado.");
  }
  const segredo = process.env.RECIBO_LINK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!segredo || !appUrl) throw new ReciboEnvioError("O envio por WhatsApp ainda não foi configurado no sistema.");

  const link = `${appUrl}/r/${gerarTokenRecibo(r.id, segredo)}`;
  const nome = primeiroNome(paciente.nome);
  const valor = formatarMoeda(r.valor);
  await obterProvedorWhatsApp().enviarTemplate({
    telefone: paciente.telefone_whatsapp,
    template: "recibo_sessao",
    parametros: [nome, valor, link],
    textoAlternativo: `Olá, ${nome}! Seu recibo de ${valor} está em ${link} (o link vale por ${VALIDADE_LINK_RECIBO_DIAS} dias).`,
  });
}

export async function enviarRecibo(
  supabase: SupabaseClient,
  cobrancaId: string,
  canal: "whatsapp" | "email",
  responderPara?: string,
) {
  const recibo = await carregarRecibo(supabase, cobrancaId);
  if (!recibo) throw new ReciboEnvioError("Recibo não encontrado.");
  if (canal === "email") await enviarPorEmail(recibo, responderPara);
  else await enviarPorWhatsApp(recibo);
}
