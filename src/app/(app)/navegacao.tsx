"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeAgenda, IconeDinheiro, IconeEvolucao, IconePacientes, IconePerfil } from "@/components/icones";

const ITENS = [
  { href: "/agenda", rotulo: "Agenda", curto: "Agenda", icone: IconeAgenda },
  { href: "/pacientes", rotulo: "Pacientes", curto: "Pacientes", icone: IconePacientes },
  { href: "/evolucoes/nova", rotulo: "Nova evolução", curto: "Evolução", icone: IconeEvolucao },
  { href: "/financeiro", rotulo: "Financeiro", curto: "Financeiro", icone: IconeDinheiro },
  { href: "/perfil", rotulo: "Perfil", curto: "Perfil", icone: IconePerfil },
];

function useAtivo() {
  const caminho = usePathname();
  return (href: string) => caminho === href || caminho.startsWith(`${href}/`);
}

/** Menu lateral (desktop). */
export function NavegacaoLateral() {
  const ativo = useAtivo();
  return (
    <nav className="flex flex-col gap-0.5">
      {ITENS.map(({ href, rotulo, icone: Icone }) => (
        <Link
          key={href}
          href={href}
          aria-current={ativo(href) ? "page" : undefined}
          className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            ativo(href) ? "bg-white text-marca shadow-xs ring-1 ring-stone-200/80" : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
          }`}
        >
          <Icone className={`size-[18px] ${ativo(href) ? "text-marca" : "text-stone-400 group-hover:text-stone-600"}`} />
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior fixa (celular). */
export function NavegacaoInferior() {
  const ativo = useAtivo();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {ITENS.map(({ href, curto, icone: Icone }) => (
        <Link
          key={href}
          href={href}
          aria-current={ativo(href) ? "page" : undefined}
          className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
            ativo(href) ? "text-marca" : "text-stone-500"
          }`}
        >
          <Icone className="size-5" />
          {curto}
        </Link>
      ))}
    </nav>
  );
}
