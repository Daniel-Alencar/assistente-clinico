# Prompt: implementar o "Assistente Clínico"

Você vai construir do zero um SaaS web chamado **Assistente Clínico**, para **psicólogos e médicos autônomos no Brasil**. Leia todo este documento antes de começar. Ao terminar, o projeto precisa compilar (`npm run build`) e passar na checagem de tipos (`tsc --noEmit`).

## 1. Problema e proposta

Profissionais autônomos de saúde perdem tempo com tarefas administrativas. As três dores validadas em entrevistas são:

1. **Faltas e cancelamentos de última hora**, que custam dinheiro.
2. **Escrever a evolução/prontuário** depois de cada sessão, muitas vezes à noite.
3. **Cobrar o paciente**, que é constrangedor e atrasa o recebimento.

O produto resolve as três num só lugar: **agenda com lembretes no WhatsApp**, **evolução da sessão gerada por IA a partir do ditado do profissional** e **cobrança via Pix**.

**Posicionamento:** os concorrentes (PsicoManager, iClinic, 2Get) cobram de R$ 89 a R$ 297 por mês e limitam WhatsApp e IA por créditos ou planos. O Assistente Clínico é um **plano único e barato, com tudo incluído**: sem créditos, com migração assistida e sem nunca bloquear o acesso do profissional aos próprios dados.

## 2. Stack obrigatória

| Camada | Tecnologia |
|---|---|
| App | Next.js 16 (App Router, Server Components, Server Actions) + React 19 + TypeScript estrito |
| Estilo | Tailwind CSS 4 (`@tailwindcss/postcss`, tema via `@theme` no CSS) |
| Banco / Auth | Supabase (Postgres + Row Level Security + login por link mágico no e-mail) com `@supabase/ssr` |
| IA | API da Anthropic (`@anthropic-ai/sdk`), modelo `claude-opus-5-5`, com saída estruturada validada por Zod |
| WhatsApp | Camada própria com três provedores intercambiáveis (ver seção 6) |
| Pagamentos | Mercado Pago (SDK `mercadopago`), Pix |
| Validação | Zod 4 |
| Hospedagem | Vercel (com Vercel Cron) |

Todo o código, os nomes de variáveis e funções e os textos da interface devem estar **em português do Brasil** (ex.: `criarConsulta`, `pacientes`, `formatarMoeda`). Não adicione bibliotecas de UI nem de ícones: use Tailwind e SVG inline.

## 3. Estrutura de pastas

```
src/
  app/
    page.tsx                    landing page pública
    login/page.tsx              login por link mágico
    auth/callback/route.ts      troca o code do link mágico pela sessão
    cadastro/page.tsx           onboarding do profissional (primeiro acesso)
    (app)/                      área autenticada
      layout.tsx                checa login e perfil; menu lateral
      navegacao.tsx             menu com item ativo (client)
      acoes.ts                  server actions: perfil, pacientes, consultas
      agenda/                   agenda + formulário de consulta + botão cobrar
      pacientes/                lista, novo, [id] (detalhe/edição)
      evolucoes/nova/           ditado -> evolução com IA
      perfil/                   edição do perfil
    api/
      evolucoes/route.ts        POST: gera evolução com IA
      cobrancas/route.ts        POST: cria Pix de uma consulta
      cron/lembretes/route.ts   GET: envia lembretes (Vercel Cron, de hora em hora)
      webhooks/whatsapp/        Meta Cloud API (GET verificação + POST mensagens)
      webhooks/evolution/       Evolution API (só protótipo)
      webhooks/mercadopago/     notificações de pagamento
  components/                   estilos compartilhados, logo, ícones, formulários comuns
  lib/
    env.ts                      exigirEnv(nome)
    supabase/                   servidor.ts (sessão do usuário), navegador.ts, admin.ts (service role)
    mensageria/                 tipos.ts, index.ts, console.ts, evolution.ts, meta-cloud.ts
    pagamentos/mercadopago.ts
    ia/evolucao.ts, ia/transcricao.ts
    dominio/                    lembretes.ts, respostas.ts, cobrancas.ts, formatacao.ts
supabase/migrations/0001_schema_inicial.sql
vercel.json                     cron "0 * * * *" em /api/cron/lembretes
.env.example
README.md
```

## 4. Banco de dados (Supabase / Postgres)

