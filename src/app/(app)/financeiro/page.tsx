import Link from "next/link";
import { cancelarCobranca, marcarCobrancaPaga, reenviarPix } from "@/app/(app)/acoes-cobrancas";
import { BotaoCopiar } from "@/components/botao-copiar";
import { botaoSecundario, cartao } from "@/components/estilos";
import { Menu } from "@/components/menu";
import { Avatar, CabecalhoPagina, Indicador, Selo, Vazio, type Tom } from "@/components/ui";
import { formatarMoeda, horarioLocalParaUtc, utcParaHorarioLocal } from "@/lib/dominio/formatacao";
import { usuarioAtual } from "@/lib/servidor";
import { AcoesRecibo } from "./acoes-recibo";

type Props = { searchParams: Promise<{ mes?: string }> };

type Cobranca = {
  id: string;
  valor: number;
  status: "pendente" | "paga" | "cancelada" | "expirada" | "estornada";
  criado_em: string;
  pago_em: string | null;
  forma_pagamento: string | null;
  descricao: string | null;
  pix_copia_e_cola: string | null;
  paciente: { id: string; nome: string } | null;
};

const STATUS: Record<Cobranca["status"], [string, Tom]> = {
  pendente: ["Pendente", "ambar"],
  paga: ["Paga", "verde"],
  cancelada: ["Cancelada", "neutro"],
  expirada: ["Expirada", "neutro"],
  estornada: ["Estornada", "vermelho"],
};
const FORMAS: [string, string][] = [
  ["pix", "Pix"],
  ["dinheiro", "Dinheiro"],
  ["cartao", "Cartão"],
  ["transferencia", "Transferência"],
];

/** Início e fim do mês (meia-noite no fuso do profissional), em UTC. */
function limitesDoMes(mes: string, fuso: string) {
  return {
    inicio: horarioLocalParaUtc(`${mes}-01`, "00:00", fuso)!.toISOString(),
    fim: horarioLocalParaUtc(`${deslocarMes(mes, 1)}-01`, "00:00", fuso)!.toISOString(),
  };
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function deslocarMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function Financeiro({ searchParams }: Props) {
  const { supabase, user } = await usuarioAtual();
  const { data: perfil } = await supabase.from("profissionais").select("fuso_horario, chave_pix").eq("id", user.id).single();
  const fuso = perfil?.fuso_horario ?? "America/Sao_Paulo";
  const mesAtual = utcParaHorarioLocal(new Date().toISOString(), fuso).data.slice(0, 7);
  const pedido = (await searchParams).mes;
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) ? pedido : mesAtual;
  const { inicio, fim } = limitesDoMes(mes, fuso);

  const { data } = await supabase
    .from("cobrancas")
    .select("id, valor, status, criado_em, pago_em, forma_pagamento, descricao, pix_copia_e_cola, paciente:pacientes(id, nome)")
    .gte("criado_em", inicio)
    .lt("criado_em", fim)
    .order("criado_em", { ascending: false });
  const cobrancas = (data ?? []) as unknown as Cobranca[];

  const soma = (s: Cobranca["status"]) =>
    cobrancas.filter((c) => c.status === s).reduce((t, c) => t + Number(c.valor), 0);
  const nomeMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const data_ = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: fuso, day: "2-digit", month: "short" });

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao="Cobranças das sessões. O Pix cai direto na sua conta; confirme aqui quando o pagamento chegar."
        acoes={
          <a href={`/api/exportar/carne-leao?mes=${mes}`} className={botaoSecundario}>
            Relatório do mês (CSV)
          </a>
        }
      />

      {!perfil?.chave_pix && (
        <Link href="/perfil" className="mb-6 block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Cadastre sua chave Pix</strong> no Perfil para cobrar as sessões pelo app. →
        </Link>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Link href={`/financeiro?mes=${deslocarMes(mes, -1)}`} className={botaoSecundario} aria-label="Mês anterior">
          ←
        </Link>
        <span className="min-w-40 text-center font-semibold first-letter:uppercase">{nomeMes}</span>
        <Link href={`/financeiro?mes=${deslocarMes(mes, 1)}`} className={botaoSecundario} aria-label="Próximo mês">
          →
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Indicador rotulo="Recebido" valor={formatarMoeda(soma("paga"))} detalhe={plural(cobrancas.filter((c) => c.status === "paga").length, "pagamento", "pagamentos")} />
        <Indicador rotulo="A receber" valor={formatarMoeda(soma("pendente"))} detalhe={plural(cobrancas.filter((c) => c.status === "pendente").length, "pendente", "pendentes")} />
        <Indicador rotulo="Cobranças no mês" valor={cobrancas.length} />
      </div>

      <div className={cartao}>
        {!cobrancas.length ? (
          <Vazio>Nenhuma cobrança neste mês. Use “Cobrar via Pix” nas consultas realizadas da agenda.</Vazio>
        ) : (
          <ul className="divide-y divide-stone-100">
            {cobrancas.map((c) => {
              const [rotulo, tom] = STATUS[c.status];
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {c.paciente && <Avatar nome={c.paciente.nome} tamanho="sm" />}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.paciente?.nome ?? "Paciente removido"}</p>
                      <p className="text-sm text-stone-500">
                        {c.descricao ?? "Sessão"} · cobrado em {data_(c.criado_em)}
                        {c.pago_em && ` · pago em ${data_(c.pago_em)}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{formatarMoeda(Number(c.valor))}</span>
                  <Selo tom={tom} ponto>
                    {rotulo}
                  </Selo>
                  {c.status === "paga" && (
                    <>
                      <Link href={`/recibos/${c.id}`} target="_blank" className={botaoSecundario}>
                        Recibo
                      </Link>
                      <AcoesRecibo cobrancaId={c.id} nomePaciente={c.paciente?.nome ?? ""} />
                    </>
                  )}
                  {c.status === "pendente" && (
                    <Menu rotulo={`Ações da cobrança de ${c.paciente?.nome ?? ""}`}>
                      <p className="px-3 pt-1 pb-0.5 text-xs font-medium text-stone-400">Marcar como paga via</p>
                      {FORMAS.map(([forma, nome]) => (
                        <form key={forma} action={marcarCobrancaPaga.bind(null, c.id, forma)}>
                          <button>{nome}</button>
                        </form>
                      ))}
                      <hr className="my-1 border-stone-100" />
                      {c.pix_copia_e_cola && <BotaoCopiar texto={c.pix_copia_e_cola} rotulo="Copiar Pix" />}
                      <form action={reenviarPix.bind(null, c.id)}>
                        <button>Reenviar no WhatsApp</button>
                      </form>
                      <form action={cancelarCobranca.bind(null, c.id)}>
                        <button className="text-red-700">Cancelar cobrança</button>
                      </form>
                    </Menu>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-4 px-1 text-sm text-stone-500">
        Profissionais de saúde pessoa física devem emitir o recibo oficial pelo app <strong>Receita Saúde</strong>. Use o
        relatório do mês (CSV) para conferir os lançamentos e o carnê-leão.
      </p>
    </>
  );
}
