"use client";

import { useState, useTransition } from "react";
import { enviarReciboAoPaciente } from "@/app/(app)/acoes-cobrancas";
import { Menu } from "@/components/menu";

const SUCESSO = { whatsapp: "Recibo enviado pelo WhatsApp.", email: "Recibo enviado por e-mail." };

/** Fica fora do Menu o estado da mensagem, porque o menu fecha assim que o item é clicado. */
export function AcoesRecibo({ cobrancaId, nomePaciente }: { cobrancaId: string; nomePaciente: string }) {
  const [enviando, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ erro?: string; ok?: string } | null>(null);

  function enviar(canal: "whatsapp" | "email") {
    setResultado(null);
    iniciar(async () => {
      const { erro } = await enviarReciboAoPaciente(cobrancaId, canal);
      setResultado(erro ? { erro } : { ok: SUCESSO[canal] });
    });
  }

  return (
    <>
      <Menu rotulo={`Enviar recibo de ${nomePaciente}`}>
        <button type="button" disabled={enviando} onClick={() => enviar("whatsapp")}>
          Enviar no WhatsApp
        </button>
        <button type="button" disabled={enviando} onClick={() => enviar("email")}>
          Enviar por e-mail
        </button>
      </Menu>
      {enviando && <span className="w-full text-right text-sm text-stone-500">Enviando recibo...</span>}
      {resultado && (
        <span role="status" className={`w-full text-right text-sm ${resultado.erro ? "text-red-700" : "text-green-700"}`}>
          {resultado.erro ?? resultado.ok}
        </span>
      )}
    </>
  );
}
