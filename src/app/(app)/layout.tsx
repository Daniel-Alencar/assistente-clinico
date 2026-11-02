import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { Navegacao } from "./navegacao";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("profissionais").select("nome").eq("id", user.id).maybeSingle();
  if (!perfil) redirect("/cadastro");

  return (
    <div className="lg:flex">
      <aside className="sticky top-0 z-10 flex flex-col gap-4 border-b border-stone-200 bg-white px-4 py-3 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0 lg:py-6">
        <Link href="/agenda" className="px-2">
          <Logo tamanho={28} />
        </Link>
        <Navegacao />
        <div className="mt-auto hidden rounded-lg bg-stone-50 px-3 py-2 text-sm lg:block">
          <p className="font-semibold text-stone-900">{perfil.nome}</p>
          <p className="truncate text-stone-500">{user.email}</p>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-10">{children}</main>
    </div>
  );
}
