# Mercado Pago (assinatura da plataforma): passo a passo

Como colocar a assinatura mensal em funcionamento. É o fluxo em que o **profissional paga o Assistente Clínico**; a cobrança das sessões (paciente paga o profissional) usa a chave Pix dele e não passa por aqui.

Levantado em 08/11/2026. O painel do Mercado Pago muda de nome e lugar com frequência.

## O que ter em mãos

- [ ] Conta Mercado Pago que vai receber as assinaturas.
- [ ] App publicado com HTTPS, com `NEXT_PUBLIC_APP_URL` apontando para o domínio. O teste não funciona em `localhost`: o Mercado Pago recusa esse endereço de retorno (`Invalid value for back_url`) e precisa alcançar o webhook.

## 1. Criar a aplicação

- [ ] Em mercadopago.com.br/developers, abra **Suas integrações → Criar aplicação**.
- [ ] Escolha o produto **Assinaturas**.

## 2. Criar as contas de teste

- [ ] Em **Contas de teste**, confira se há uma conta **Vendedor** e uma **Comprador**, ambas do Brasil.
- [ ] Copie o usuário, a senha e o código de verificação do comprador. O painel mostra o usuário (`TESTUSER...`), não o e-mail.
- [ ] Numa janela anônima, entre no Mercado Pago como comprador e copie o **e-mail** nos dados da conta. Se não aparecer, o formato é `test_user_<número do usuário>@testuser.com`, usando os dígitos do `TESTUSER...` (não o User ID).

## 3. Configurar as variáveis na Vercel (modo teste)

```
MERCADOPAGO_ACCESS_TOKEN=<Access Token das credenciais de teste>
MERCADOPAGO_WEBHOOK_SECRET=<assinatura secreta do passo 4>
NEXT_PUBLIC_PRECO_MENSAL=49
```

O preço vai para o código no build: **depois de mudar, faça um redeploy**.

## 4. Cadastrar o webhook

- [ ] Em **Suas integrações → sua aplicação → Webhooks**, use a URL `https://seudominio/api/webhooks/mercadopago`, nos modos teste e produção.
- [ ] Marque os eventos de **assinatura** e de **pagamento recorrente** (`subscription_preapproval` e `subscription_authorized_payment`).
- [ ] Salve, copie a **assinatura secreta** para `MERCADOPAGO_WEBHOOK_SECRET` e faça o redeploy.
- [ ] Use **Simular notificação**. A resposta esperada é `200`.

## 5. Testar de ponta a ponta

O app envia ao Mercado Pago o **e-mail de login** do profissional, então a conta do app precisa usar o e-mail do comprador de teste. Esse endereço não recebe mensagens, por isso crie o usuário direto no Supabase.

1. No Supabase, em **Authentication → Users → Add user**, crie o usuário com o e-mail do comprador de teste, uma senha e **Auto Confirm User** marcado.
2. Entre no app com esse usuário, complete o cadastro e abra **Assinatura**.
3. Clique em **Assinar com Mercado Pago** e faça login como comprador de teste, numa janela anônima.
4. Pague com o cartão de teste abaixo.

| Campo | Valor |
|---|---|
| Cartão Mastercard | 5480 8328 0103 3311 |
| Código de segurança | 123 |
| Validade | 11/30 |
| Nome do titular | APRO (aprova; `OTHE` recusa) |
| CPF | 12345678909 |

Depois confira:

- [ ] Ao voltar para o app, a assinatura aparece como **Ativa**.
- [ ] Em **Webhooks → histórico**, a notificação consta como entregue (`200`). A ativação também acontece no retorno do checkout, então só o histórico prova que o webhook funciona.
- [ ] **Cancelar assinatura** deixa o status como **Cancelada**, e o app fica somente leitura, com os dados acessíveis.
- [ ] Assinar de novo volta a ficar **Ativa**.

Erros comuns ao clicar em **Assinar** (aparecem no log da Vercel):

| Mensagem | Causa |
|---|---|
| `Both payer and collector must be real or test users` | O e-mail de login do app é real, mas o token é de teste. Entre no app com o usuário do comprador de teste. |
| `User bad request` | O e-mail de teste não existe. Confira o número do `TESTUSER...`. |
| `Invalid value for back_url` | `NEXT_PUBLIC_APP_URL` não é o endereço público do site. |

## 6. Passar para produção

- [ ] Ative as credenciais de produção da aplicação.
- [ ] Troque `MERCADOPAGO_ACCESS_TOKEN` pelo de produção e confira a assinatura secreta do modo produção. Faça o redeploy.
- [ ] Assine uma vez com um cartão real, confira o valor e cancele. Pague com uma conta Mercado Pago **diferente da que recebe**, entrando no app com o e-mail dessa conta. Se o botão **Confirmar** ficar bloqueado, confira isso primeiro.

## O que este teste não cobre

**Cartão recusado na renovação.** Não dá para simular a cobrança do mês seguinte. Pela documentação, depois das novas tentativas a fatura fica `processed` com pagamento recusado, e o app então marca a conta como **Pagamento pendente**. Acompanhe a primeira falha real no histórico de webhooks.

## Ponto a confirmar

A documentação de webhooks diz que a configuração pelo painel "não está disponível" para assinaturas, embora liste os eventos de assinatura. Se o histórico do passo 5 ficar vazio, as renovações e os cancelamentos feitos fora do app não chegarão automaticamente. Nesse caso, peça ajuste no código para consultar as assinaturas pelo cron diário.

## Fontes

- [Assinaturas com pagamento pendente](https://www.mercadopago.com.br/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments)
- [Criar assinatura (API)](https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/create-preapproval/post)
- [Consultar fatura (API)](https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/get-authorized-payment/get)
- [Webhooks](https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks)
- [Contas de teste](https://www.mercadopago.com.br/developers/en/docs/subscriptions/additional-content/your-integrations/test/accounts)
- [Cartões de teste](https://www.mercadopago.com.br/developers/en/docs/subscriptions/additional-content/your-integrations/test/cards)
