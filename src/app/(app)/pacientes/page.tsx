import Link from "next/link";
import { botaoPrimario } from "@/components/estilos";
import { formatarTelefone } from "@/lib/dominio/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";

type Props = { searchParams: Promise<{ inativos?: string }> };

export default async function Pacientes({ searchParams }: Props) {
  const mostrarInativos = (await searchParams).inativos === "1";
  const supabase = await criarClienteServidor();
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nome, telefone_whatsapp, aceita_whatsapp, ativo")
    .eq("ativo", !mostrarInativos)
    .order("nome");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{mostrarInativos ? "Pacientes inativos" : "Pacientes"}</h1>
        <Link href="/pacientes/novo" className={botaoPrimario}>
          Novo paciente
        </Link>
      </div>
      {!pacientes?.length && <p className="text-stone-600">Nenhum paciente aqui.</p>}
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm">
        {pacientes?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/pacientes/${p.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50"
            >
              <span className="font-medium">{p.nome}</span>
              <span className="text-right text-sm text-stone-600">
                {p.telefone_whatsapp ? formatarTelefone(p.telefone_whatsapp) : "Sem WhatsApp"}
                {p.telefone_whatsapp && !p.aceita_whatsapp && " · sem autorização"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={mostrarInativos ? "/pacientes" : "/pacientes?inativos=1"} className="text-sm text-stone-600 underline">
        {mostrarInativos ? "Ver pacientes ativos" : "Ver pacientes inativos"}
      </Link>
    </section>
  );
}
