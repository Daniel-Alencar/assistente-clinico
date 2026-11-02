"use client";

import { useEffect, useRef, useState } from "react";
import { IconeReticencias } from "./icones";

/** Menu suspenso simples: fecha ao clicar fora, ao apertar Esc ou ao escolher um item. */
export function Menu({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className="flex size-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
      >
        <IconeReticencias className="size-5" />
      </button>
      {aberto && (
        <div
          onClick={() => setAberto(false)}
          className="absolute right-0 z-20 mt-1 flex min-w-44 flex-col rounded-xl border border-stone-200 bg-white p-1 shadow-lg [&_button]:w-full [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button]:text-sm [&_button:hover]:bg-stone-100"
        >
          {children}
        </div>
      )}
    </div>
  );
}
