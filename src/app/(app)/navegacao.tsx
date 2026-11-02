"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeAgenda, IconeEvolucao, IconePacientes, IconePerfil } from "@/components/icones";

const ITENS = [
  { href: "/agenda", rotulo: "Agenda", icone: IconeAgenda },
  { href: "/pacientes", rotulo: "Pacientes", icone: IconePacientes },
  { href: "/evolucoes/nova", rotulo: "Nova evolução", icone: IconeEvolucao },
  { href: "/perfil", rotulo: "Perfil", icone: IconePerfil },
];

export function Navegacao() {
  const caminho = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITENS.map(({ href, rotulo, icone: Icone }) => {
        const ativo = caminho === href || caminho.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              ativo ? "bg-marca-fundo text-marca" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <Icone className="size-5" />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
