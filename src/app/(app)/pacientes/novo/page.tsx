import { FormularioPaciente } from "../formulario-paciente";

export default function NovoPaciente() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Novo paciente</h1>
      <FormularioPaciente />
    </section>
  );
}
