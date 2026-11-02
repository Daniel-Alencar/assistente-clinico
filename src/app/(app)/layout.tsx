import Link from "next/link";
import { redirect } from "next/navigation";
import { IconeSair } from "@/components/icones";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { sair } from "./acoes";
import { NavegacaoInferior, NavegacaoLateral } from "./navegacao";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("profissionais").select("nome").eq("id", user.id).maybeSingle();
  if (!perfil) redirect("/cadastro");

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop: barra lateral */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200/80 bg-stone-100/60 px-4 py-6 lg:flex">
        <Link href="/agenda" className="mb-8 px-2">
          <Logo tamanho={28} />
        </Link>
        <NavegacaoLateral />
        <div className="mt-auto flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar nome={perfil.nome} tamanho="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-900">{perfil.nome}</p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
          </div>
          <form action={sair}>
            <button
              title="Sair"
              aria-label="Sair"
              className="flex size-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-white hover:text-stone-900"
            >
              <IconeSair className="size-[18px]" />
            </button>
          </form>
        </div>
      </aside>

      {/* Celular: barra superior + navegação inferior */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/agenda">
          <Logo tamanho={26} />
        </Link>
        <form action={sair}>
          <button className="flex items-center gap-1.5 text-sm font-medium text-stone-500">
            <IconeSair className="size-4" /> Sair
          </button>
        </form>
      </header>
      <NavegacaoInferior />

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>
    </div>
  );
}
