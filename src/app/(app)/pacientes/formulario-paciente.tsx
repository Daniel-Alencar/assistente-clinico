"use client";

import { useActionState } from "react";
import { salvarPaciente } from "@/app/(app)/acoes";
import { botaoPrimario, campo, rotulo } from "@/components/estilos";
import { MensagemForm } from "@/components/mensagem-form";
import { formatarTelefone } from "@/lib/dominio/formatacao";

export type DadosPaciente = {
  id: string;
  nome: string;
  telefone_whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  aceita_whatsapp: boolean;
};

export function FormularioPaciente({ paciente }: { paciente?: DadosPaciente }) {
  const [estado, acao, pendente] = useActionState(salvarPaciente.bind(null, paciente?.id ?? null), {});

  return (
    <form action={acao} className="flex max-w-lg flex-col gap-4">
      <label className={rotulo}>
        Nome completo
        <input name="nome" required defaultValue={paciente?.nome} className={campo} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={rotulo}>
          WhatsApp
          <input
            name="telefone_whatsapp"
            inputMode="tel"
            placeholder="(11) 99999-8888"
            defaultValue={paciente?.telefone_whatsapp ? formatarTelefone(paciente.telefone_whatsapp) : ""}
            className={campo}
          />
        </label>
        <label className={rotulo}>
          E-mail <span className="font-normal text-stone-500">(necessário para Pix)</span>
          <input name="email" type="email" defaultValue={paciente?.email ?? ""} className={campo} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={rotulo}>
          CPF <span className="font-normal text-stone-500">(para recibos)</span>
          <input name="cpf" inputMode="numeric" defaultValue={paciente?.cpf ?? ""} className={campo} />
        </label>
        <label className={rotulo}>
          Data de nascimento
          <input
            name="data_nascimento"
            type="date"
            defaultValue={paciente?.data_nascimento ?? ""}
            className={campo}
          />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="aceita_whatsapp"
          defaultChecked={paciente?.aceita_whatsapp ?? false}
          className="mt-1"
        />
        <span>
          O paciente autorizou receber lembretes e cobranças pelo WhatsApp.
          <span className="block text-stone-500">
            Exigido pela LGPD: só marque com o consentimento do paciente.
          </span>
        </span>
      </label>
      <button disabled={pendente} className={botaoPrimario}>
        {pendente ? "Salvando..." : paciente ? "Salvar alterações" : "Cadastrar paciente"}
      </button>
      <MensagemForm estado={estado} sucesso="Paciente salvo." />
    </form>
  );
}
