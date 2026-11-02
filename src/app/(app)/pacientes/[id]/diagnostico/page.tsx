import Link from "next/link";
import { notFound } from "next/navigation";
import { cartao } from "@/components/estilos";
import { CabecalhoPagina } from "@/components/ui";
import type { Diagnostico } from "@/lib/ia/esquemas";
import type { Mensagem } from "@/lib/ia/tipos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { AssistenteDiagnostico } from "./assistente";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analise?: string }>;
};

export default async function ApoioDiagnostico({ params, searchParams }: Props) {
  const { id } = await params;
  const { analise: analiseId } = await searchParams;
  const supabase = await criarClienteServidor();

  const [{ data: paciente }, { data: analises }] = await Promise.all([
    supabase.from("pacientes").select("id, nome").eq("id", id).maybeSingle(),
    supabase
      .from("analises_diagnosticas")
      .select("id, criado_em, resultado, mensagens")
      .eq("paciente_id", id)
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);
  if (!paciente) notFound();

  const atual = analises?.find((a) => a.id === analiseId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <CabecalhoPagina
          titulo="Apoio ao diagnóstico"
          descricao="Descreva o caso e refine as hipóteses respondendo às perguntas do assistente."
          antes={
            <Link href={`/pacientes/${paciente.id}`} className="text-sm text-stone-500 hover:text-marca">
              ← {paciente.nome}
            </Link>
          }
        />
        <p className="-mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ferramenta de apoio à decisão. As hipóteses são geradas por IA a partir do seu relato e não
          substituem a avaliação clínica: o diagnóstico é sempre seu. O nome do paciente não é enviado à IA.
        </p>
      </div>

      <AssistenteDiagnostico
        key={atual?.id ?? "nova"}
        pacienteId={paciente.id}
        analiseInicial={
          atual
            ? {
                id: atual.id,
                mensagens: atual.mensagens as Mensagem[],
                resultado: atual.resultado as Diagnostico,
              }
            : null
        }
      />

      {!!analises?.length && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Análises anteriores</h2>
          <ul className={`${cartao} divide-y divide-stone-100`}>
            {analises.map((a) => {
              const principal = (a.resultado as Diagnostico | null)?.hipoteses?.[0];
              return (
                <li key={a.id}>
                  <Link
                    href={`/pacientes/${paciente.id}/diagnostico?analise=${a.id}`}
                    className={`flex justify-between gap-3 px-4 py-3 text-sm hover:bg-stone-50 ${
                      a.id === analiseId ? "bg-marca-fundo" : ""
                    }`}
                  >
                    <span className="font-medium">{principal?.nome ?? "Sem hipótese"}</span>
                    <span className="text-stone-500">{new Date(a.criado_em).toLocaleDateString("pt-BR")}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
