"use client";

import { useState } from "react";
import { botaoPrimario, campo, cartao, rotulo } from "@/components/estilos";
import { IconeIA } from "@/components/icones";
import { Selo } from "@/components/ui";
import type { Evolucao } from "@/lib/ia/esquemas";

type Props = {
  pacientes: { id: string; nome: string }[];
  pacienteInicial?: string;
  consultaId?: string;
};

export function FormularioEvolucao({ pacientes, pacienteInicial, consultaId }: Props) {
  const [pacienteId, setPacienteId] = useState(
    pacientes.some((p) => p.id === pacienteInicial) ? pacienteInicial! : (pacientes[0]?.id ?? ""),
  );
  const [transcricao, setTranscricao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao | null>(null);

  async function gerar(evento: React.FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    setErro(null);
    const resposta = await fetch("/api/evolucoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pacienteId,
        transcricao,
        // A consulta só vale para o paciente com que a tela foi aberta.
        consultaId: pacienteId === pacienteInicial ? consultaId : undefined,
      }),
    });
    const dados = await resposta.json();
    setCarregando(false);
    if (!resposta.ok) return setErro(dados.erro ?? "Erro ao gerar evolução");
    setEvolucao(dados.conteudo);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={gerar} className={`${cartao} flex flex-col gap-4 p-5 sm:p-6 lg:col-span-2 lg:self-start`}>
        <label className={rotulo}>
          Paciente
          <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} className={campo}>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className={rotulo}>
          Ditado da sessão
          <textarea
            value={transcricao}
            onChange={(e) => setTranscricao(e.target.value)}
            rows={10}
            placeholder="Ex.: Paciente chegou mais calma, relatou melhora no sono. Trabalhamos..."
            className={campo}
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-stone-500 tabular-nums">{transcricao.length} caracteres</span>
          <button disabled={carregando || !pacienteId || transcricao.length < 20} className={botaoPrimario}>
            <IconeIA className="size-4" />
            {carregando ? "Gerando..." : "Gerar evolução"}
          </button>
        </div>
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      </form>

      <div className="lg:col-span-3">
        {evolucao ? (
          <article className={`${cartao} flex flex-col gap-5 p-5 sm:p-6`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Evolução gerada</h2>
              <Selo tom="ambar">Rascunho · revise antes de usar</Selo>
            </div>
            {evolucao.alertas.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
                <p className="font-semibold">Alertas de risco</p>
                <ul className="mt-1 list-disc pl-5">
                  {evolucao.alertas.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-stone-800">{evolucao.resumo}</p>
            <Campo titulo="Temas abordados" valor={evolucao.temas_abordados.join(", ")} />
            <Campo titulo="Intervenções" valor={evolucao.intervencoes.join(", ")} />
            <Campo titulo="Observações clínicas" valor={evolucao.observacoes_clinicas} />
            <Campo titulo="Plano para a próxima sessão" valor={evolucao.plano_proxima_sessao} />
            {evolucao.pontos_a_confirmar.length > 0 && (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Revise antes de salvar</p>
                <ul className="mt-1 list-disc pl-5">
                  {evolucao.pontos_a_confirmar.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ) : (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 p-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-marca-fundo text-marca">
              <IconeIA className="size-6" />
            </span>
            <p className="max-w-xs text-sm text-stone-500">
              {carregando
                ? "Organizando o ditado em uma evolução estruturada..."
                : "A evolução estruturada aparece aqui: resumo, temas, intervenções, plano e alertas de risco."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ titulo, valor }: { titulo: string; valor: string }) {
  if (!valor) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{titulo}</h3>
      <p className="mt-1 text-stone-800">{valor}</p>
    </div>
  );
}
