import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarTokenRecibo, validarTokenRecibo, VALIDADE_LINK_RECIBO_DIAS } from "./link-recibo.ts";

const ID = "3f2b8c1e-7a54-4d10-9c3e-1a2b3c4d5e6f";
const AGORA = Date.UTC(2026, 10, 8);

test("token válido devolve o id da cobrança", () => {
  assert.equal(validarTokenRecibo(gerarTokenRecibo(ID, "segredo", AGORA), "segredo", AGORA), ID);
});

test("token expira depois do prazo", () => {
  const token = gerarTokenRecibo(ID, "segredo", AGORA);
  const depois = AGORA + (VALIDADE_LINK_RECIBO_DIAS + 1) * 86_400_000;
  assert.equal(validarTokenRecibo(token, "segredo", depois), null);
});

test("token recusa segredo errado, id trocado e prazo alterado", () => {
  const token = gerarTokenRecibo(ID, "segredo", AGORA);
  const [id, expira, assinatura] = token.split(".");
  assert.equal(validarTokenRecibo(token, "outro", AGORA), null);
  assert.equal(validarTokenRecibo(`${id.replace("3f", "4f")}.${expira}.${assinatura}`, "segredo", AGORA), null);
  assert.equal(validarTokenRecibo(`${id}.${Number(expira) + 86_400}.${assinatura}`, "segredo", AGORA), null);
});

test("token malformado é recusado", () => {
  assert.equal(validarTokenRecibo("", "segredo", AGORA), null);
  assert.equal(validarTokenRecibo("a.b", "segredo", AGORA), null);
  assert.equal(validarTokenRecibo("a.b.c.d", "segredo", AGORA), null);
});
