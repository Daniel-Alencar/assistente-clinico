import Link from "next/link";
import { IconeCheck } from "@/components/icones";
import { Logo } from "@/components/logo";
import { FormularioAcesso } from "./formulario-acesso";

const VANTAGENS = [
  "Lembretes automáticos no WhatsApp",
  "Evolução da sessão escrita pela IA a partir do seu ditado",
  "Cobrança via Pix com recibo",
];

type Props = { searchParams: Promise<{ modo?: string; erro?: string }> };

export default async function Login({ searchParams }: Props) {
  const { modo, erro } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-marca p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5" />
        <Link href="/" className="relative">
          <Logo claro />
        </Link>
        <div className="relative flex flex-col gap-6">
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            Menos burocracia. Mais tempo para seus pacientes.
          </h1>
          <ul className="flex flex-col gap-3 text-marca-clara">
            {VANTAGENS.map((v) => (
              <li key={v} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/15">
                  <IconeCheck className="size-4" />
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-marca-clara/80">Dados protegidos conforme a LGPD.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>

          <FormularioAcesso
            modoInicial={modo === "criar" ? "criar" : "entrar"}
            erroInicial={erro === "link" ? "Este link expirou ou foi aberto em outro navegador. Entre com sua senha ou peça um novo link em “Esqueci minha senha”." : null}
          />
        </div>
      </section>
    </main>
  );
}
