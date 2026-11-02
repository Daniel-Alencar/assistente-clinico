"use client";

import { useActionState } from "react";
import { salvarPerfil } from "@/app/(app)/acoes";
import { formatarTelefone } from "@/lib/dominio/formatacao";
import { botaoPrimario, campo, rotulo } from "./estilos";
import { MensagemForm } from "./mensagem-form";

export type Perfil = {
  nome: string;
  profissao: string;
  registro_conselho: string | null;
  telefone: string | null;
  valor_sessao_padrao: number | null;
  fuso_horario: string;
};

const FUSOS: [string, string][] = [
  ["America/Sao_Paulo", "Brasília (SP, RJ, MG, Sul, GO, DF...)"],
  ["America/Bahia", "Bahia"],
  ["America/Fortaleza", "Nordeste (CE, RN, PB, PI, MA)"],
  ["America/Recife", "Pernambuco"],
  ["America/Belem", "Pará / Amapá"],
  ["America/Cuiaba", "Mato Grosso / MS (-1h)"],
  ["America/Manaus", "Amazonas (-1h)"],
  ["America/Porto_Velho", "Rondônia (-1h)"],
  ["America/Boa_Vista", "Roraima (-1h)"],
  ["America/Rio_Branco", "Acre (-2h)"],
  ["America/Noronha", "Fernando de Noronha (+1h)"],
];

/** `destino`: rota após salvar no cadastro inicial; null na edição do perfil. */
export function FormularioPerfil({ perfil, destino }: { perfil?: Perfil; destino: string | null }) {
  const [estado, acao, pendente] = useActionState(salvarPerfil.bind(null, destino), {});

  return (
    <form action={acao} className="flex max-w-lg flex-col gap-4">
      <label className={rotulo}>
        Nome (como aparece para os pacientes)
        <input name="nome" required defaultValue={perfil?.nome} className={campo} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={rotulo}>
          Profissão
          <select name="profissao" defaultValue={perfil?.profissao ?? "psicologo"} className={campo}>
            <option value="psicologo">Psicólogo(a)</option>
            <option value="medico">Médico(a)</option>
            <option value="outro">Outra</option>
          </select>
        </label>
        <label className={rotulo}>
          CRP / CRM
          <input name="registro_conselho" defaultValue={perfil?.registro_conselho ?? ""} className={campo} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={rotulo}>
          Seu WhatsApp
          <input
            name="telefone"
            inputMode="tel"
            placeholder="(11) 99999-8888"
            defaultValue={perfil?.telefone ? formatarTelefone(perfil.telefone) : ""}
            className={campo}
          />
        </label>
        <label className={rotulo}>
          Valor padrão da sessão
          <input
            name="valor_sessao_padrao"
            inputMode="decimal"
            placeholder="150,00"
            defaultValue={perfil?.valor_sessao_padrao?.toFixed(2).replace(".", ",") ?? ""}
            className={campo}
          />
        </label>
      </div>
      <label className={rotulo}>
        Fuso horário
        <select name="fuso_horario" defaultValue={perfil?.fuso_horario ?? "America/Sao_Paulo"} className={campo}>
          {FUSOS.map(([valor, nome]) => (
            <option key={valor} value={valor}>
              {nome}
            </option>
          ))}
        </select>
      </label>
      <button disabled={pendente} className={botaoPrimario}>
        {pendente ? "Salvando..." : destino ? "Continuar" : "Salvar"}
      </button>
      <MensagemForm estado={estado} sucesso="Perfil salvo." />
    </form>
  );
}
