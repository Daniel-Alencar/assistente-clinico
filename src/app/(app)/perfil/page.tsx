import { cartao } from "@/components/estilos";
import { FormularioPerfil, type Perfil } from "@/components/formulario-perfil";
import { CabecalhoPagina } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export default async function PaginaPerfil() {
  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase
    .from("profissionais")
    .select("nome, profissao, registro_conselho, telefone, valor_sessao_padrao, fuso_horario")
    .single();

  return (
    <>
      <CabecalhoPagina titulo="Perfil" descricao="Seus dados profissionais, valor padrão da sessão e fuso horário." />
      <div className={`${cartao} max-w-2xl p-6`}>
        <FormularioPerfil perfil={(perfil as Perfil) ?? undefined} destino={null} />
      </div>
    </>
  );
}
