"use client";

import Link from "next/link";
import { useState } from "react";
import { botaoPrimario, campo, rotulo } from "@/components/estilos";
import { IconeCheck, IconeEmail } from "@/components/icones";
import { Logo } from "@/components/logo";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

const VANTAGENS = [
  "Lembretes automáticos no WhatsApp",
  "Evolução da sessão escrita pela IA a partir do seu ditado",
  "Cobrança via Pix com recibo",
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "enviado">("inicial");
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setEstado("enviando");
    setErro(null);
    try {
      const { error } = await criarClienteNavegador().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setEstado("enviado");
    } catch (e) {
      console.error(e);
      setErro("Não foi possível enviar o link agora. Tente novamente em instantes.");
      setEstado("inicial");
    }
  }

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

          {estado === "enviado" ? (
            <div className="flex flex-col items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-full bg-marca-fundo text-marca">
                <IconeEmail className="size-6" />
              </span>
              <h2 className="text-2xl font-bold tracking-tight">Confira seu e-mail</h2>
              <p className="text-stone-600">
                Enviamos um link de acesso para <strong className="text-stone-900">{email}</strong>. Abra
                no mesmo navegador para entrar.
              </p>
              <button onClick={() => setEstado("inicial")} className="text-sm font-medium text-marca hover:underline">
                Usar outro e-mail
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight">Entre na sua conta</h2>
                <p className="text-stone-600">Sem senha: enviamos um link de acesso para o seu e-mail.</p>
              </div>
              <form onSubmit={entrar} className="flex flex-col gap-4">
                <label className={rotulo}>
                  E-mail
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@consultorio.com.br"
                    className={campo}
                  />
                </label>
                <button disabled={estado === "enviando"} className={`${botaoPrimario} w-full`}>
                  {estado === "enviando" ? "Enviando..." : "Receber link de acesso"}
                </button>
                {erro && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {erro}
                  </p>
                )}
              </form>
              <p className="text-xs text-stone-500">
                Ao entrar, você concorda com os Termos de Uso e a Política de Privacidade.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
