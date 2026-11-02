// CSV simples (RFC 4180) para importar e exportar planilhas. Puro e testável.

/** Lê CSV com cabeçalho. Detecta ";" ou "," pelo cabeçalho; aceita campos entre aspas. */
export function lerCsv(texto: string): Record<string, string>[] {
  const conteudo = texto.replace(/^﻿/, "");
  const primeiraLinha = conteudo.split(/\r?\n/, 1)[0] ?? "";
  const separador = (primeiraLinha.match(/;/g)?.length ?? 0) > (primeiraLinha.match(/,/g)?.length ?? 0) ? ";" : ",";

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (aspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && conteudo[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }

  const [cabecalho, ...dados] = linhas.filter((l) => l.some((v) => v.trim()));
  if (!cabecalho) return [];
  const chaves = cabecalho.map((c) =>
    c.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, "_"),
  );
  return dados.map((valores) => Object.fromEntries(chaves.map((k, i) => [k, (valores[i] ?? "").trim()])));
}

/** Gera CSV com ";" (abre direto no Excel em português) e BOM para manter acentos. */
export function gerarCsv(colunas: string[], linhas: (string | number | null | undefined)[][]): string {
  const escapar = (v: string | number | null | undefined) => {
    const t = v == null ? "" : String(v);
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + [colunas, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n");
}

/** "31/12/1990" | "1990-12-31" -> "1990-12-31"; inválida -> null. */
export function dataParaIso(texto: string): string | null {
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = br ? `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}` : texto;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}
