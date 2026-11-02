import { criarClienteServidor } from "@/lib/supabase/servidor";
import { CabecalhoPagina } from "@/components/ui";
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
    <>
      <CabecalhoPagina
        titulo="Nova evolução"
        descricao="Dite um resumo da sessão pelo microfone do teclado do celular. A IA organiza o texto em uma evolução estruturada para você revisar."
      />
      <FormularioEvolucao pacientes={pacientes ?? []} pacienteInicial={paciente} consultaId={consulta} />
    </>
  );
}
