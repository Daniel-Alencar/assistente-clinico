"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { botaoPrimario, campo, cartao, rotulo } from "@/components/estilos";
import { IconeIA } from "@/components/icones";

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
  const router = useRouter();

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
    // A evolução já foi salva como rascunho: segue para a revisão.
    router.push(`/evolucoes/${dados.id}`);
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
        <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-marca-fundo text-marca">
            <IconeIA className="size-6" />
          </span>
          <p className="max-w-xs text-sm text-stone-500">
            {carregando
              ? "Organizando o ditado em uma evolução estruturada..."
              : "Depois de gerar, você revisa e ajusta cada campo antes de salvar no prontuário."}
          </p>
        </div>
      </div>
    </div>
  );
}

