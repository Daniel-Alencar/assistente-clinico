# Pendências do Assistente Clínico

Atualizado em 02/11/2026. Marque `[x]` conforme for concluindo.

## Como o dinheiro circula

| Fluxo | Quem paga → quem recebe | Como funciona no app |
|---|---|---|
| **Assinatura da plataforma** | Profissional → **você** | Mercado Pago Assinaturas, com 14 dias de teste. Sem assinatura válida, o app fica **somente leitura**. |
| **Cobrança das sessões** | Paciente → **profissional** | Pix gerado com a **chave Pix do profissional**. O dinheiro cai direto na conta dele, e ele confirma o pagamento em Financeiro. |

---

## ✅ O que já foi feito no código

| # | Item | O que existe |
|---|---|---|
| 1 | Sessão | Botão **Sair** e `src/proxy.ts`, que renova o login automaticamente |
| 3 | Revisão da evolução | Página `/evolucoes/[id]`: editar campos, salvar rascunho, **marcar como revisada** (trava no banco: não altera nem exclui), excluir rascunho, imprimir/PDF, ditado original ao lado |
| 4 | Consultas | `/consultas/[id]`: **remarcar** (com checagem de conflito e reenvio do lembrete), excluir as agendadas por engano, **cancelar a série** semanal |
| 5 | Custo da IA | Limite diário por profissional (`LIMITE_IA_DIARIO`, padrão 40) |
| 6 | Erros | Páginas 404 e de erro com a identidade visual |
| 7 | Documentos legais | `/termos` e `/privacidade` (**modelos**), links no login e **aceite obrigatório no cadastro**, com data e versão |
| 8 | Pix na conta do profissional | Chave Pix e CPF no Perfil, Pix "copia e cola" com o valor gerado com a chave dele |
| 9 | Financeiro | `/financeiro`: cobranças do mês, totais, marcar como paga (Pix, dinheiro, cartão, transferência), reenviar, copiar Pix, cancelar |
| 10 | Recibos | Recibo com valor por extenso para imprimir ou salvar em PDF, e relatório mensal em CSV para o carnê-leão e o Receita Saúde |
| 11 | WhatsApp (código) | Paciente responde **SAIR** e é descadastrado; mensagens não reconhecidas vão para o WhatsApp do profissional e aparecem na agenda; consentimento registrado com data e origem; contas sem assinatura não enviam lembretes |
| 12 | Assinatura do SaaS | `/assinatura`: plano, período de teste, checkout do Mercado Pago, cancelamento, webhook e **modo somente leitura** (nunca bloqueia o acesso aos dados) |
| 13 | Portabilidade | Exportação em CSV de pacientes, consultas, evoluções, cobranças e análises (Perfil), e **importação de pacientes por planilha** |
| 14 | LGPD (código) | **Log de acesso a prontuário** (ver, criar, editar, revisar, excluir, exportar); dados nunca são apagados por inadimplência |
| 15 | Qualidade | **22 testes automatizados** (`npm test`) e CI no GitHub Actions (tipagem, testes, build) |

Validação feita em 02/11/2026: build de produção, as 19 telas abertas sem erro e 13 regras conferidas no banco real (travas, Pix, exportações, log e modo somente leitura).

---

## 🙋 Suas tarefas: contas, pagamentos e advogado

### Antes do piloto com um profissional real
- [ ] **SMTP próprio no Supabase** (Resend, Brevo ou Amazon SES), com domínio verificado. Sem isso, **só você recebe o e-mail de login**: o SMTP padrão só envia para a equipe do projeto. Depois, descomente o template em `supabase/config.toml` (e-mail em português já pronto em `supabase/templates/link-magico.html`) e rode `npx supabase config push`.
- [ ] **IA paga:** trocar o Gemini gratuito pela camada paga (ou Anthropic) antes de dados reais, e **gerar uma chave nova do Gemini**, porque a atual apareceu numa conversa.
- [ ] **Deploy na Vercel:** variáveis de ambiente, domínio, e `site_url`/`additional_redirect_urls` do Supabase com o domínio de produção (`supabase/config.toml` + `npx supabase config push`).
- [ ] **Cron dos lembretes:** o plano gratuito da Vercel roda cron só 1 vez por dia. Use Vercel Pro, `pg_cron` no Supabase ou cron-job.org chamando `/api/cron/lembretes` com `Authorization: Bearer CRON_SECRET`.
- [ ] **Backups:** plano Pro do Supabase (o gratuito não tem backup diário).
- [ ] **Advogado:** revisar `/termos` e `/privacidade`. Ao mudar o texto, atualize `VERSAO_TERMOS` em `src/lib/dominio/termos.ts`.

### Antes de cobrar dos clientes
- [ ] **Mercado Pago (assinatura):** criar a aplicação, preencher `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` e `NEXT_PUBLIC_PRECO_MENSAL`, cadastrar o webhook "Planos e assinaturas" e **testar uma assinatura de ponta a ponta** com usuário de teste.
- [ ] **WhatsApp oficial:** conta Meta Business verificada (exige CNPJ), número dedicado e aprovação dos 4 templates (`lembrete_consulta`, `cobranca_sessao`, `pagamento_recebido`, `aviso_profissional`; textos no README). Depois, testar com número real.
- [ ] **LGPD:** contrato de operador (DPA) com os profissionais, lista de suboperadores e Relatório de Impacto (RIPD).
- [ ] **ANVISA:** validar se o apoio ao diagnóstico se enquadra como software dispositivo médico (RDC 657/2022).
- [ ] **Médicos:** prontuário eletrônico sem papel exige certificação SBIS/CFM e assinatura ICP-Brasil (Res. CFM 1.821/2007). Recomendação: começar só com psicólogos.

---

## 🧑‍💻 O que ainda falta de código

- [ ] Enviar o recibo ao paciente por WhatsApp ou e-mail (hoje o profissional imprime ou salva em PDF e envia).
- [ ] Monitoramento de erros (Sentry ou similar). Precisa criar a conta.
- [ ] Testes ponta a ponta com Playwright (login → paciente → consulta → evolução → cobrança).
- [ ] Gerar os tipos do banco (`npx supabase gen types --linked`) para tirar os `as unknown as` do código.
- [ ] (Opcional) Confirmação automática do Pix das sessões: cada profissional conectaria a própria conta Mercado Pago via OAuth. Só vale se os usuários pedirem; hoje a confirmação é manual.

### Melhorias depois do lançamento
- [ ] Calendário semanal visual (hoje a agenda é uma lista por dia).
- [ ] Link de teleconsulta (Meet ou Jitsi) nas consultas online, enviado no lembrete.
- [ ] Antecedência do lembrete configurável (24h, 2h, ambos).
- [ ] Resumo diário para o profissional pelo WhatsApp.
- [ ] PWA instalável no celular.
- [ ] Transcrição de áudio (`src/lib/ia/transcricao.ts` está preparado).
- [ ] Modelos de evolução por abordagem (TCC, psicanálise, sistêmica).
- [ ] Painel de indicadores (taxa de faltas, receita, pacientes ativos).
- [ ] Modo clínica (vários profissionais, secretária com acesso só à agenda).
- [ ] Revisão de acessibilidade.

---

**Fora do código, em paralelo:** o critério continua sendo **3 profissionais pagando em 30 dias**, mesmo que um valor simbólico de fundador.
