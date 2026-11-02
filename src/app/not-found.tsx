import Link from "next/link";
import { botaoPrimario } from "@/components/estilos";
import { Logo } from "@/components/logo";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <p className="text-sm font-semibold text-marca">Erro 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-stone-500">O endereço pode ter mudado ou o registro não existe mais.</p>
      </div>
      <Link href="/agenda" className={botaoPrimario}>
        Voltar para a agenda
      </Link>
    </main>
  );
}
