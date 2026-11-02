import Link from "next/link";
import { notFound } from "next/navigation";
import { cartao } from "@/components/estilos";
import { CabecalhoPagina, Selo } from "@/components/ui";
import type { Evolucao } from "@/lib/ia/esquemas";
import { registrarAcesso, usuarioAtual } from "@/lib/servidor";
import { BotaoImprimir } from "@/app/recibos/[id]/botao-imprimir";
import { EditorEvolucao } from "./editor";

export default async function PaginaEvolucao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await usuarioAtual();

  const [{ data: evolucao }, { data: perfil }] = await Promise.all([
    supabase
      .from("evolucoes")
      .select("id, criado_em, revisada, revisada_em, transcricao, conteudo, paciente:pacientes(id, nome), consulta:consultas(inicio)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("profissionais").select("nome, registro_conselho, fuso_horario").eq("id", user.id).single(),
  ]);
  if (!evolucao) notFound();
  await registrarAcesso(supabase, {
    profissionalId: user.id,
    pacienteId: (evolucao.paciente as unknown as { id: string } | null)?.id,
    recurso: "evolucao",
    recursoId: id,
    acao: "ver",
  });

  const paciente = evolucao.paciente as unknown as { id: string; nome: string } | null;
  const consulta = evolucao.consulta as unknown as { inicio: string } | null;
  const conteudo = evolucao.conteudo as Evolucao;
  const fuso = perfil?.fuso_horario ?? "America/Sao_Paulo";
  const data = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: fuso, dateStyle: "long", timeStyle: "short" });

  return (
    <>
      <CabecalhoPagina
        titulo={evolucao.revisada ? "Evolução" : "Revisar evolução"}
        descricao={
          <>
            {paciente?.nome} · {consulta ? `sessão de ${data(consulta.inicio)}` : `registrada em ${data(evolucao.criado_em)}`}
          </>
        }
        antes={
          paciente && (
            <Link href={`/pacientes/${paciente.id}`} className="text-sm text-stone-500 hover:text-marca print:hidden">
              ← {paciente.nome}
            </Link>
          )
        }
        acoes={
          evolucao.revisada ? (
            <div className="flex items-center gap-2 print:hidden">
              <Selo tom="verde" ponto>
                Revisada em {new Date(evolucao.revisada_em ?? evolucao.criado_em).toLocaleDateString("pt-BR", { timeZone: fuso })}
              </Selo>
              <BotaoImprimir />
            </div>
          ) : (
            <Selo tom="ambar">Rascunho</Selo>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${cartao} p-6 lg:col-span-2 print:border-0 print:p-0 print:shadow-none`}>
          {evolucao.revisada ? (
            <article className="flex flex-col gap-5">
              {conteudo.alertas.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <p className="font-semibold">Alertas de risco</p>
                  <ul className="mt-1 list-disc pl-5">
                    {conteudo.alertas.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Bloco titulo="Resumo" texto={conteudo.resumo} />
              <Bloco titulo="Temas abordados" texto={conteudo.temas_abordados.join("; ")} />
              <Bloco titulo="Intervenções" texto={conteudo.intervencoes.join("; ")} />
              <Bloco titulo="Observações clínicas" texto={conteudo.observacoes_clinicas} />
              <Bloco titulo="Plano para a próxima sessão" texto={conteudo.plano_proxima_sessao} />
              <p className="mt-6 hidden text-sm text-stone-600 print:block">
                {perfil?.nome}
                {perfil?.registro_conselho && ` · ${perfil.registro_conselho}`}
              </p>
              <p className="text-xs text-stone-500 print:hidden">
                Evoluções revisadas não podem ser alteradas. Para corrigir ou complementar, registre uma nova evolução.
              </p>
            </article>
          ) : (
            <EditorEvolucao id={evolucao.id} conteudo={conteudo} />
          )}
        </div>
        <aside className={`${cartao} h-fit p-5 print:hidden`}>
          <h2 className="text-sm font-semibold text-stone-900">Ditado original</h2>
          <p className="mt-2 text-sm whitespace-pre-wrap text-stone-600">{evolucao.transcricao || "—"}</p>
        </aside>
      </div>
    </>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  if (!texto) return null;
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{titulo}</h2>
      <p className="mt-1 whitespace-pre-wrap text-stone-800">{texto}</p>
    </section>
  );
}
