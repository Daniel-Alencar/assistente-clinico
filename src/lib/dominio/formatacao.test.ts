import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularIdade,
  formatarTelefone,
  horarioLocalParaUtc,
  normalizarTelefone,
  reaisParaNumero,
  utcParaHorarioLocal,
  valorPorExtenso,
} from "./formatacao.ts";

test("converte horário local para UTC respeitando o fuso", () => {
  assert.equal(horarioLocalParaUtc("2026-11-05", "14:30", "America/Sao_Paulo")!.toISOString(), "2026-11-05T17:30:00.000Z");
  assert.equal(horarioLocalParaUtc("2026-11-05", "14:30", "America/Manaus")!.toISOString(), "2026-11-05T18:30:00.000Z");
  assert.equal(horarioLocalParaUtc("2026-11-05", "23:30", "America/Sao_Paulo")!.toISOString(), "2026-11-06T02:30:00.000Z");
  assert.equal(horarioLocalParaUtc("05/11/2026", "14:30", "America/Sao_Paulo"), null);
});

test("converte UTC de volta para data e hora locais", () => {
  assert.deepEqual(utcParaHorarioLocal("2026-11-06T02:30:00.000Z", "America/Sao_Paulo"), { data: "2026-11-05", hora: "23:30" });
});

test("normaliza e formata telefone", () => {
  assert.equal(normalizarTelefone("(11) 99999-8888"), "5511999998888");
  assert.equal(normalizarTelefone("+55 11 99999-8888"), "5511999998888");
  assert.equal(normalizarTelefone("999"), null);
  assert.equal(formatarTelefone("5511999998888"), "(11) 99999-8888");
});

test("lê valores em reais", () => {
  assert.equal(reaisParaNumero("150,00"), 150);
  assert.equal(reaisParaNumero("R$ 1.200,50"), 1200.5);
  assert.equal(reaisParaNumero("abc"), null);
});

test("calcula idade considerando o aniversário", () => {
  assert.equal(calcularIdade("1990-11-03", new Date(2026, 10, 2)), 35);
  assert.equal(calcularIdade("1990-11-02", new Date(2026, 10, 2)), 36);
});

test("escreve valores por extenso para recibos", () => {
  assert.equal(valorPorExtenso(1), "um real");
  assert.equal(valorPorExtenso(180), "cento e oitenta reais");
  assert.equal(valorPorExtenso(100), "cem reais");
  assert.equal(valorPorExtenso(1100), "mil e cem reais");
  assert.equal(valorPorExtenso(1234.5), "mil, duzentos e trinta e quatro reais e cinquenta centavos");
  assert.equal(valorPorExtenso(2050), "dois mil e cinquenta reais");
  assert.equal(valorPorExtenso(1_000_000), "um milhão de reais");
  assert.equal(valorPorExtenso(0.01), "um centavo");
});
