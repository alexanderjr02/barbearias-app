# 🚀 Colocar o CORTIX no ar (e começar a vender)

Guia direto pra publicar o sistema **com HTTPS**, sem depender ainda do seu
domínio próprio (você adiciona por último). HTTPS é obrigatório: sem ele o
login por cookie, o Google e o webhook do Mercado Pago não funcionam.

---

## Opção A — Render (recomendada: HTTPS grátis, mais simples)

Você recebe uma URL `https://cortix-xxxx.onrender.com` na hora — perfeita pra
já usar e vender enquanto o domínio não chega.

1. **Suba o repositório no GitHub** (se ainda não estiver).
2. Crie conta em **https://render.com** → **New → Blueprint** → conecte o repo.
   O Render lê o arquivo [`render.yaml`](./render.yaml) e monta tudo.
3. Ele vai pedir as variáveis marcadas como secretas. Cole os valores do seu
   `.env` (veja a tabela abaixo). Deixe em branco as que ainda não tiver.
4. Clique em **Apply / Deploy**. No fim, copie a URL do serviço.
5. Vá em **Environment**, defina `APP_URL` com essa URL e clique em **Save**
   (dispara um redeploy). Pronto — está no ar.

> O banco SQLite fica num **disco persistente** (`/app/data`), então seus dados
> sobrevivem a cada deploy. O `render.yaml` já configura isso.

---

## Opção B — VPS com Docker (mais barato a longo prazo)

Serve num servidor próprio (Hostinger, Contabo, DigitalOcean, etc.). Requer um
domínio ou um proxy com HTTPS (Caddy/Nginx + Let's Encrypt) — por isso, se você
ainda **não tem domínio**, comece pela Opção A.

```bash
# no servidor, com Docker instalado:
git clone <seu-repo> cortix && cd cortix
cp .env.example .env      # preencha os valores (tabela abaixo)
docker compose up -d --build
```

O app sobe na porta `3000` e o app mobile (Flutter Web) na `8081`. Coloque um
proxy HTTPS na frente (Caddy resolve Let's Encrypt sozinho quando houver domínio).

---

## 🔑 Variáveis de ambiente

| Variável | Pra quê | Precisa agora? |
|---|---|---|
| `JWT_SECRET` | Assina as sessões | **Sim** (Render gera sozinho) |
| `DATABASE_URL` | Banco | **Sim** (já no blueprint) |
| `APP_URL` | Links de e-mail + webhook/back_url do MP | **Sim**, após o 1º deploy |
| `MERCADOPAGO_ACCESS_TOKEN` | Cobrar as barbearias | **Sim, pra vender** |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail (reset de senha) | Recomendado |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Confirmação no WhatsApp | Quando quiser ativar |
| `GOOGLE_CLIENT_ID` | Login com Google (servidor) | Opcional |

> Sem `MERCADOPAGO_ACCESS_TOKEN`, `RESEND_API_KEY` ou `WHATSAPP_TOKEN`, o app
> **não quebra** — cada recurso entra em modo simulado/log até você preencher.

---

## ✅ Depois do deploy (pra vender de verdade)

1. **Mercado Pago:** em *Suas integrações → Webhooks*, cadastre
   `<APP_URL>/api/billing/webhook` (o app também envia essa URL em cada
   assinatura). Teste assinando um plano — o pagamento cai e o plano ativa
   sozinho pelo webhook.
2. **E-mail:** verifique um domínio na Resend e ajuste `EMAIL_FROM` para poder
   enviar a qualquer cliente (sem domínio, só chega no seu próprio e-mail).
3. **WhatsApp:** crie e aprove um *template* de confirmação no painel da Meta
   (mensagem iniciada pela empresa exige template aprovado).
4. **Legal:** abra `/termos` e `/privacidade` e preencha os campos entre
   colchetes (`[RAZÃO SOCIAL]`, `[CNPJ]`, `[E-MAIL]`, DPO...). Revise com um
   advogado.
5. **Domínio (por último):** aponte seu domínio para o serviço (no Render:
   *Settings → Custom Domain*) e atualize `APP_URL`. O HTTPS é automático.

---

## 🩺 Checklist de "está pronto pra vender"

- [ ] App no ar com HTTPS e login funcionando
- [ ] Assinatura de um plano cobra de verdade e ativa o plano (webhook OK)
- [ ] E-mail de redefinição de senha chegando
- [ ] Termos e Privacidade preenchidos
- [ ] (Opcional) Confirmação por WhatsApp saindo
- [ ] Domínio próprio apontado (passo final)
