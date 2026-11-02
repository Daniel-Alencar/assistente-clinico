import Link from "next/link";
import { notFound } from "next/navigation";
import { alterarAtivoPaciente } from "@/app/(app)/acoes";
import { botaoSecundario } from "@/components/estilos";
import { formatarDataHora } from "@/lib/dominio/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { ROTULO_STATUS } from "../../agenda/status";
import { FormularioPaciente, type DadosPaciente } from "../formulario-paciente";

type Props = { params: Promise<{ id: string }> };

export default async function DetalhePaciente({ params }: Props) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  const [{ data: paciente }, { data: consultas }, { data: evolucoes }, { data: perfil }] = await Promise.all([
    supabase
      .from("pacientes")
      .select("id, nome, telefone_whatsapp, email, cpf, data_nascimento, aceita_whatsapp, ativo")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("consultas")
      .select("id, inicio, status")
      .eq("paciente_id", id)
      .order("inicio", { ascending: false })
      .limit(20),
    supabase
      .from("evolucoes")
      .select("id, criado_em, revisada, conteudo")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .limit(20),
    supabase.from("profissionais").select("fuso_horario").single(),
  ]);
  if (!paciente) notFound();
  const fuso = perfil?.fuso_horario ?? "America/Sao_Paulo";

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {paciente.nome}
            {!paciente.ativo && <span className="ml-2 text-base text-stone-500">(inativo)</span>}
          </h1>
          <form action={alterarAtivoPaciente.bind(null, paciente.id, !paciente.ativo)}>
            <button className={botaoSecundario}>{paciente.ativo ? "Desativar" : "Reativar"}</button>
          </form>
        </div>
        <FormularioPaciente paciente={paciente as DadosPaciente} />
      </section>

      <Link
        href={`/pacientes/${paciente.id}/diagnostico`}
        className="flex items-center justify-between gap-4 rounded-2xl border border-marca/20 bg-marca-fundo p-5 transition hover:border-marca/40"
      >
        <span>
          <span className="block font-semibold text-marca-escura">Apoio ao diagnóstico</span>
          <span className="text-sm text-stone-600">
            Descreva o caso e receba hipóteses (CID-11 / DSM-5-TR), diferenciais e perguntas para investigar.
          </span>
        </span>
        <span className="text-marca">→</span>
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Evoluções</h2>
        {!evolucoes?.length && <p className="text-stone-600">Nenhuma evolução registrada.</p>}
        <ul className="flex flex-col gap-2">
          {evolucoes?.map((e) => (
            <li key={e.id} className="rounded-2xl border border-stone-200 bg-white shadow-sm p-3">
              <p className="text-sm text-stone-500">
                {new Date(e.criado_em).toLocaleDateString("pt-BR", { timeZone: fuso })}
                {!e.revisada && " · rascunho não revisado"}
              </p>
              <p>{(e.conteudo as { resumo?: string }).resumo}</p>
            </li>
          ))}
        </ul>
        <Link href={`/evolucoes/nova?paciente=${paciente.id}`} className="text-sm text-marca underline">
          Registrar nova evolução
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Consultas</h2>
        {!consultas?.length && <p className="text-stone-600">Nenhuma consulta.</p>}
        <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm">
          {consultas?.map((c) => {
            const { data, hora } = formatarDataHora(c.inicio, fuso);
            return (
              <li key={c.id} className="flex justify-between px-4 py-2 text-sm">
                <span>
                  {data}, {hora}
                </span>
                <span>{ROTULO_STATUS[c.status as keyof typeof ROTULO_STATUS]}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
