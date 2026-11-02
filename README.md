# Assistente Clínico

SaaS para psicólogos e médicos autônomos: **agenda com lembretes no WhatsApp**, **evolução da sessão gerada por IA a partir do ditado do profissional** e **cobrança via Pix (Mercado Pago)**.

## Stack

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router) + React 19 + Tailwind 4 |
| Banco / Auth | Supabase (Postgres + RLS + login por link mágico), região São Paulo |
| IA | Camada com 2 provedores via `IA_PROVIDER`: Claude (`claude-opus-5-5`) ou Gemini (`gemini-3.5-flash`, com modelos reserva), ambos com saída estruturada validada por Zod |
| WhatsApp | Camada própria com 3 provedores: `console` (dev), `evolution` (protótipo), `meta` (produção) |
| Pagamentos | Mercado Pago (Pix) |
| Hospedagem | Vercel (inclui o cron de lembretes) |

## Estrutura

```
src/
  app/
    (app)/                 telas autenticadas: agenda, pacientes, nova evolução
    api/
      cron/lembretes       envia lembretes das próximas 24h (de hora em hora)
      evolucoes            ditado -> evolução estruturada (IA)
      cobrancas            cria Pix de uma consulta e envia ao paciente
      webhooks/whatsapp    Meta Cloud API: confirmações/cancelamentos
      webhooks/evolution   Evolution API (apenas protótipo)
      webhooks/mercadopago confirmação de pagamento
    auth/callback          retorno do link mágico
    login/
  lib/
    mensageria/            interface ProvedorWhatsApp + implementações
    pagamentos/            Mercado Pago (Pix + validação de webhook)
    ia/                    geração de evolução (Claude) e transcrição (futuro)
    dominio/               regras de negócio: lembretes, respostas, cobranças
    supabase/              clientes servidor / navegador / admin
supabase/migrations/       schema do banco com RLS
```

Regra de ouro: **regra de negócio só fala com `obterProvedorWhatsApp()`**, nunca com um provedor específico. Trocar Evolution por Meta é só mudar `WHATSAPP_PROVIDER`.

## Como rodar

1. Instale o Node.js 22+ (recomendado via [nvm](https://github.com/nvm-sh/nvm)): `nvm install 22`
2. `npm install`
3. Crie um projeto no [Supabase](https://supabase.com) (região São Paulo) e rode `supabase/migrations/0001_schema_inicial.sql` no SQL Editor
4. `cp .env.example .env.local` e preencha as chaves
5. `npm run dev` e acesse http://localhost:3000

Com `WHATSAPP_PROVIDER=console`, as mensagens aparecem só no terminal, sem precisar configurar WhatsApp.

## WhatsApp

**Templates a aprovar na Meta** (categoria *Utilidade*, idioma pt_BR):

| Nome | Corpo sugerido |
|---|---|
| `lembrete_consulta` | Olá, {{1}}! Lembrete da sua consulta com {{2}} {{3}} às {{4}}. Botões: *Confirmar* / *Cancelar* |
| `cobranca_sessao` | Olá, {{1}}! Segue o Pix da sessão ({{2}}). Copia e cola: {{3}} |
| `pagamento_recebido` | Pagamento de {{2}} recebido. Obrigado, {{1}}! |

Webhook na Meta: `<APP_URL>/api/webhooks/whatsapp` com o `META_WEBHOOK_VERIFY_TOKEN`.

> A Evolution API (modo QR Code) é não oficial: use só para protótipo e com volume baixo.

## Mercado Pago

Em *Suas integrações > Webhooks*, cadastre `<APP_URL>/api/webhooks/mercadopago` para o evento **Pagamentos** e copie a assinatura secreta para `MERCADOPAGO_WEBHOOK_SECRET`.

## LGPD e cuidados clínicos

- Dados de saúde são **dados sensíveis**: RLS isola cada profissional; a service role só é usada em webhooks/cron.
- WhatsApp só é enviado para pacientes com `aceita_whatsapp = true` (consentimento registrado).
- **Camada gratuita do Gemini só com dados fictícios:** nela o Google pode usar o conteúdo enviado para treinar modelos. Com pacientes reais, use camada paga (Gemini pago ou Anthropic).
- A IA recebe **o ditado do profissional, não a gravação da sessão**, e é instruída a não inventar informações.
- Toda evolução nasce com `revisada = false`: só vale como prontuário depois da revisão do profissional.
- Antes de vender: termos de uso, política de privacidade, contrato de operador de dados (DPA) com os profissionais e revisão dos termos de retenção de dados dos provedores (Supabase, Anthropic, Meta, Mercado Pago).

## Apoio ao diagnóstico

Na página do paciente, **Apoio ao diagnóstico** abre um agente de IA: o profissional descreve o caso e recebe hipóteses (CID-11 / DSM-5-TR) com critérios presentes e a investigar, diferenciais a excluir, alertas de risco, perguntas e instrumentos sugeridos. Respondendo às perguntas, a análise é refinada. A conversa fica salva em `analises_diagnosticas`.

- A IA recebe idade e (opcionalmente) as últimas evoluções, **nunca nome ou documentos**.
- **Antes de comercializar:** verificar com especialista se o recurso se enquadra como software dispositivo médico (ANVISA, RDC 657/2022).

## Roadmap do MVP

1. [x] Estrutura, schema, camada de mensageria, IA e Pix
2. [x] Cadastro do profissional, pacientes e consultas (com repetição semanal e checagem de conflito)
3. [ ] Salvar/editar evolução revisada e histórico por paciente
4. [ ] Tela de cobranças e botão "Cobrar sessão"
5. [ ] Recibo em PDF / exportação para carnê-leão
6. [ ] Onboarding do profissional e assinatura do SaaS (Mercado Pago assinaturas)
