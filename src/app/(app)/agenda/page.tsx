import Link from "next/link";
import { alterarStatusConsulta } from "@/app/(app)/acoes";
import { botaoSecundario, cartao } from "@/components/estilos";
import { IconeLocal, IconeVideo } from "@/components/icones";
import { Menu } from "@/components/menu";
import { Avatar, CabecalhoPagina, Indicador, Selo, Vazio } from "@/components/ui";
import { formatarMoeda, utcParaHorarioLocal } from "@/lib/dominio/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { BotaoCobrar } from "./botao-cobrar";
import { PainelNovaConsulta } from "./painel-nova-consulta";
import { ROTULO_STATUS, TOM_STATUS, type StatusConsulta } from "./status";

type Consulta = {
  id: string;
  inicio: string;
  duracao_min: number;
  status: StatusConsulta;
  modalidade: string;
  valor: number | null;
  paciente: { id: string; nome: string } | null;
  cobrancas: { status: string; valor: number }[];
};

/** Próximos status possíveis a partir de cada status. */
const TRANSICOES: Record<StatusConsulta, [StatusConsulta, string][]> = {
  agendada: [["confirmada", "Confirmar"], ["realizada", "Marcar realizada"], ["falta", "Marcar falta"], ["cancelada", "Cancelar consulta"]],
  confirmada: [["realizada", "Marcar realizada"], ["falta", "Marcar falta"], ["cancelada", "Cancelar consulta"]],
  realizada: [["agendada", "Desfazer"]],
  falta: [["agendada", "Desfazer"]],
  cancelada: [["agendada", "Reativar"]],
};

function rotuloDia(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(iso),
  );
}