Crie uma migration SQL com estas tabelas (UUIDs com `gen_random_uuid()`, `timestamptz` com `default now()`):

- **profissionais**: `id` (PK, referencia `auth.users`, on delete cascade), `nome`, `profissao` (check: `psicologo`, `medico`, `outro`), `registro_conselho` (CRP/CRM), `telefone`, `valor_sessao_padrao numeric(10,2)`, `fuso_horario` (default `America/Sao_Paulo`), `criado_em`.
- **pacientes**: `id`, `profissional_id`, `nome`, `telefone_whatsapp` (E.164 sem "+", ex.: `5511999998888`), `email`, `cpf`, `data_nascimento`, `aceita_whatsapp boolean default false` (consentimento LGPD), `ativo boolean default true`, `criado_em`.
- **consultas**: `id`, `profissional_id`, `paciente_id`, `inicio timestamptz`, `duracao_min` (default 50), `modalidade` (`presencial`/`online`), `status` (enum `agendada`, `confirmada`, `cancelada`, `realizada`, `falta`), `valor`, `lembrete_enviado_em`, `criado_em`.
- **evolucoes**: `id`, `profissional_id`, `paciente_id`, `consulta_id` (nullable), `transcricao` (o ditado), `conteudo jsonb` (evolução estruturada), `revisada boolean default false`, `criado_em`, `atualizado_em`.
- **cobrancas**: `id`, `profissional_id`, `paciente_id`, `consulta_id`, `valor`, `status` (enum `pendente`, `paga`, `cancelada`, `expirada`, `estornada`), `mp_payment_id unique`, `pix_copia_e_cola`, `pix_qr_base64`, `pago_em`, `criado_em`.
- **mensagens** (log do WhatsApp): `id`, `profissional_id`, `paciente_id`, `direcao` (`saida`/`entrada`), `tipo`, `provedor`, `provedor_message_id`, `conteudo`, `criado_em`.

Crie índices nas chaves estrangeiras e em `consultas (inicio) where lembrete_enviado_em is null`.

**RLS:** habilite em todas as tabelas. Cada profissional só acessa as próprias linhas (`profissional_id = auth.uid()`, e `id = auth.uid()` em `profissionais`). A tabela `mensagens` é só leitura para o profissional. Webhooks e cron usam a **service role**, que ignora o RLS, e por isso filtram explicitamente.

## 5. Funcionalidades e fluxos

### 5.1 Autenticação e onboarding
- `/login`: o profissional informa o e-mail e recebe um link mágico (`signInWithOtp` com `emailRedirectTo` apontando para `/auth/callback`). Trate erros com try/catch: o botão nunca pode ficar travado em "Enviando...". Depois do envio, mostre a tela "Confira seu e-mail".
- `/auth/callback`: chama `exchangeCodeForSession` e redireciona para `/agenda`.
- O layout de `(app)` redireciona para `/login` sem sessão e para `/cadastro` se não houver linha em `profissionais`.
- `/cadastro` e `/perfil` usam o mesmo formulário: nome, profissão, CRP/CRM, WhatsApp, valor padrão da sessão e fuso horário (lista dos fusos brasileiros). Faz upsert em `profissionais`.

### 5.2 Pacientes
- Lista de ativos, com link para ver os inativos.
- Formulário de cadastro e edição: nome, WhatsApp (aceita qualquer formato e normaliza para E.164), e-mail (necessário para o Pix do Mercado Pago), CPF (11 dígitos), data de nascimento e a caixa "**O paciente autorizou receber lembretes e cobranças pelo WhatsApp**", com o aviso da LGPD. Exija WhatsApp se a caixa estiver marcada.
- A página de detalhe tem edição, botão desativar/reativar (nunca apagar), lista de evoluções (resumo e indicação de "rascunho não revisado") e as últimas consultas.

