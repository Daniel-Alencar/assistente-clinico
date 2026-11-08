"use client";

import type { AuthError } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { botaoPrimario, campo, rotulo } from "@/components/estilos";
import { IconeEmail } from "@/components/icones";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export type ModoAcesso = "entrar" | "criar" | "esqueci";

const MINIMO_SENHA = 8;

const TEXTOS: Record<ModoAcesso, { titulo: string; descricao: string; botao: string; enviando: string }> = {
  entrar: { titulo: "Entre na sua conta", descricao: "Use seu e-mail e sua senha.", botao: "Entrar", enviando: "Entrando..." },
  criar: { titulo: "Crie sua conta", descricao: "Leva menos de um minuto.", botao: "Criar conta", enviando: "Criando..." },
  esqueci: {
    titulo: "Recuperar senha",
    descricao: "Enviamos um link para você criar uma nova senha.",
    botao: "Enviar link",
    enviando: "Enviando...",
  },
};

function mensagemErro(erro: AuthError) {
  switch (erro.code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos. Se sua conta ainda não tem senha, use “Esqueci minha senha”.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada e no spam.";
    case "weak_password":
      return `Senha fraca. Use pelo menos ${MINIMO_SENHA} caracteres.`;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
    default:
      console.error(erro);
      return "Não foi possível concluir agora. Tente novamente em instantes.";
  }
}

export function FormularioAcesso({ modoInicial, erroInicial }: { modoInicial: ModoAcesso; erroInicial: string | null }) {
  const router = useRouter();
  const [modo, setModo] = useState(modoInicial);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(erroInicial);
  const [semConfirmacao, setSemConfirmacao] = useState(false);
  const [enviado, setEnviado] = useState<"confirmacao" | "recuperacao" | null>(null);

  const linkCadastro = () => `${window.location.origin}/auth/callback`;

  function trocarModo(novo: ModoAcesso) {
    setModo(novo);
    setErro(null);
    setSemConfirmacao(false);
  }

  function falhar(falha: AuthError) {
    setEnviando(false);
    setSemConfirmacao(falha.code === "email_not_confirmed");
    setErro(mensagemErro(falha));
  }

  function irParaApp() {
    router.replace("/agenda");
    router.refresh();
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    setSemConfirmacao(false);
    const { auth } = criarClienteNavegador();

    if (modo === "entrar") {
      const { error } = await auth.signInWithPassword({ email, password: senha });
      if (error) return falhar(error);
      return irParaApp();
    }

    if (modo === "esqueci") {
      const { error } = await auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/redefinir`,
      });
      if (error) return falhar(error);
      setEnviando(false);
      return setEnviado("recuperacao");
    }

    const { data, error } = await auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: linkCadastro() },
    });
    if (error) return falhar(error);
    if (data.session) return irParaApp();

    setEnviando(false);
    // Com confirmação ativa, o Supabase não dá erro para e-mail já cadastrado: devolve `identities` vazio.
    if (data.user?.identities?.length === 0) {
      setModo("entrar");
      return setErro("Já existe uma conta com este e-mail. Entre com sua senha ou use “Esqueci minha senha”.");
    }
    setEnviado("confirmacao");
  }

  async function reenviarConfirmacao() {
    setEnviando(true);
    setErro(null);
    const { error } = await criarClienteNavegador().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: linkCadastro() },
    });
    if (error) return falhar(error);
    setEnviando(false);
    setSemConfirmacao(false);
    setEnviado("confirmacao");
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-marca-fundo text-marca">
          <IconeEmail className="size-6" />
        </span>
        <h2 className="text-2xl font-bold tracking-tight">Confira seu e-mail</h2>
        <p className="text-stone-600">
          {enviado === "confirmacao" ? "Enviamos um link de confirmação para " : "Se houver uma conta, enviamos um link para "}
          <strong className="text-stone-900">{email}</strong>.{" "}
          {enviado === "confirmacao" ? "Clique nele para ativar sua conta." : "Clique nele para criar uma nova senha."}
        </p>
        <button
          onClick={() => {
            setEnviado(null);
            trocarModo("entrar");
          }}
          className="text-sm font-medium text-marca hover:underline"
        >
          Voltar para o login
        </button>
      </div>
    );
  }

  const textos = TEXTOS[modo];
  const link = "font-medium text-marca hover:underline";

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">{textos.titulo}</h2>
        <p className="text-stone-600">{textos.descricao}</p>
      </div>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <label className={rotulo}>
          E-mail
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@consultorio.com.br"
            className={campo}
          />
        </label>
        {modo !== "esqueci" && (
          <label className={rotulo}>
            Senha
            <input
              type="password"
              required
              minLength={modo === "criar" ? MINIMO_SENHA : undefined}
              autoComplete={modo === "criar" ? "new-password" : "current-password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={campo}
            />
            {modo === "criar" && <span className="font-normal text-stone-500">Mínimo de {MINIMO_SENHA} caracteres.</span>}
          </label>
        )}
        <button disabled={enviando} className={`${botaoPrimario} w-full`}>
          {enviando ? textos.enviando : textos.botao}
        </button>
        {erro && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            <p>{erro}</p>
            {semConfirmacao && (
              <button type="button" onClick={reenviarConfirmacao} disabled={enviando} className="mt-1 font-semibold underline">
                Reenviar e-mail de confirmação
              </button>
            )}
          </div>
        )}
      </form>
      <div className="flex flex-col items-start gap-2 text-sm text-stone-600">
        {modo === "entrar" && (
          <>
            <button onClick={() => trocarModo("esqueci")} className={link}>
              Esqueci minha senha
            </button>
            <p>
              Ainda não tem conta?{" "}
              <button onClick={() => trocarModo("criar")} className={link}>
                Criar conta
              </button>
            </p>
          </>
        )}
        {modo !== "entrar" && (
          <button onClick={() => trocarModo("entrar")} className={link}>
            {modo === "criar" ? "Já tenho conta" : "Voltar para o login"}
          </button>
        )}
      </div>
      {modo !== "esqueci" && (
        <p className="text-xs text-stone-500">
          {modo === "criar" ? "Ao criar a conta" : "Ao entrar"}, você concorda com os{" "}
          <Link href="/termos" className="underline hover:text-stone-700">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="underline hover:text-stone-700">
            Política de Privacidade
          </Link>
          .
        </p>
      )}
    </>
  );
}
