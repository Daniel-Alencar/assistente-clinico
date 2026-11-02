"use client";

import { useActionState } from "react";
import { excluirEvolucao, salvarEvolucao } from "@/app/(app)/acoes-evolucoes";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/estilos";
import { MensagemForm } from "@/components/mensagem-form";
import type { Evolucao } from "@/lib/ia/esquemas";

const CAMPOS_LISTA: [keyof Evolucao, string, string][] = [
  ["temas_abordados", "Temas abordados", "Um por linha"],
  ["intervencoes", "Intervenções", "Uma por linha"],
  ["alertas", "Alertas de risco", "Um por linha. Deixe vazio se não houver."],
];

/** Edição do rascunho. "Marcar como revisada" trava a evolução como prontuário. */
export function EditorEvolucao({ id, conteudo }: { id: string; conteudo: Evolucao }) {
  const [estadoRascunho, salvarRascunho, salvandoRascunho] = useActionState(salvarEvolucao.bind(null, id, false), {});
  const [estadoRevisao, revisar, revisando] = useActionState(salvarEvolucao.bind(null, id, true), {});
  const pendente = salvandoRascunho || revisando;

  return (
    <form className="flex flex-col gap-5">
      {conteudo.pontos_a_confirmar.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Pontos a confirmar antes de revisar</p>
          <ul className="mt-1 list-disc pl-5">
            {conteudo.pontos_a_confirmar.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <input type="hidden" name="pontos_a_confirmar" value={conteudo.pontos_a_confirmar.join("\n")} />
        </div>
      )}
      <label className={rotulo}>
        Resumo
        <textarea name="resumo" defaultValue={conteudo.resumo} rows={4} required className={campo} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS_LISTA.map(([nome, titulo, dica]) => (
          <label key={nome} className={`${rotulo} ${nome === "alertas" ? "sm:col-span-2" : ""}`}>
            {titulo} <span className="font-normal text-stone-500">({dica})</span>
            <textarea name={nome} defaultValue={(conteudo[nome] as string[]).join("\n")} rows={3} className={campo} />
          </label>
        ))}
      </div>
      <label className={rotulo}>
        Observações clínicas
        <textarea name="observacoes_clinicas" defaultValue={conteudo.observacoes_clinicas} rows={3} className={campo} />
      </label>
      <label className={rotulo}>
        Plano para a próxima sessão
        <textarea name="plano_proxima_sessao" defaultValue={conteudo.plano_proxima_sessao} rows={2} className={campo} />
      </label>

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-5">
        <button
          formAction={revisar}
          disabled={pendente}
          className={botaoPrimario}
          onClick={(e) => {
            if (!confirm("Depois de revisada, a evolução vira prontuário e não pode mais ser alterada. Continuar?")) {
              e.preventDefault();
            }
          }}
        >
          {revisando ? "Salvando..." : "Marcar como revisada"}
        </button>
        <button formAction={salvarRascunho} disabled={pendente} className={botaoSecundario}>
          {salvandoRascunho ? "Salvando..." : "Salvar rascunho"}
        </button>
        <button
          formAction={excluirEvolucao.bind(null, id)}
          disabled={pendente}
          formNoValidate
          className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
          onClick={(e) => {
            if (!confirm("Excluir este rascunho?")) e.preventDefault();
          }}
        >
          Excluir rascunho
        </button>
      </div>
      <MensagemForm estado={estadoRevisao.erro ? estadoRevisao : estadoRascunho} sucesso={estadoRascunho.mensagem} />
    </form>
  );
}
