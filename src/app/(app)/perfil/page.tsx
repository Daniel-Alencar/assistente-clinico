import { FormularioPerfil, type Perfil } from "@/components/formulario-perfil";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export default async function PaginaPerfil() {
  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase
    .from("profissionais")
    .select("nome, profissao, registro_conselho, telefone, valor_sessao_padrao, fuso_horario")
    .single();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
      <FormularioPerfil perfil={(perfil as Perfil) ?? undefined} destino={null} />
    </section>
  );
}
