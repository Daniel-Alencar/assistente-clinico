import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16, gerarPixCopiaECola, normalizarChavePix, tipoDaChave } from "./pix.ts";

test("CRC16-CCITT bate com o vetor de teste padrão", () => {
  assert.equal(crc16("123456789"), "29B1");
});

test("gera BR Code com valor e CRC válido", () => {
  const codigo = gerarPixCopiaECola({
    chave: "+5511999998888",
    nomeRecebedor: "João da Silva",
    valorCentavos: 4250,
  });
  assert.ok(codigo.startsWith("000201"));
  assert.ok(codigo.includes("0014br.gov.bcb.pix0114+5511999998888"));
  assert.ok(codigo.includes("540542.50"));
  assert.ok(codigo.includes("5913Joao da Silva"));
  assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)));
});

test("normaliza chaves Pix", () => {
  assert.equal(normalizarChavePix("cpf_cnpj", "123.456.789-09"), "12345678909");
  assert.equal(normalizarChavePix("celular", "(11) 99999-8888"), "+5511999998888");
  assert.equal(normalizarChavePix("email", " Ana@Email.com "), "ana@email.com");
  assert.equal(normalizarChavePix("celular", "123"), null);
});

test("deduz o tipo da chave normalizada", () => {
  assert.equal(tipoDaChave("+5511999998888"), "celular");
  assert.equal(tipoDaChave("12345678901"), "cpf_cnpj");
  assert.equal(tipoDaChave("ana@exemplo.com"), "email");
  assert.equal(tipoDaChave("123e4567-e12b-12d1-a456-426655440000"), "aleatoria");
});
