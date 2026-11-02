"use client";

import Link from "next/link";
import { useState } from "react";
import { campo, cartao } from "@/components/estilos";
import { IconeBusca } from "@/components/icones";
import { Avatar, Selo, Vazio } from "@/components/ui";

export type ItemPaciente = {
  id: string;
  nome: string;
  idade: string | null;
  telefone: string | null;
  aceitaWhatsapp: boolean;
  proximaConsulta: string | null; // já formatada
};

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ListaPacientes({ pacientes }: { pacientes: ItemPaciente[] }) {
  const [busca, setBusca] = useState("");
  const termo = normalizar(busca.trim());
  const digitos = termo.replace(/\D/g, "");
  const filtrados = termo
    ? pacientes.filter(
        (p) => normalizar(p.nome).includes(termo) || (!!digitos && !!p.telefone?.replace(/\D/g, "").includes(digitos)),
      )
    : pacientes;

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block max-w-sm">
        <span className="sr-only">Buscar paciente</span>
        <IconeBusca className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className={`${campo} pl-9`}
        />
      </label>

      <div className={cartao}>
        <div className="hidden grid-cols-[1fr_9rem_9rem_8rem] gap-4 border-b border-stone-100 px-5 py-2.5 text-xs font-medium tracking-wide text-stone-500 uppercase md:grid">
          <span>Paciente</span>
          <span>WhatsApp</span>
          <span>Próxima consulta</span>
          <span className="text-right">Lembretes</span>
        </div>
        {filtrados.length === 0 ? (
          <Vazio>{busca ? "Nenhum paciente encontrado." : "Nenhum paciente aqui."}</Vazio>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filtrados.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pacientes/${p.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-stone-50 md:grid-cols-[1fr_9rem_9rem_8rem]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar nome={p.nome} tamanho="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-900">{p.nome}</span>
                      {p.idade && <span className="text-sm text-stone-500">{p.idade}</span>}
                    </span>
                  </span>
                  <span className="hidden text-sm tabular-nums text-stone-600 md:block">{p.telefone ?? "—"}</span>
                  <span className="hidden text-sm text-stone-600 md:block">{p.proximaConsulta ?? "—"}</span>
                  <span className="text-right">
                    {p.aceitaWhatsapp ? (
                      <Selo tom="verde" ponto>Ativos</Selo>
                    ) : (
                      <Selo>{p.telefone ? "Sem autorização" : "Sem WhatsApp"}</Selo>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="px-1 text-sm text-stone-500">
        {filtrados.length} de {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}
      </p>
    </div>
  );
}