export default async function Agenda() {
  const supabase = await criarClienteServidor();
  const [{ data: perfil }, { data: pacientes }] = await Promise.all([
    supabase.from("profissionais").select("nome, fuso_horario, valor_sessao_padrao").single(),
    supabase.from("pacientes").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  const fuso = perfil?.fuso_horario ?? "America/Sao_Paulo";
  const valorPadrao = perfil?.valor_sessao_padrao ?? null;

  // Últimos 7 dias (para marcar realizada/falta e cobrar) + próximas consultas.
  const desde = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { data } = await supabase
    .from("consultas")
    .select("id, inicio, duracao_min, status, modalidade, valor, paciente:pacientes(id, nome), cobrancas(status, valor)")
    .gte("inicio", desde)
    .order("inicio")
    .limit(200);
  const consultas = (data ?? []) as unknown as Consulta[];

  const hoje = utcParaHorarioLocal(new Date().toISOString(), fuso).data;
  const porDia = new Map<string, Consulta[]>();
  for (const c of consultas) {
    const dia = utcParaHorarioLocal(c.inicio, fuso).data;
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }
  const dias = [...porDia];
  const passados = dias.filter(([d]) => d < hoje);
  const proximos = dias.filter(([d]) => d >= hoje);

  const doDia = porDia.get(hoje)?.filter((c) => c.status !== "cancelada") ?? [];
  const aConfirmar = consultas.filter((c) => c.status === "agendada" && utcParaHorarioLocal(c.inicio, fuso).data >= hoje).length;
  const aCobrar = consultas.filter((c) => podeCobrar(c, valorPadrao)).length;
  const recebido = consultas.flatMap((c) => c.cobrancas).filter((cb) => cb.status === "paga").reduce((s, cb) => s + Number(cb.valor), 0);
  const pendenciasPassadas = passados.some(([, cs]) =>
    cs.some((c) => c.status === "agendada" || c.status === "confirmada" || podeCobrar(c, valorPadrao)),
  );

  const primeiroNome = perfil?.nome.replace(/^(dra?\.?|dr\.?)\s+/i, "").split(" ")[0];

  return (
    <>
      <CabecalhoPagina
        titulo={`Olá, ${primeiroNome ?? ""}`}
        descricao={<span className="first-letter:uppercase inline-block">{rotuloDia(new Date().toISOString(), fuso)}</span>}
        acoes={<PainelNovaConsulta pacientes={pacientes ?? []} valorPadrao={valorPadrao} hoje={hoje} />}
      />

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Consultas hoje" valor={doDia.length} detalhe={doDia.length ? `${doDia.filter((c) => c.status === "confirmada").length} confirmadas` : "Dia livre"} />
        <Indicador rotulo="A confirmar" valor={aConfirmar} detalhe="Próximas consultas" />
        <Indicador rotulo="A cobrar" valor={aCobrar} detalhe="Realizadas sem Pix" />
        <Indicador rotulo="Recebido" valor={formatarMoeda(recebido)} detalhe="Últimos 7 dias" />
      </div>

      <div className="flex flex-col gap-8">
        {proximos.length === 0 && (
          <div className={cartao}>
            <Vazio>Nenhuma consulta agendada. Use “Nova consulta” para começar.</Vazio>
          </div>
        )}
        {proximos.map(([dia, cs]) => (
          <GrupoDia key={dia} titulo={rotuloDia(cs[0].inicio, fuso)} hoje={dia === hoje} consultas={cs} fuso={fuso} valorPadrao={valorPadrao} />
        ))}

        {passados.length > 0 && (
          <details open={pendenciasPassadas} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900">
              <span className="transition group-open:rotate-90">›</span>
              Últimos 7 dias
              {pendenciasPassadas && <Selo tom="ambar">com pendências</Selo>}
            </summary>
            <div className="mt-4 flex flex-col gap-8">
              {[...passados].reverse().map(([dia, cs]) => (
                <GrupoDia key={dia} titulo={rotuloDia(cs[0].inicio, fuso)} consultas={cs} fuso={fuso} valorPadrao={valorPadrao} />
              ))}
            </div>
          </details>
        )}
      </div>
    </>
  );
}

function podeCobrar(c: Consulta, valorPadrao: number | null) {
  const temCobranca = c.cobrancas.some((cb) => cb.status === "paga" || cb.status === "pendente");
  return (c.status === "realizada" || c.status === "falta") && !temCobranca && !!(c.valor ?? valorPadrao);
}

function GrupoDia({
  titulo,
  hoje,
  consultas,
  fuso,
  valorPadrao,
}: {
  titulo: string;
  hoje?: boolean;
  consultas: Consulta[];
  fuso: string;
  valorPadrao: number | null;
}) {
  const ativas = consultas.filter((c) => c.status !== "cancelada").length;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="flex items-center gap-2 font-semibold text-stone-900">
          {hoje && <Selo tom="marca">Hoje</Selo>}
          <span className="first-letter:uppercase">{titulo}</span>
        </h2>
        <span className="shrink-0 text-sm text-stone-500">
          {ativas} {ativas === 1 ? "consulta" : "consultas"}
        </span>
      </div>
      <ul className={`${cartao} divide-y divide-stone-100`}>
        {consultas.map((c) => (
          <LinhaConsulta key={c.id} consulta={c} fuso={fuso} valorPadrao={valorPadrao} />
        ))}
      </ul>
    </section>
  );
}

function LinhaConsulta({ consulta: c, fuso, valorPadrao }: { consulta: Consulta; fuso: string; valorPadrao: number | null }) {
  const { hora } = utcParaHorarioLocal(c.inicio, fuso);
  const valor = c.valor ?? valorPadrao;
  const paga = c.cobrancas.some((cb) => cb.status === "paga");
  const pixPendente = c.cobrancas.some((cb) => cb.status === "pendente");
  const cobrar = podeCobrar(c, valorPadrao);
  const cancelada = c.status === "cancelada";
  const linkEvolucao = c.paciente ? `/evolucoes/nova?paciente=${c.paciente.id}&consulta=${c.id}` : null;

  // Uma ação principal visível; o resto vai para o menu.
  let principal: React.ReactNode = null;
  let transicoes = TRANSICOES[c.status];
  if (c.status === "agendada" || c.status === "confirmada") {
    const [novo, rotulo] = transicoes[0];
    principal = (
      <form action={alterarStatusConsulta.bind(null, c.id, novo)}>
        <button className={botaoSecundario}>{rotulo}</button>
      </form>
    );
    transicoes = transicoes.slice(1);
  } else if (cobrar) {
    principal = <BotaoCobrar consultaId={c.id} />;
  } else if (c.status === "realizada" && linkEvolucao) {
    principal = (
      <Link href={linkEvolucao} className={botaoSecundario}>
        Registrar evolução
      </Link>
    );
  }

  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:flex-nowrap sm:px-5 ${cancelada ? "opacity-60" : ""}`}>
      <div className="w-12 shrink-0">
        <p className={`font-semibold tabular-nums text-stone-900 ${cancelada ? "line-through" : ""}`}>{hora}</p>
        <p className="text-xs text-stone-400">{c.duracao_min} min</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {c.paciente && <Avatar nome={c.paciente.nome} tamanho="sm" />}
        <div className="min-w-0">
          {c.paciente ? (
            <Link href={`/pacientes/${c.paciente.id}`} className="block truncate font-medium text-stone-900 hover:text-marca">
              {c.paciente.nome}
            </Link>
          ) : (
            <span className="text-stone-500">Paciente removido</span>
          )}
          <p className="flex items-center gap-1.5 text-sm text-stone-500">
            {c.modalidade === "online" ? <IconeVideo className="size-3.5" /> : <IconeLocal className="size-3.5" />}
            <span className="capitalize">{c.modalidade}</span>
            {valor ? <span className="tabular-nums">· {formatarMoeda(valor)}</span> : null}
          </p>
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 pl-16 sm:w-auto sm:flex-nowrap sm:pl-0">
        {paga && <Selo tom="verde">Pago</Selo>}
        {pixPendente && <Selo tom="ambar">Pix enviado</Selo>}
        <Selo tom={TOM_STATUS[c.status]} ponto>
          {ROTULO_STATUS[c.status]}
        </Selo>
        {principal}
        <Menu rotulo={`Mais ações para a consulta das ${hora}`}>
          {transicoes.map(([novo, rotulo]) => (
            <form key={novo} action={alterarStatusConsulta.bind(null, c.id, novo)}>
              <button>{rotulo}</button>
            </form>
          ))}
          {c.status === "realizada" && cobrar && linkEvolucao && (
            <Link href={linkEvolucao} className="rounded-lg px-3 py-2 text-sm hover:bg-stone-100">
              Registrar evolução
            </Link>
          )}
          {c.paciente && (
            <Link href={`/pacientes/${c.paciente.id}`} className="rounded-lg px-3 py-2 text-sm hover:bg-stone-100">
              Ver paciente
            </Link>
          )}
        </Menu>
      </div>
    </li>
  );
}
