import Link from "next/link";
import { notFound } from "next/navigation";
import { cartao } from "@/components/estilos";
import { CabecalhoPagina } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormularioPaciente, type DadosPaciente } from "../../formulario-paciente";

export default async function EditarPaciente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nome, telefone_whatsapp, email, cpf, data_nascimento, aceita_whatsapp")
    .eq("id", id)
    .maybeSingle();
  if (!paciente) notFound();

  return (
    <>
      <CabecalhoPagina
        titulo="Dados cadastrais"
        antes={
          <Link href={`/pacientes/${id}`} className="text-sm text-stone-500 hover:text-marca">
            ← {paciente.nome}
          </Link>
        }
      />
      <div className={`${cartao} max-w-2xl p-6`}>
        <FormularioPaciente paciente={paciente as DadosPaciente} />
      </div>
    </>
  );
}
