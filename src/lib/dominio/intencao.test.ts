import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretarResposta } from "./intencao.ts";

test("entende confirmações", () => {
  for (const t of ["Confirmar", "confirmo", "SIM", "ok", "1", "Vou sim"]) assert.equal(interpretarResposta(t), "confirmar", t);
});

test("entende cancelamentos", () => {
  for (const t of ["Cancelar", "não vou poder", "desmarcar", "2"]) assert.equal(interpretarResposta(t), "cancelar", t);
});

test("descadastro tem prioridade e nunca vira cancelamento", () => {
  for (const t of ["SAIR", "parar", "Pare de mandar", "stop", "não quero mais receber"]) {
    assert.equal(interpretarResposta(t), "descadastrar", t);
  }
});

test("o resto vai para o profissional", () => {
  assert.equal(interpretarResposta("Posso trocar para quinta?"), "desconhecida");
});
