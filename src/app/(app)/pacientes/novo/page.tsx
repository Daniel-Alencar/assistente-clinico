import Link from "next/link";
import { cartao } from "@/components/estilos";
import { CabecalhoPagina } from "@/components/ui";
import { FormularioPaciente } from "../formulario-paciente";

export default function NovoPaciente() {
  return (
    <>
      <CabecalhoPagina
        titulo="Novo paciente"
        descricao="Só o nome é obrigatório. Os demais dados podem ser completados depois."
        antes={
          <Link href="/pacientes" className="text-sm text-stone-500 hover:text-marca">
            ← Pacientes
          </Link>
        }
      />
      <div className={`${cartao} max-w-2xl p-6`}>
        <FormularioPaciente />
      </div>
    </>
  );
}
