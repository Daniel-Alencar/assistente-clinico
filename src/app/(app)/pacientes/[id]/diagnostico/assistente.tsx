"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { botaoPrimario, botaoSecundario, campo, cartao } from "@/components/estilos";
import { IconeCheck, IconeIA } from "@/components/icones";
import type { Diagnostico } from "@/lib/ia/esquemas";
import type { Mensagem } from "@/lib/ia/tipos";

type Analise = { id: string; mensagens: Mensagem[]; resultado: Diagnostico };

const COR_COMPATIBILIDADE = {
  alta: "bg-marca-clara text-marca-escura",
  moderada: "bg-amber-100 text-amber-800",
  baixa: "bg-stone-100 text-stone-600",
};

export function AssistenteDiagnostico({
  pacienteId,
  analiseInicial,
}: {
  pacienteId: string;
  analiseInicial: Analise | null;
}) {
  const router = useRouter();
  const [analise, setAnalise] = useState<Analise | null>(analiseInicial);
  const [texto, setTexto] = useState("");
  const [usarEvolucoes, setUsarEvolucoes] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campoTexto = useRef<HTMLTextAreaElement>(null);

  const relatos = analise?.mensagens.filter((m) => m.papel === "usuario") ?? [];

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    setErro(null);
    const resposta = await fetch("/api/diagnostico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pacienteId, analiseId: analise?.id, mensagem: texto, usarEvolucoes }),
    });
    const dados = await resposta.json().catch(() => ({}));
    setCarregando(false);
    if (!resposta.ok) return setErro(dados.erro ?? "Falha ao gerar a análise");

    setAnalise({ id: dados.analiseId, mensagens: dados.mensagens, resultado: dados.resultado });
    setTexto("");
    // Endereço passa a apontar para esta análise: recarregar a página não perde nada.
    router.replace(`/pacientes/${pacienteId}/diagnostico?analise=${dados.analiseId}`, { scroll: false });
  }

  /** Coloca a pergunta do agente no campo, pronta para o profissional responder. */
  function responder(pergunta: string) {
    setTexto((atual) => `${atual ? `${atual}\n\n` : ""}${pergunta}\nResposta: `);
    campoTexto.current?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      {relatos.length > 0 && (
        <ol className="flex flex-col gap-2">
          {relatos.map((r, i) => (
            <li key={i} className="rounded-xl bg-stone-100 px-4 py-3 text-sm whitespace-pre-wrap text-stone-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                {i === 0 ? "Relato inicial" : `Complemento ${i}`}
              </span>
              {r.conteudo}
            </li>
          ))}
        </ol>
      )}

      {analise && <ResultadoAnalise resultado={analise.resultado} aoResponder={responder} />}

      <form onSubmit={enviar} className={`${cartao} flex flex-col gap-3 p-4`}>
        <label htmlFor="relato" className="font-semibold">
          {analise ? "Responder perguntas ou acrescentar informações" : "Descreva o caso"}
        </label>
        <textarea
          id="relato"
          ref={campoTexto}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={analise ? 5 : 9}
          placeholder={
            analise
              ? "Clique numa pergunta acima para respondê-la, ou acrescente o que descobriu..."
              : "Queixa principal, sintomas e há quanto tempo, intensidade, impacto no trabalho e nas relações, histórico pessoal e familiar, uso de substâncias, medicações, condições médicas..."
          }
          className={campo}
        />
        {!analise && (
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={usarEvolucoes} onChange={(e) => setUsarEvolucoes(e.target.checked)} />
            Considerar as últimas evoluções registradas deste paciente
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={carregando || texto.trim().length < 10} className={botaoPrimario}>
            <IconeIA className="size-4" />
            {carregando ? "Analisando..." : analise ? "Atualizar análise" : "Analisar caso"}
          </button>
          {analise && (
            <button
              type="button"
              onClick={() => {
                setAnalise(null);
                setTexto("");
                setErro(null);
                router.push(`/pacientes/${pacienteId}/diagnostico`);
              }}
              className={botaoSecundario}
            >
              Nova análise
            </button>
          )}
          {carregando && <span className="text-sm text-stone-500">Pode levar até um minuto.</span>}
        </div>
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      </form>
    </div>
  );
}

function ResultadoAnalise({
  resultado: r,
  aoResponder,
}: {
  resultado: Diagnostico;
  aoResponder: (pergunta: string) => void;
}) {
  return (
    <section className="flex flex-col gap-5">
      {r.alertas_risco.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
          <p className="font-bold">Atenção: sinais de risco</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {r.alertas_risco.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={`${cartao} p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Resumo clínico</h2>
        <p className="mt-2 text-stone-800">{r.resumo_clinico}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Hipóteses diagnósticas</h2>
        {r.hipoteses.map((h, i) => (
          <article key={`${h.nome}-${i}`} className={`${cartao} flex flex-col gap-3 p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">
                  {i + 1}. {h.nome}
                </h3>
                <p className="text-sm text-stone-500">
                  CID-11 {h.codigo_cid11}
                  {h.referencia_dsm5tr && ` · DSM-5-TR: ${h.referencia_dsm5tr}`}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_COMPATIBILIDADE[h.compatibilidade]}`}>
                Compatibilidade {h.compatibilidade}
              </span>
            </div>
            <p className="text-sm text-stone-700">{h.justificativa}</p>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold text-stone-700">Critérios presentes</p>
                <ul className="space-y-1">
                  {h.criterios_presentes.map((c) => (
                    <li key={c} className="flex gap-2">
                      <IconeCheck className="mt-0.5 size-4 shrink-0 text-marca" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-semibold text-stone-700">A investigar</p>
                <ul className="space-y-1">
                  {h.criterios_a_investigar.map((c) => (
                    <li key={c} className="flex gap-2 text-stone-600">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-stone-300 text-[10px]">
                        ?
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>

      {r.perguntas_para_investigar.length > 0 && (
        <div className={`${cartao} p-5`}>
          <h2 className="text-lg font-semibold">Perguntas para investigar</h2>
          <p className="text-sm text-stone-500">Clique para responder e refinar a análise.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {r.perguntas_para_investigar.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => aoResponder(p)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-left text-sm transition hover:border-marca hover:bg-marca-fundo"
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {r.diferenciais_a_excluir.length > 0 && (
          <div className={`${cartao} p-5`}>
            <h2 className="font-semibold">Diferenciais a excluir</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {r.diferenciais_a_excluir.map((d) => (
                <li key={d.condicao}>
                  <span className="font-medium">{d.condicao}</span>
                  <span className="text-stone-600"> · {d.como_excluir}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.instrumentos_sugeridos.length > 0 && (
          <div className={`${cartao} p-5`}>
            <h2 className="font-semibold">Instrumentos sugeridos</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {r.instrumentos_sugeridos.map((ins) => (
                <li key={ins.nome}>
                  <span className="font-medium">{ins.nome}</span>
                  <span className="text-stone-600"> · {ins.finalidade}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {r.limitacoes && (
        <p className="text-sm text-stone-500">
          <span className="font-semibold">Limitações desta análise:</span> {r.limitacoes}
        </p>
      )}
    </section>
  );
}