### 5.3 Agenda
- Formulário "Nova consulta": paciente, data, hora, duração (10 a 240 min), valor (opcional; se vazio, usa o valor padrão do perfil), modalidade e "**Repetir toda semana**" (não repetir, ou mais 4, 8 ou 12 semanas). A repetição cria várias linhas.
- **Fuso horário:** data e hora são digitadas no fuso do profissional e convertidas para UTC. Use `Intl.DateTimeFormat` com `timeZoneName: "longOffset"`, sem biblioteca de datas.
- **Conflito:** recuse o agendamento se qualquer ocorrência se sobrepuser a uma consulta `agendada` ou `confirmada`, e informe a data do conflito.
- A lista vai dos últimos 7 dias em diante, agrupada por dia no fuso do profissional, com "Hoje" em destaque. Cada linha tem hora, paciente, duração, modalidade, valor, um selo de status colorido e o estado da cobrança ("Pix enviado" ou "Pago ✓").
- Ações por status:
  - agendada → Confirmar, Realizada, Faltou, Cancelar
  - confirmada → Realizada, Faltou, Cancelar
  - realizada ou falta → Desfazer
  - cancelada → Reativar
- Para consulta realizada: link "**Registrar evolução**" (abre `/evolucoes/nova?paciente=..&consulta=..`).
- Para consulta realizada ou falta, sem cobrança pendente ou paga e com valor definido: botão "**Cobrar via Pix**", que chama `/api/cobrancas` e atualiza a tela.

### 5.4 Evolução com IA
- O profissional **dita um resumo** da sessão usando o microfone do teclado do celular, ou seja, texto e não áudio. **Não grave a sessão.** Deixe `lib/ia/transcricao.ts` como ponto de extensão futuro, lançando "não implementado".
- `POST /api/evolucoes` recebe `{ pacienteId, consultaId?, transcricao }`, validado por Zod (o ditado precisa ter de 20 a 20.000 caracteres), e o usuário precisa estar autenticado.
- Chame a API da Anthropic com `client.beta.messages.parse`:
  - `model: "claude-opus-5-5"`, `max_tokens: 16000`
  - `output_config: { effort: "medium", format: betaZodOutputFormat(EvolucaoSchema) }` (helper em `@anthropic-ai/sdk/helpers/beta/zod`)
  - recuo do servidor caso o modelo recuse: `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`
  - verifique `stop_reason === "refusal"` antes de ler `parsed_output` e devolva 422 com explicação nesse caso
- Esquema da evolução: `resumo`, `temas_abordados[]`, `intervencoes[]`, `observacoes_clinicas`, `plano_proxima_sessao`, `alertas[]` (riscos mencionados, como ideação suicida) e `pontos_a_confirmar[]` (trechos ambíguos).
- O prompt de sistema, em português, deve garantir que a IA **use apenas o que está no ditado**, não invente nem sugira diagnósticos, registre ambiguidades em `pontos_a_confirmar` e coloque qualquer menção a risco em `alertas`.
- Salve como `revisada = false`. A tela mostra os alertas em vermelho no topo e os demais campos em seções.

### 5.5 WhatsApp (lembretes e respostas)
- **Cron** (`GET /api/cron/lembretes`, protegido por `Authorization: Bearer CRON_SECRET`): busca consultas `agendada` nas próximas 24h sem `lembrete_enviado_em`, de pacientes com `aceita_whatsapp`. Envia o template `lembrete_consulta` com os parâmetros nome, profissional, dia e hora. Marca `lembrete_enviado_em`, registra em `mensagens` e é idempotente.
- **Respostas** (webhooks): localiza o paciente pelo telefone e a próxima consulta `agendada`. Interpreta o texto sem acento e em minúsculas: "confirm…", "sim", "ok" ou "1" confirmam; "cancel…", "não", "desmarc…" ou "2" cancelam. Atualiza o status, registra a mensagem e responde em texto livre (dentro da janela de 24h, sem custo de template).

### 5.6 Cobrança Pix (Mercado Pago)
- `cobrarConsulta`: valor = valor da consulta ou valor padrão do perfil. Exige e-mail do paciente. Cria a linha em `cobrancas`, depois cria o pagamento Pix com `external_reference = cobranca.id`, idempotency key, expiração de 72h e `notification_url`. Salva o copia e cola e o QR e envia ao paciente o template `cobranca_sessao`.
- Webhook do Mercado Pago: **valida a assinatura** do header `x-signature` (`ts=...,v1=...`) com HMAC-SHA256 do manifesto `id:{data.id};request-id:{x-request-id};ts:{ts};`, usando `timingSafeEqual`. Busca o pagamento na API, mapeia o status (approved → paga, cancelled → cancelada, expired → expirada, refunded/charged_back → estornada) e atualiza a cobrança sem reprocessar status repetido. Quando a cobrança é paga, envia o template `pagamento_recebido`.

