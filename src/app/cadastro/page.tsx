import { redirect } from "next/navigation";
import { FormularioPerfil } from "@/components/formulario-perfil";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Primeiro acesso: o profissional precisa existir antes de cadastrar pacientes.
export default async function Cadastro() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("profissionais").select("id").eq("id", user.id).maybeSingle();
  if (perfil) redirect("/agenda");

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Bem-vindo(a)! Vamos configurar seu consultório</h1>
      <p className="text-stone-600">Leva menos de um minuto. Você pode alterar tudo depois em Perfil.</p>
      <FormularioPerfil destino="/agenda" />
    </main>
  );
}
