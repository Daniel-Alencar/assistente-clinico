import Link from "next/link";
import { VERSAO_TERMOS } from "@/lib/dominio/termos";
import { Logo } from "./logo";

/** Layout das páginas de Termos e Privacidade. */
export function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const vigencia = new Date(`${VERSAO_TERMOS}T12:00:00Z`).toLocaleDateString("pt-BR");
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-stone-200">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <Link href="/">
            <Logo tamanho={28} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-sm text-stone-500">Versão em vigor desde {vigencia}.</p>
        <div className="mt-8 flex flex-col gap-4 leading-relaxed text-stone-700 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
    </div>
  );
}
