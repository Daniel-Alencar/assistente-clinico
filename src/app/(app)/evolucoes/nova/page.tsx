import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormularioEvolucao } from "./formulario";

type Props = { searchParams: Promise<{ paciente?: string; consulta?: string }> };

export default async function NovaEvolucao({ searchParams }: Props) {
  const { paciente, consulta } = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Nova evolução</h1>
      <p className="text-stone-600">
        Dite um resumo da sessão (use o microfone do teclado do celular). A IA organiza em uma
        evolução estruturada para você revisar.
      </p>
      <FormularioEvolucao pacientes={pacientes ?? []} pacienteInicial={paciente} consultaId={consulta} />
    </section>
  );
}
