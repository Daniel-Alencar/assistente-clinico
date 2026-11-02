"use client";

import { useActionState } from "react";
import { editarConsulta } from "@/app/(app)/acoes";
import { botaoPrimario, campo, rotulo } from "@/components/estilos";
import { MensagemForm } from "@/components/mensagem-form";

type Props = {
  id: string;
  data: string;
  hora: string;
  duracao: number;
  modalidade: string;
  valor: number | null;
};

export function FormularioEditarConsulta({ id, data, hora, duracao, modalidade, valor }: Props) {
  const [estado, acao, pendente] = useActionState(editarConsulta.bind(null, id), {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={rotulo}>
          Data
          <input name="data" type="date" required defaultValue={data} className={campo} />
        </label>
        <label className={rotulo}>
          Hora
          <input name="hora" type="time" required step={300} defaultValue={hora} className={campo} />
        </label>
        <label className={rotulo}>
          Duração (min)
          <input name="duracao_min" type="number" min={10} max={240} defaultValue={duracao} className={campo} />
        </label>
        <label className={rotulo}>
          Valor
          <input
            name="valor"
            inputMode="decimal"
            defaultValue={valor != null ? Number(valor).toFixed(2).replace(".", ",") : ""}
            className={campo}
          />
        </label>
      </div>
      <label className={`${rotulo} max-w-xs`}>
        Modalidade
        <select name="modalidade" defaultValue={modalidade} className={campo}>
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
        </select>
      </label>
      <button disabled={pendente} className={botaoPrimario}>
        {pendente ? "Salvando..." : "Salvar alterações"}
      </button>
      <MensagemForm estado={estado} sucesso={estado.mensagem} />
    </form>
  );
}
