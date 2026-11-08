"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { botaoPrimario, campo, rotulo } from "@/components/estilos";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

const MINIMO_SENHA = 8;

export function FormularioNovaSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    const { error } = await criarClienteNavegador().auth.updateUser({ password: senha });
    if (error) {
      setEnviando(false);
      return setErro(
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da anterior."
          : error.code === "weak_password"
            ? `Senha fraca. Use pelo menos ${MINIMO_SENHA} caracteres.`
            : "Não foi possível salvar a senha. Tente novamente.",
      );
    }
    router.replace("/agenda");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <label className={rotulo}>
        Nova senha
        <input
          type="password"
          required
          autoFocus
          minLength={MINIMO_SENHA}
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className={campo}
        />
        <span className="font-normal text-stone-500">Mínimo de {MINIMO_SENHA} caracteres.</span>
      </label>
      <button disabled={enviando} className={`${botaoPrimario} w-full`}>
        {enviando ? "Salvando..." : "Salvar senha"}
      </button>
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
    </form>
  );
}
