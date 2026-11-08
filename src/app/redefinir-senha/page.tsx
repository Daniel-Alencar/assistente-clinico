import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormularioNovaSenha } from "./formulario";

export default async function RedefinirSenha() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?erro=link");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-4 py-12">
      <Logo />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Crie uma nova senha</h1>
        <p className="text-stone-600">
          Conta <strong className="text-stone-900">{user.email}</strong>.
        </p>
      </div>
      <FormularioNovaSenha />
    </main>
  );
}
