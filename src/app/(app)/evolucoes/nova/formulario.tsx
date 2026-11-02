"use client";

import { useState } from "react";
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
    <div className="flex flex-col gap-6">
      <form onSubmit={gerar} className="flex flex-col gap-3">
        <select
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2"
        >
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <textarea
          value={transcricao}
          onChange={(e) => setTranscricao(e.target.value)}
          rows={8}
          placeholder="Ex.: Paciente chegou mais calma, relatou melhora no sono..."
          className="rounded-lg border border-stone-300 px-3 py-2"
        />
        <button
          disabled={carregando || !pacienteId || transcricao.length < 20}
          className="w-fit rounded-lg bg-marca px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {carregando ? "Gerando..." : "Gerar evolução"}
        </button>
        {erro && <p className="text-red-700">{erro}</p>}
      </form>

      {evolucao && (
        <article className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white shadow-sm p-4">
          {evolucao.alertas.length > 0 && (
            <div className="rounded-md bg-red-50 p-3 text-red-800">
              <strong>Alertas:</strong> {evolucao.alertas.join("; ")}
            </div>
          )}
          <p>{evolucao.resumo}</p>
          <Campo titulo="Temas abordados" valor={evolucao.temas_abordados.join(", ")} />
          <Campo titulo="Intervenções" valor={evolucao.intervencoes.join(", ")} />
          <Campo titulo="Observações clínicas" valor={evolucao.observacoes_clinicas} />
          <Campo titulo="Plano para a próxima sessão" valor={evolucao.plano_proxima_sessao} />
          {evolucao.pontos_a_confirmar.length > 0 && (
            <Campo titulo="Revise antes de salvar" valor={evolucao.pontos_a_confirmar.join("; ")} />
          )}
        </article>
      )}
    </div>
  );
}

function Campo({ titulo, valor }: { titulo: string; valor: string }) {
  if (!valor) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-500">{titulo}</h3>
      <p>{valor}</p>
    </div>
  );
}