## 6. Camada de mensageria (requisito de arquitetura)

A regra de negócio **nunca** conhece o provedor. Ela só chama `obterProvedorWhatsApp()`, que escolhe a implementação pela variável `WHATSAPP_PROVIDER`:

```ts
interface ProvedorWhatsApp {
  readonly nome: string;
  enviarTexto(telefone: string, texto: string): Promise<ResultadoEnvio>;
  enviarTemplate(mensagem: MensagemTemplate): Promise<ResultadoEnvio>;
}
// MensagemTemplate = { telefone, template, idioma?, parametros: string[], textoAlternativo }
```

- `console`: só registra no log (desenvolvimento).
- `evolution`: Evolution API (`POST {url}/message/sendText/{instancia}`, header `apikey`). É **não oficial**, só para protótipo: usa `textoAlternativo` porque não tem templates. O webhook dela é autenticado por `?token=`.
- `meta`: WhatsApp Cloud API oficial (`POST https://graph.facebook.com/{versao}/{phone_number_id}/messages`), com templates aprovados. O webhook faz o handshake `hub.verify_token` e valida `X-Hub-Signature-256`.

Mensagens recebidas são normalizadas para `{ telefone, texto, idMensagem }` antes de chegar à regra de negócio.

## 7. Design da interface

- Cor da marca verde-petróleo (`#0f766e`, escura `#115e59`, clara `#ccfbf1`, fundo `#f0fdfa`), fonte **Plus Jakarta Sans** via `next/font/google`, fundo `stone-50`.
- Logo em SVG: quadrado arredondado com um traço de batimento cardíaco.
- **Landing:** cabeçalho, hero ("Seu consultório no piloto automático."), CTA "Começar grátis", uma prévia ilustrada do app (agenda do dia com selos de status, um card "Evolução gerada" e um selo flutuante "Ana confirmou pelo WhatsApp"), três cards de recursos, um bloco "Um plano. Tudo incluído." e rodapé com menção à LGPD.
- **Login:** duas colunas no desktop (painel da marca com vantagens + formulário) e só o formulário no celular.
- **Área logada:** menu lateral fixo com ícones e item ativo destacado; no celular, menu horizontal no topo. Cards com `rounded-2xl`, borda e sombra suave; foco visível nos campos (`ring` da cor da marca). Responsivo até 390px de largura.

## 8. Segurança, LGPD e qualidade

- Dados de saúde são **dados sensíveis**. Use RLS sempre; a service role só aparece em webhooks e cron (`import "server-only"`).
- Nunca envie WhatsApp sem `aceita_whatsapp = true`.
- Toda entrada do usuário é validada no servidor. Valores em reais aceitam `150,00`, `150.5` e `R$ 1.200,00`.
- Use `Cache-Control: no-store` nas páginas autenticadas.
- Todas as variáveis ficam em `.env.example`: `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, as do Supabase (URL, chave publishable e chave secret), `ANTHROPIC_API_KEY`, `WHATSAPP_PROVIDER`, as da Meta (token, phone number id, app secret, verify token, versão), as da Evolution (url, chave, instância) e as do Mercado Pago (access token, segredo do webhook).
- O README deve explicar como rodar o projeto, os templates da Meta a aprovar (`lembrete_consulta`, `cobranca_sessao`, `pagamento_recebido`), o webhook do Mercado Pago, os cuidados com a LGPD e o roadmap.

## 9. Critérios de aceite

1. `npm run build` e `tsc --noEmit` sem erros.
2. Sem `.env.local`, a landing e o login abrem, e o login mostra erro amigável em vez de travar.
3. Com o Supabase configurado: login → cadastro → paciente → consulta semanal → marcar como realizada → registrar evolução → cobrar via Pix funciona ponta a ponta com `WHATSAPP_PROVIDER=console`.
4. Agendar em horário sobreposto é recusado com mensagem clara.
5. Um profissional nunca vê dados de outro (teste com duas contas).

## 10. Fora do escopo (roadmap)

Editar e marcar a evolução como revisada, recibo em PDF e exportação para o carnê-leão, assinatura do próprio SaaS, transcrição de áudio e app mobile nativo.
