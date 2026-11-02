"use client";

import { useCallback, useEffect, useState } from "react";
import { botaoPrimario } from "@/components/estilos";
import { IconeMais } from "@/components/icones";
import { FormularioConsulta } from "./formulario-consulta";

type Props = React.ComponentProps<typeof FormularioConsulta>;

/** Botão "Nova consulta" que abre o formulário numa janela e fecha ao salvar. */
export function PainelNovaConsulta(props: Omit<Props, "aoSalvar">) {
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aberto, fechar]);

  return (
    <>
      <button onClick={() => setAberto(true)} className={botaoPrimario}>
        <IconeMais className="size-4" /> Nova consulta
      </button>
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/30 backdrop-blur-[2px] sm:items-start sm:p-4 sm:pt-[12vh]"
          onMouseDown={(e) => e.target === e.currentTarget && fechar()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-nova-consulta"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="titulo-nova-consulta" className="text-lg font-semibold">
                Nova consulta
              </h2>
              <button onClick={fechar} className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900">
                Fechar
              </button>
            </div>
            <FormularioConsulta {...props} aoSalvar={fechar} />
          </div>
        </div>
      )}
    </>
  );
}
