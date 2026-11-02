"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { botaoSecundario } from "@/components/estilos";

/** Cria o Pix no Mercado Pago e envia ao paciente pelo WhatsApp (via /api/cobrancas). */
export function BotaoCobrar({ consultaId }: { consultaId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function cobrar() {
    setEnviando(true);
    setErro(null);
    const resposta = await fetch("/api/cobrancas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultaId }),
    });
    setEnviando(false);
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      return setErro(dados.erro ?? "Falha ao gerar cobrança");
    }
    router.refresh();
  }

  return (
    <>
      <button onClick={cobrar} disabled={enviando} className={botaoSecundario}>
        {enviando ? "Gerando Pix..." : "Cobrar via Pix"}
      </button>
      {erro && <span className="w-full text-sm text-red-700">{erro}</span>}
    </>
  );
}
