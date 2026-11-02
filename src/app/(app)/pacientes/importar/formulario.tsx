"use client";

import { useActionState } from "react";
import { importarPacientes } from "@/app/(app)/acoes";
import { botaoPrimario, campo } from "@/components/estilos";
import { MensagemForm } from "@/components/mensagem-form";

export function FormularioImportacao() {
  const [estado, acao, pendente] = useActionState(importarPacientes, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="file" name="arquivo" accept=".csv,text/csv" required className={`${campo} file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1`} />
      <button disabled={pendente} className={botaoPrimario}>
        {pendente ? "Importando..." : "Importar pacientes"}
      </button>
      <MensagemForm estado={estado} sucesso={estado.mensagem} />
    </form>
  );
}
