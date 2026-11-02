import Link from "next/link";
import { alterarStatusConsulta } from "@/app/(app)/acoes";
import { botaoSecundario } from "@/components/estilos";
import { formatarDataHora, formatarMoeda, utcParaHorarioLocal } from "@/lib/dominio/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { BotaoCobrar } from "./botao-cobrar";
import { FormularioConsulta } from "./formulario-consulta";
import { COR_STATUS, ROTULO_STATUS, type StatusConsulta } from "./status";

type Consulta = {
  id: string;
  inicio: string;
  duracao_min: number;
  status: StatusConsulta;
  modalidade: string;
  valor: number | null;
  paciente: { id: string; nome: string } | null;
  cobrancas: { status: string }[];
};

/** Próximos passos possíveis a partir de cada status. */
const ACOES: Record<StatusConsulta, [StatusConsulta, string][]> = {
  agendada: [["confirmada", "Confirmar"], ["realizada", "Realizada"], ["falta", "Faltou"], ["cancelada", "Cancelar"]],
  confirmada: [["realizada", "Realizada"], ["falta", "Faltou"], ["cancelada", "Cancelar"]],
  realizada: [["agendada", "Desfazer"]],
  falta: [["agendada", "Desfazer"]],
  cancelada: [["agendada", "Reativar"]],
};

export default async function Agenda() {
  const supabase = await criarClienteServidor();
  const [{ data: perfil }, { data: pacientes }] = await Promise.all([
    supabase.from("profissionais").select("fuso_horario, valor_sessao_padrao").single(),
    supabase.from("pacientes").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  const fuso = perfil?.fuso_horario ?? "America/Sao_Paulo";

  // Últimos 7 dias (para marcar realizada/falta e cobrar) + próximas consultas.
  const desde = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { data } = await supabase
    .from("consultas")
    .select("id, inicio, duracao_min, status, modalidade, valor, paciente:pacientes(id, nome), cobrancas(status)")
    .gte("inicio", desde)
    .order("inicio")
    .limit(200);
  const consultas = (data ?? []) as unknown as Consulta[];

  const porDia = new Map<string, Consulta[]>();
  for (const c of consultas) {
    const dia = utcParaHorarioLocal(c.inicio, fuso).data;
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }
  const hoje = utcParaHorarioLocal(new Date().toISOString(), fuso).data;

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
      <FormularioConsulta pacientes={pacientes ?? []} valorPadrao={perfil?.valor_sessao_padrao ?? null} hoje={hoje} />

      {!consultas.length && <p className="text-stone-600">Nenhuma consulta nos últimos 7 dias nem agendada.</p>}

      {[...porDia].map(([dia, doDia]) => (
        <div key={dia} className="flex flex-col gap-2">
          <h2 className={`font-semibold capitalize ${dia === hoje ? "text-marca" : ""}`}>
            {dia === hoje ? "Hoje · " : ""}
            {formatarDataHora(doDia[0].inicio, fuso).data}
          </h2>
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm">
            {doDia.map((c) => (
              <LinhaConsulta key={c.id} consulta={c} fuso={fuso} valorPadrao={perfil?.valor_sessao_padrao ?? null} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function LinhaConsulta({
  consulta: c,
  fuso,
  valorPadrao,
}: {
  consulta: Consulta;
  fuso: string;
  valorPadrao: number | null;
}) {
  const { hora } = formatarDataHora(c.inicio, fuso);
  const valor = c.valor ?? valorPadrao;
  const paga = c.cobrancas.some((cb) => cb.status === "paga");
  const pixPendente = c.cobrancas.some((cb) => cb.status === "pendente");
  const podeCobrar = (c.status === "realizada" || c.status === "falta") && !paga && !pixPendente && valor;

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {hora} ·{" "}
            {c.paciente ? (
              <Link href={`/pacientes/${c.paciente.id}`} className="hover:underline">
                {c.paciente.nome}
              </Link>
            ) : (
              "Paciente removido"
            )}
          </p>
          <p className="text-sm text-stone-600">
            {c.duracao_min} min · {c.modalidade}
            {valor ? ` · ${formatarMoeda(valor)}` : ""}
            {paga && " · Pago ✓"}
            {pixPendente && " · Pix enviado"}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS[c.status]}`}>
          {ROTULO_STATUS[c.status]}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ACOES[c.status].map(([novo, rotulo]) => (
          <form key={novo} action={alterarStatusConsulta.bind(null, c.id, novo)}>
            <button className={botaoSecundario}>{rotulo}</button>
          </form>
        ))}
        {c.status === "realizada" && c.paciente && (
          <Link
            href={`/evolucoes/nova?paciente=${c.paciente.id}&consulta=${c.id}`}
            className={botaoSecundario}
          >
            Registrar evolução
          </Link>
        )}
        {podeCobrar && <BotaoCobrar consultaId={c.id} />}
      </div>
    </li>
  );
}
