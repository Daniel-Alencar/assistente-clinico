import Link from "next/link";
import { botaoSecundario, cartao } from "@/components/estilos";
import { FormularioPerfil, type Perfil } from "@/components/formulario-perfil";
import { CabecalhoPagina, Secao } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export default async function PaginaPerfil() {
  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase
    .from("profissionais")
    .select("nome, profissao, registro_conselho, telefone, valor_sessao_padrao, fuso_horario, cpf, tipo_chave_pix, chave_pix")
    .single();

  return (
    <>
      <CabecalhoPagina titulo="Perfil" descricao="Seus dados profissionais, valor padrão da sessão e fuso horário." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${cartao} p-6 lg:col-span-2`}>
          <FormularioPerfil perfil={(perfil as Perfil) ?? undefined} destino={null} />
        </div>
        <aside className="flex flex-col gap-6">
          <Secao titulo="Assinatura">
            <p className="text-sm text-stone-600">Plano, período de teste e pagamento da plataforma.</p>
            <Link href="/assinatura" className={`${botaoSecundario} mt-3`}>
              Gerenciar assinatura
            </Link>
          </Secao>
          <Secao titulo="Seus dados">
            <p className="text-sm text-stone-600">
              Os dados são seus. Baixe tudo em planilhas (CSV) quando quiser, inclusive se cancelar.
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {[
                ["pacientes", "Pacientes"],
                ["consultas", "Consultas"],
                ["evolucoes", "Evoluções"],
                ["cobrancas", "Cobranças"],
                ["analises", "Análises diagnósticas"],
              ].map(([tipo, nome]) => (
                <li key={tipo}>
                  <a href={`/api/exportar/dados?tipo=${tipo}`} className="font-medium text-marca hover:underline">
                    Baixar {nome.toLowerCase()} (CSV)
                  </a>
                </li>
              ))}
            </ul>
          </Secao>
        </aside>
      </div>
    </>
  );
}
