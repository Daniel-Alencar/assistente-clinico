import Link from "next/link";
import { notFound } from "next/navigation";
import { alterarAtivoPaciente } from "@/app/(app)/acoes";
import { botaoPrimario, botaoSecundario, cartao } from "@/components/estilos";
import { IconeEvolucao, IconeIA, IconeSetaDireita } from "@/components/icones";
import { Menu } from "@/components/menu";
import { Avatar, Indicador, Secao, Selo, Vazio } from "@/components/ui";
import { calcularIdade, formatarTelefone } from "@/lib/dominio/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { ROTULO_STATUS, TOM_STATUS, type StatusConsulta } from "../../agenda/status";

type Props = { params: Promise<{ id: string }> };

type ConteudoEvolucao = { resumo?: string; temas_abordados?: string[]; alertas?: string[] };

export default async function DetalhePaciente({ params }: Props) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  const [{ data: paciente }, { data: consultas }, { data: evolucoes }, { data: perfil }] = await Promise.all([
    supabase
      .from("pacientes")
      .select("id, nome, telefone_whatsapp, email, cpf, data_nascimento, aceita_whatsapp, ativo")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("consultas").select("id, inicio, status").eq("paciente_id", id).order("inicio", { ascending: false }).limit(200),
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

  const agora = new Date().toISOString();
  const todas = consultas ?? [];
  const realizadas = todas.filter((c) => c.status === "realizada").length;
  const faltas = todas.filter((c) => c.status === "falta").length;
  const proxima = [...todas].reverse().find((c) => c.inicio >= agora && (c.status === "agendada" || c.status === "confirmada"));
  const dataCurta = (iso: string, comHora = false) =>
    new Date(iso).toLocaleString("pt-BR", {
      timeZone: fuso,
      day: "2-digit",
      month: "short",
      ...(comHora ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
    });

  const meta = [
    paciente.data_nascimento && `${calcularIdade(paciente.data_nascimento)} anos`,
    paciente.telefone_whatsapp && formatarTelefone(paciente.telefone_whatsapp),
    paciente.email,
  ].filter(Boolean);

  return (
    <>
      <Link href="/pacientes" className="mb-4 inline-block text-sm text-stone-500 hover:text-marca">
        ← Pacientes
      </Link>

      <header className={`${cartao} mb-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6`}>
        <Avatar nome={paciente.nome} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{paciente.nome}</h1>
            {!paciente.ativo && <Selo>Inativo</Selo>}
          </div>
          <p className="mt-1 text-stone-500">{meta.join(" · ") || "Sem dados de contato"}</p>
          <div className="mt-2">
            {paciente.aceita_whatsapp ? (
              <Selo tom="verde" ponto>Lembretes no WhatsApp ativos</Selo>
            ) : (
              <Selo>Lembretes desativados</Selo>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/evolucoes/nova?paciente=${paciente.id}`} className={botaoPrimario}>
            <IconeEvolucao className="size-4" /> Nova evolução
          </Link>
          <Menu rotulo="Mais ações do paciente">
            <Link href={`/pacientes/${paciente.id}/editar`} className="rounded-lg px-3 py-2 text-sm hover:bg-stone-100">
              Editar cadastro
            </Link>
            <form action={alterarAtivoPaciente.bind(null, paciente.id, !paciente.ativo)}>
              <button>{paciente.ativo ? "Desativar paciente" : "Reativar paciente"}</button>
            </form>
          </Menu>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Indicador rotulo="Sessões realizadas" valor={realizadas} />
        <Indicador rotulo="Faltas" valor={faltas} detalhe={realizadas + faltas ? `${Math.round((faltas / (realizadas + faltas)) * 100)}% do total` : undefined} />
        <Indicador rotulo="Próxima consulta" valor={<span className="text-lg">{proxima ? dataCurta(proxima.inicio, true) : "—"}</span>} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Secao
            titulo="Evoluções"
            semPadding
            acao={
              <Link href={`/evolucoes/nova?paciente=${paciente.id}`} className="text-sm font-medium text-marca hover:underline">
                + Registrar
              </Link>
            }
          >
            {!evolucoes?.length ? (
              <Vazio>Nenhuma evolução registrada ainda.</Vazio>
            ) : (
              <ol className="divide-y divide-stone-100">
                {evolucoes.map((e) => {
                  const c = e.conteudo as ConteudoEvolucao;
                  return (
                    <li key={e.id} className="flex flex-col gap-2 px-5 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-stone-900">{dataCurta(e.criado_em)}</span>
                        {e.revisada ? <Selo tom="verde">Revisada</Selo> : <Selo tom="ambar">Rascunho</Selo>}
                        {!!c.alertas?.length && <Selo tom="vermelho">Alerta de risco</Selo>}
                      </div>
                      <p className="text-stone-700">{c.resumo}</p>
                      {!!c.temas_abordados?.length && (
                        <div className="flex flex-wrap gap-1.5">
                          {c.temas_abordados.map((t) => (
                            <span key={t} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Secao>

          <Secao titulo="Consultas" semPadding>
            {!todas.length ? (
              <Vazio>Nenhuma consulta.</Vazio>
            ) : (
              <ul className="divide-y divide-stone-100">
                {todas.slice(0, 12).map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="tabular-nums text-stone-700">{dataCurta(c.inicio, true)}</span>
                    <Selo tom={TOM_STATUS[c.status as StatusConsulta]} ponto>
                      {ROTULO_STATUS[c.status as StatusConsulta]}
                    </Selo>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>

        <aside className="flex flex-col gap-6">
          <Link
            href={`/pacientes/${paciente.id}/diagnostico`}
            className="group relative overflow-hidden rounded-2xl bg-marca p-5 text-white shadow-sm transition hover:bg-marca-escura"
          >
            <div className="absolute -top-8 -right-8 size-28 rounded-full bg-white/10" />
            <IconeIA className="size-6" />
            <p className="mt-3 font-semibold">Apoio ao diagnóstico</p>
            <p className="mt-1 text-sm text-marca-clara">
              Hipóteses com CID-11 e DSM-5-TR, diferenciais e perguntas para investigar.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
              Abrir <IconeSetaDireita className="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Secao
            titulo="Dados cadastrais"
            acao={
              <Link href={`/pacientes/${paciente.id}/editar`} className={botaoSecundario}>
                Editar
              </Link>
            }
          >
            <dl className="flex flex-col gap-3 text-sm">
              {[
                ["Nascimento", paciente.data_nascimento ? new Date(`${paciente.data_nascimento}T12:00:00Z`).toLocaleDateString("pt-BR") : null],
                ["WhatsApp", paciente.telefone_whatsapp ? formatarTelefone(paciente.telefone_whatsapp) : null],
                ["E-mail", paciente.email],
                ["CPF", paciente.cpf ? paciente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : null],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex justify-between gap-3">
                  <dt className="text-stone-500">{rotulo}</dt>
                  <dd className="truncate text-right font-medium text-stone-900">{valor ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Secao>
        </aside>
      </div>
    </>
  );
}
