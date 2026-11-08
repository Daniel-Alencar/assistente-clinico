# Mercado Pago (assinatura da plataforma): passo a passo

Como colocar a assinatura mensal em funcionamento. É o fluxo em que o **profissional paga o Assistente Clínico**; a cobrança das sessões (paciente paga o profissional) usa a chave Pix dele e não passa por aqui.

Levantado em 08/11/2026. O painel do Mercado Pago muda de nome e lugar com frequência.

## O que ter em mãos

- [ ] Conta Mercado Pago que vai receber as assinaturas.
- [ ] App publicado com HTTPS, com `NEXT_PUBLIC_APP_URL` apontando para o domínio. O teste não funciona em `localhost`: o Mercado Pago precisa alcançar o webhook e voltar para o site.

## 1. Criar a aplicação

- [ ] Em mercadopago.com.br/developers, abra **Suas integrações → Criar aplicação**.
- [ ] Escolha o produto **Assinaturas**.

## 2. Criar as contas de teste

- [ ] Em **Contas de teste**, crie uma conta **Vendedor** e uma **Comprador**, ambas do Brasil.
- [ ] Anote o e-mail e a senha do comprador.

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

1. Entre no app com uma conta de profissional e abra **Assinatura**.
2. No campo de e-mail, informe o **e-mail do comprador de teste**.
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

## 6. Passar para produção

- [ ] Ative as credenciais de produção da aplicação.
- [ ] Troque `MERCADOPAGO_ACCESS_TOKEN` pelo de produção e confira a assinatura secreta do modo produção. Faça o redeploy.
- [ ] Assine uma vez com um cartão real, confira o valor e cancele.

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
