"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarConsulta } from "@/app/(app)/acoes";
import { botaoPrimario, campo, rotulo } from "@/components/estilos";
import { MensagemForm } from "@/components/mensagem-form";

type Props = {
  pacientes: { id: string; nome: string }[];
  valorPadrao: number | null;
  hoje: string; // yyyy-mm-dd no fuso do profissional
  aoSalvar?: () => void;
};

export function FormularioConsulta({ pacientes, valorPadrao, hoje, aoSalvar }: Props) {
  const [estado, acao, pendente] = useActionState(criarConsulta, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!estado.ok) return;
    ref.current?.reset();
    aoSalvar?.();
  }, [estado, aoSalvar]);

  if (!pacientes.length) {
    return <p className="text-stone-600">Cadastre um paciente para começar a agendar.</p>;
  }

  return (
    <form ref={ref} action={acao} className="flex flex-col gap-4">
      <label className={rotulo}>
        Paciente
        <select name="paciente_id" required className={campo}>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={rotulo}>
          Data
          <input name="data" type="date" required min={hoje} defaultValue={hoje} className={campo} />
        </label>
        <label className={rotulo}>
          Hora
          <input name="hora" type="time" required step={300} className={campo} />
        </label>
        <label className={rotulo}>
          Duração (min)
          <input name="duracao_min" type="number" min={10} max={240} defaultValue={50} className={campo} />
        </label>
        <label className={rotulo}>
          Valor
          <input
            name="valor"
            inputMode="decimal"
            placeholder={valorPadrao ? valorPadrao.toFixed(2).replace(".", ",") : "150,00"}
            className={campo}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={rotulo}>
          Modalidade
          <select name="modalidade" className={campo}>
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
          </select>
        </label>
        <label className={rotulo}>
          Repetir toda semana
          <select name="repetir_semanas" className={campo}>
            <option value="0">Não repetir</option>
            <option value="4">Por mais 4 semanas</option>
            <option value="8">Por mais 8 semanas</option>
            <option value="12">Por mais 12 semanas</option>
          </select>
        </label>
      </div>
      <button disabled={pendente} className={botaoPrimario}>
        {pendente ? "Agendando..." : "Agendar"}
      </button>
      <MensagemForm estado={estado} sucesso="Consulta agendada." />
    </form>
  );
}
