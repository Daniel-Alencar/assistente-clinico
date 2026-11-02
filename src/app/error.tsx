"use client";

import { useEffect } from "react";
import { botaoPrimario, botaoSecundario } from "@/components/estilos";
import { Logo } from "@/components/logo";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Algo deu errado</h1>
        <p className="mt-2 max-w-md text-stone-500">
          Não conseguimos carregar esta página. Seus dados estão seguros. Tente novamente em instantes.
        </p>
        {error.digest && <p className="mt-2 text-xs text-stone-400">Código: {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={reset} className={botaoPrimario}>
          Tentar novamente
        </button>
        <a href="/agenda" className={botaoSecundario}>
          Ir para a agenda
        </a>
      </div>
    </main>
  );
}
