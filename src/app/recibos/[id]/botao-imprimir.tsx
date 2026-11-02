"use client";

import { botaoPrimario } from "@/components/estilos";

export function BotaoImprimir() {
  return (
    <button onClick={() => window.print()} className={botaoPrimario}>
      Imprimir ou salvar em PDF
    </button>
  );
}
