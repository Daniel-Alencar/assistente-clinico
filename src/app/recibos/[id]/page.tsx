import { notFound } from "next/navigation";
import { formatarMoeda, valorPorExtenso } from "@/lib/dominio/formatacao";
import { usuarioAtual } from "@/lib/servidor";
import { BotaoImprimir } from "./botao-imprimir";

const FORMAS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "dinheiro",
  cartao: "cartão",
  transferencia: "transferência bancária",
  outro: "outro meio",
};

const PROFISSOES: Record<string, string> = { psicologo: "Psicólogo(a)", medico: "Médico(a)", outro: "Profissional de saúde" };

const formatarCpf = (cpf: string | null) => (cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : null);

/** Recibo para imprimir ou salvar em PDF (Ctrl+P). Página fora do menu para sair limpa na impressão. */
export default async function Recibo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await usuarioAtual();

  const [{ data: cobranca }, { data: profissional }] = await Promise.all([
    supabase
      .from("cobrancas")
      .select("id, valor, status, pago_em, forma_pagamento, descricao, paciente:pacientes(nome, cpf)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("profissionais").select("nome, cpf, profissao, registro_conselho, fuso_horario").eq("id", user.id).single(),
  ]);
  if (!cobranca || cobranca.status !== "paga" || !profissional) notFound();

  const paciente = cobranca.paciente as unknown as { nome: string; cpf: string | null } | null;
  const valor = Number(cobranca.valor);
  const dataPagamento = new Date(cobranca.pago_em!).toLocaleDateString("pt-BR", {
    timeZone: profissional.fuso_horario,
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <BotaoImprimir />
      </div>
      <article className="rounded-2xl border border-stone-300 bg-white p-10 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between border-b border-stone-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RECIBO</h1>
            <p className="mt-1 text-sm text-stone-500">Nº {cobranca.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{formatarMoeda(valor)}</p>
        </header>

        <p className="mt-8 leading-8 text-stone-800">
          Recebi de <strong>{paciente?.nome ?? "—"}</strong>
          {paciente?.cpf && <>, CPF {formatarCpf(paciente.cpf)}</>}, a importância de <strong>{formatarMoeda(valor)}</strong>{" "}
          ({valorPorExtenso(valor)}), referente a {cobranca.descricao?.toLowerCase() ?? "atendimento"}
          {cobranca.forma_pagamento && <>, paga via {FORMAS[cobranca.forma_pagamento] ?? cobranca.forma_pagamento}</>}.
        </p>

        <p className="mt-8 text-stone-800">{dataPagamento}.</p>

        <footer className="mt-20 flex flex-col items-center text-center">
          <div className="w-72 border-t border-stone-400" />
          <p className="mt-2 font-semibold">{profissional.nome}</p>
          <p className="text-sm text-stone-600">
            {PROFISSOES[profissional.profissao] ?? ""}
            {profissional.registro_conselho && ` · ${profissional.registro_conselho}`}
          </p>
          {profissional.cpf && <p className="text-sm text-stone-600">CPF {formatarCpf(profissional.cpf)}</p>}
        </footer>
      </article>
      <p className="mt-6 text-center text-xs text-stone-500 print:hidden">
        Profissionais de saúde pessoa física também devem registrar o recibo no app Receita Saúde.
      </p>
    </main>
  );
}
