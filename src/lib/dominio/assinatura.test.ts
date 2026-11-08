import { test } from "node:test";
import assert from "node:assert/strict";
import { assinaturaAntiga, diasRestantesTeste, podeEscrever, statusDaAssinaturaMercadoPago, statusPelaCobrancaMensal } from "./assinatura.ts";

const agora = new Date("2026-11-02T12:00:00Z");

test("teste dentro do prazo e assinatura ativa podem gravar", () => {
  assert.equal(podeEscrever({ assinatura_status: "teste", teste_ate: "2026-11-10T00:00:00Z" }, agora), true);
  assert.equal(podeEscrever({ assinatura_status: "ativa", teste_ate: "2020-01-01T00:00:00Z" }, agora), true);
});

test("teste vencido, inadimplente ou cancelada ficam somente leitura", () => {
  assert.equal(podeEscrever({ assinatura_status: "teste", teste_ate: "2026-11-01T00:00:00Z" }, agora), false);
  assert.equal(podeEscrever({ assinatura_status: "inadimplente", teste_ate: "2030-01-01T00:00:00Z" }, agora), false);
  assert.equal(podeEscrever({ assinatura_status: "cancelada", teste_ate: "2030-01-01T00:00:00Z" }, agora), false);
});

test("conta os dias restantes de teste", () => {
  assert.equal(diasRestantesTeste({ assinatura_status: "teste", teste_ate: "2026-11-16T12:00:00Z" }, agora), 14);
  assert.equal(diasRestantesTeste({ assinatura_status: "teste", teste_ate: "2026-10-01T00:00:00Z" }, agora), 0);
});

test("traduz o status do Mercado Pago", () => {
  assert.equal(statusDaAssinaturaMercadoPago("authorized"), "ativa");
  assert.equal(statusDaAssinaturaMercadoPago("paused"), "inadimplente");
  assert.equal(statusDaAssinaturaMercadoPago("cancelled"), "cancelada");
  assert.equal(statusDaAssinaturaMercadoPago("pending"), null);
});

test("cobrança mensal: aprovada reativa e recusada só conta depois das novas tentativas", () => {
  assert.equal(statusPelaCobrancaMensal("processed", "approved"), "ativa");
  assert.equal(statusPelaCobrancaMensal("processed", "rejected"), "inadimplente");
  assert.equal(statusPelaCobrancaMensal("recycling", "rejected"), null);
  assert.equal(statusPelaCobrancaMensal("scheduled", undefined), null);
});

test("aviso de assinatura antiga não derruba a assinatura ativa", () => {
  const ativa = { assinatura_status: "ativa", mp_assinatura_id: "nova" } as const;
  assert.equal(assinaturaAntiga(ativa, "velha", "cancelada"), true);
  assert.equal(assinaturaAntiga(ativa, "velha", null), true);
  assert.equal(assinaturaAntiga(ativa, "nova", "cancelada"), false);
  assert.equal(assinaturaAntiga(ativa, "velha", "ativa"), false);
  assert.equal(assinaturaAntiga({ assinatura_status: "cancelada", mp_assinatura_id: "nova" }, "velha", "ativa"), false);
});
