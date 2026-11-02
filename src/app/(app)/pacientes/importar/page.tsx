import Link from "next/link";
import { cartao } from "@/components/estilos";
import { CabecalhoPagina } from "@/components/ui";
import { FormularioImportacao } from "./formulario";

const MODELO =
  "﻿nome;telefone;email;cpf;data_nascimento\r\nAna Souza;(11) 99999-0000;ana@email.com;123.456.789-09;12/03/1991\r\n";

export default function ImportarPacientes() {
  return (
    <>
      <CabecalhoPagina
        titulo="Importar pacientes"
        descricao="Traga sua lista de outra ferramenta ou planilha em poucos segundos."
        antes={
          <Link href="/pacientes" className="text-sm text-stone-500 hover:text-marca">
            ← Pacientes
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${cartao} p-6 lg:col-span-2`}>
          <FormularioImportacao />
        </div>
        <aside className={`${cartao} p-5 text-sm text-stone-600`}>
          <h2 className="font-semibold text-stone-900">Formato da planilha</h2>
          <p className="mt-2">
            Arquivo CSV (no Excel ou Google Planilhas: <em>Salvar como CSV</em>) com cabeçalho na primeira linha. Só a coluna{" "}
            <strong>nome</strong> é obrigatória.
          </p>
          <p className="mt-2">
            Colunas aceitas: <code>nome</code>, <code>telefone</code>, <code>email</code>, <code>cpf</code>,{" "}
            <code>data_nascimento</code> (dd/mm/aaaa).
          </p>
          <p className="mt-2">
            Por segurança (LGPD), os lembretes de WhatsApp começam desligados: ative em cada paciente após colher o
            consentimento.
          </p>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(MODELO)}`}
            download="modelo-pacientes.csv"
            className="mt-4 inline-block font-medium text-marca hover:underline"
          >
            Baixar planilha modelo
          </a>
        </aside>
      </div>
    </>
  );
}
