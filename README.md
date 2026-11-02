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
  proxy.ts                 renova a sessão do Supabase a cada requisição
  app/
    (app)/                 área logada
      agenda/              agenda, nova consulta, cobrar via Pix
      consultas/[id]/      remarcar, excluir, cancelar série
      pacientes/           lista com busca, novo, importar CSV, [id] (detalhe, editar, diagnóstico)
      evolucoes/           nova (ditado → IA) e [id] (revisar, travar, imprimir)
      financeiro/          cobranças do mês, marcar como paga, relatório CSV
      assinatura/          plano da plataforma (Mercado Pago)
      perfil/              dados, chave Pix, exportação de dados
      acoes*.ts            server actions
    recibos/[id]/          recibo para imprimir/PDF
    termos/, privacidade/  documentos legais (modelos)
    api/
      cron/lembretes       lembretes das próximas 24h
      evolucoes, diagnostico, cobrancas
      exportar/            dados (CSV) e carnê-leão
      webhooks/            whatsapp, evolution, mercadopago (assinaturas)
  lib/
    dominio/               regras puras e testadas (pix, csv, intencao, assinatura, formatacao) + lembretes, respostas, cobrancas
    ia/                    camada de IA (Gemini ou Claude), evolução e diagnóstico
    mensageria/            WhatsApp (console, evolution, meta)
    pagamentos/            Mercado Pago (assinaturas)
    servidor.ts            sessão, modo somente leitura, log de acesso, limite de IA
supabase/migrations/       schema, RLS e travas (assinatura, evolução revisada)
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
| `aviso_profissional` | Olá, {{1}}! Mensagem de {{2}} que não foi respondida automaticamente: {{3}} |

Webhook na Meta: `<APP_URL>/api/webhooks/whatsapp` com o `META_WEBHOOK_VERIFY_TOKEN`.

> A Evolution API (modo QR Code) é não oficial: use só para protótipo e com volume baixo.

## Dinheiro: dois fluxos separados

| Fluxo | Quem paga → quem recebe | Como |
|---|---|---|
| **Assinatura da plataforma** | Profissional → dono do SaaS | Mercado Pago Assinaturas (`/assinatura`), 14 dias de teste. Sem assinatura válida o app fica **somente leitura** (dados sempre acessíveis e exportáveis). |
| **Cobrança das sessões** | Paciente → profissional | Pix "copia e cola" gerado com a **chave Pix do próprio profissional** (cadastrada no Perfil). A plataforma não intermedeia; o profissional confirma o pagamento em **Financeiro** e emite o recibo. |

Webhook do Mercado Pago (só assinaturas): cadastre `<APP_URL>/api/webhooks/mercadopago` para o evento **Planos e assinaturas** e copie a assinatura secreta para `MERCADOPAGO_WEBHOOK_SECRET`.

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

## Testes

```bash
npm test        # regras puras: fuso horário, telefone, valores por extenso, Pix, respostas do WhatsApp, CSV, assinatura
npm run typecheck
```

A CI (`.github/workflows/ci.yml`) roda tipagem, testes e build a cada push.

## Pendências

Veja [PENDENCIAS.md](PENDENCIAS.md).
