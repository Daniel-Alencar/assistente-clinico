import { test } from "node:test";
import assert from "node:assert/strict";
import { dataParaIso, gerarCsv, lerCsv } from "./csv.ts";

test("lê CSV com ponto e vírgula, acentos no cabeçalho e aspas", () => {
  const linhas = lerCsv('﻿Nome;Telefone;E-mail\r\n"Souza; Ana";(11) 9999-0000;ana@x.com\r\n\r\nBruno;;\n');
  assert.deepEqual(linhas, [
    { nome: "Souza; Ana", telefone: "(11) 9999-0000", "e-mail": "ana@x.com" },
    { nome: "Bruno", telefone: "", "e-mail": "" },
  ]);
});

test("lê CSV com vírgula", () => {
  assert.deepEqual(lerCsv("nome,cpf\nAna,123"), [{ nome: "Ana", cpf: "123" }]);
});

test("gera CSV que volta igual na leitura", () => {
  const csv = gerarCsv(["nome", "obs"], [["Ana", 'disse "oi"; tudo bem'], ["Bia", null]]);
  assert.deepEqual(lerCsv(csv), [
    { nome: "Ana", obs: 'disse "oi"; tudo bem' },
    { nome: "Bia", obs: "" },
  ]);
});

test("converte datas brasileiras e rejeita datas impossíveis", () => {
  assert.equal(dataParaIso("12/03/1991"), "1991-03-12");
  assert.equal(dataParaIso("1/2/2000"), "2000-02-01");
  assert.equal(dataParaIso("1991-03-12"), "1991-03-12");
  assert.equal(dataParaIso("31/02/2000"), null);
  assert.equal(dataParaIso("ontem"), null);
});
