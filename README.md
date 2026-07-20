<div align="center">

# ✂️ CORTIX

### Sistema de Gestão Completo para Barbearias Modernas

**Painel web + app mobile • Agendamento online • Copiloto com IA • Fidelidade • Gorjeta via PIX • Fila ao vivo • Multi-tenant SaaS**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://prisma.io)
[![Flutter](https://img.shields.io/badge/Flutter-3-02569B?logo=flutter)](https://flutter.dev)

</div>

---

## 📌 O que é o CORTIX?

O **CORTIX** é uma plataforma SaaS (Software as a Service) para barbearias que querem profissionalizar sua gestão. O dono da barbearia controla o negócio em um único lugar — agenda, financeiro, estoque, equipe, marketing e fidelidade — e cada papel (gestor, barbeiro, cliente) tem sua própria experiência, tanto no **painel web** quanto no **app mobile em Flutter**.

Cada barbearia cadastrada tem uma **página pública de agendamento** com sua própria identidade visual (cores, logo, banner), compartilhável por link para os clientes agendarem sem precisar ligar.

Para uma explicação não técnica, pensada para apresentar a clientes/investidores, veja **[docs/apresentacao-cliente.md](docs/apresentacao-cliente.md)**.

---

## 🚀 Funcionalidades

### Painel web do gestor (dono/gerente da barbearia)

| Funcionalidade | Descrição |
|---|---|
| **Dashboard** | Métricas em tempo real (receita, agendamentos, clientes, ticket médio) vindas do banco de dados |
| **Agendamentos** | Lista e criação de agendamentos, com status (agendado, concluído, cancelado, no-show) |
| **Clientes** | Histórico de visitas, gasto total e identificação de clientes recorrentes |
| **Equipe** | Cadastro de barbeiros, comissão, contagem de atendimentos e receita gerada no mês |
| **Serviços** | Cadastro com preço, duração, categoria e imagem |
| **Financeiro** | Receitas x despesas com lançamentos manuais e gráfico por semana/mês |
| **Estoque** | Produtos com alerta automático de estoque baixo |
| **Fidelidade** | Pontos por real gasto, níveis (Bronze/Prata/Ouro) e extrato de pontos por cliente |
| **Marketing** | Campanhas e automações (+ redator de marketing com IA no Copiloto) |
| **Copiloto com IA** | Assistente de negócio: resumo diário proativo (sumidos, horários vazios, confirmar amanhã, estoque) com ações de 1 toque + chat que responde sobre o negócio em português (faturamento, clientes, equipe) e **administra por conversa** (cadastrar serviço, mudar preço, dar folga). Botão flutuante fixo no painel |
| **Configurações** | Marca (logo/cores/banner), horários, chave PIX (gorjetas), FAQ do chatbot e plano da conta |

### ✨ Diferenciais (o que nenhum concorrente tem junto)

- **Copiloto com IA** para gestor e barbeiro (assistente de negócio, não só bot de agendamento).
- **Antes/Depois automático**: barbeiro fotografa o resultado ao concluir → vai pra Carteira de Cortes do cliente + vira portfólio.
- **Receita do corte (ficha técnica)**: como o corte foi feito, pré-carregada na próxima visita — corte idêntico toda vez.
- **Fila ao vivo**: cliente vê posição na fila + espera estimada, atualizando sozinho; check-in ao vivo (chegou → em atendimento).
- **Gorjeta digital via PIX**: cliente dá gorjeta pelo app; barbeiro vê nos Ganhos.
- **Carteira de Cortes** do cliente + **foto de referência** no chat ("quero esse corte").
- **IA que lê a foto de referência** e descreve tecnicamente pro barbeiro reproduzir.

### App mobile (Flutter — Android/iOS/Web), um app para os 3 papéis

- **Gestor**: tudo que existe no painel web + **Copiloto com IA** (botão flutuante) com resumo diário e chat de negócio.
- **Barbeiro**: início com resumo do dia, agenda com **check-in ao vivo** e **finalização com foto do resultado + receita do corte**, referência + preferências do cliente no atendimento, ganhos/comissão + **gorjetas**, e **Copiloto pessoal** (ganhos, próximo cliente, sumidos).
- **Cliente**: agendamento com seleção de barbeiro e serviço em cards, **Carteira de Cortes**, **fila ao vivo** com posição/espera, **gorjeta via PIX**, avaliação e chatbot com **envio de foto de referência**.
- Tema claro/escuro, marca da barbearia (logo/banner/cor) refletida em tempo real, navegação moderna com barra flutuante, localização em pt-BR.

### Página pública de agendamento (`/booking/[slug]`)

Fluxo em 5 passos para o cliente final, sem precisar de conta: escolher serviço → escolher barbeiro → escolher data/horário (apenas horários realmente livres) → informar nome e WhatsApp → confirmar.

### Chatbot & Copiloto com IA

O sistema tem **duas camadas de IA**, ambas movidas pelo Claude (Anthropic) e ativadas ao definir `ANTHROPIC_API_KEY`. **Sem a chave, tudo continua funcionando** em modo simulado/respostas prontas — a chave só liga a conversa livre.

- **Bot do cliente** (widget flutuante no app e nas páginas públicas): agenda, remarca, cancela e consulta horários **reais** via tool-use, entra na fila de espera, faz upsell e responde pelo **FAQ da barbearia**. Aceita **foto de referência** no chat (vai pra Carteira de Cortes).
- **Copiloto do gestor/barbeiro** (assistente de negócio): resumo proativo + ações de 1 toque, chat sobre os dados reais do negócio e administração por conversa. Ver `src/lib/chatbot/copilot.ts` e `src/lib/copilot/insights.ts`.

A IA é um recurso **Pro+** (ver Planos). O modelo é configurável via `CHATBOT_MODEL` (padrão `claude-opus-4-8`).

### Integrações

| Integração | Estado |
|---|---|
| **PIX (gorjetas)** | Chave PIX da barbearia mostrada ao cliente pra dar gorjeta; registrada e exibida nos Ganhos do barbeiro |
| **WhatsApp Cloud API** | Envio (confirmações) **e** webhook de entrada — bot 24/7 que responde com a mesma IA + handoff pra humano (`/api/webhooks/whatsapp`). Requer credenciais da Meta |
| **Relatório semanal** | Cron (`/api/cron/weekly-report`) que envia o resumo da semana por notificação + e-mail. Agendado no `render.yaml` |
| **Mercado Pago** | Estrutura de cobrança de assinatura (ver `src/lib/mercadopago.ts`) |
| **NF-e / NFS-e** | Estrutura pronta (provider-agnóstica) para nota fiscal de serviço |

---

## 🛠️ Tecnologias

### Backend + painel web

| Tecnologia | Para que serve |
|---|---|
| **Next.js 16 (App Router)** | Framework fullstack — frontend do painel + todas as rotas de API |
| **TypeScript** | Tipagem estática |
| **Tailwind CSS v4** | Estilização utilitária |
| **Prisma 7 + `@prisma/adapter-libsql`** | ORM e acesso ao banco |
| **SQLite** (dev) | Banco local, sem servidor externo — troca de provider no Prisma é migração, não reescrita |
| **jose (JWT)** | Autenticação própria (access token curto + refresh token rotacionado), sem depender de provedor externo |
| **@tanstack/react-query** | Cache e sincronização dos dados do painel com a API |
| **Recharts** | Gráficos do dashboard e relatórios |
| **Radix UI / Lucide Icons** | Componentes acessíveis e ícones |
| **React Hook Form + Zod** | Formulários com validação tipada |

### App mobile

| Tecnologia | Para que serve |
|---|---|
| **Flutter 3 / Dart** | Um único código-fonte para Android, iOS e Web |
| **Provider** | Gerenciamento de estado (sessão, tema, marca da barbearia) |
| **Dio** | Cliente HTTP contra a API `/api/v1` |
| **flutter_secure_storage** / **shared_preferences** | Persistência do token de sessão (nativo vs. web) |
| **fl_chart** | Gráficos do dashboard do gestor no app |
| **table_calendar** | Calendário de agenda (gestor e barbeiro) |
| **flutter_localizations + intl** | Interface e seletor de data/hora em pt-BR |

---

## 📁 Estrutura do Projeto

```
cortix/
├── Dockerfile                  # Build multi-stage do painel web (deps → build → runtime)
├── docker-compose.yml          # Sobe painel web + app Flutter web com `docker compose up -d --build`
├── docker-entrypoint.sh        # Roda as migrations antes de iniciar o servidor
├── .github/workflows/ci.yml    # Type-check + lint + testes + build a cada push/PR
│
├── prisma/
│   ├── schema.prisma          # Modelos do banco (multi-tenant)
│   ├── migrations/            # Histórico de migrations
│   └── seed.ts                # Dados de demonstração
│
├── docs/
│   ├── api-v1.md               # Contrato da API v1 (consumida pelo painel e pelo app Flutter)
│   └── apresentacao-cliente.md # Documento não técnico: o que já funciona e o que falta
│
├── mobile/                     # App Flutter (Android/iOS/Web)
│   ├── Dockerfile               # Build web (flutter build web) servido via nginx
│   └── lib/
│       ├── core/                # Tema, API client, storage de sessão
│       └── features/
│           ├── auth/            # Login e sessão
│           ├── gestor/          # Telas do dono/gerente
│           ├── barbeiro/        # Telas do barbeiro
│           ├── cliente/         # Telas do cliente final
│           ├── profile/         # Perfil do usuário logado
│           └── chatbot/         # Chatbot flutuante no app
│
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login e cadastro (público)
│   │   ├── (dashboard)/dashboard/ # Painel do gestor (protegido por sessão)
│   │   ├── admin/              # Painel interno, restrito a SUPER_ADMIN
│   │   ├── booking/[slug]/     # Agendamento público por barbearia
│   │   ├── api/                # Rotas legadas (usadas pelo próprio painel web)
│   │   ├── api/health/         # Health check (usado pelo Docker/orquestrador)
│   │   └── api/v1/             # API versionada (painel web + app Flutter), envelope {data,error}
│   │
│   ├── components/             # Layout, dashboard, chatbot, billing, UI base
│   │   └── layout/FloatingCopilotWidget.tsx # Copiloto flutuante do painel web
│   ├── context/                # PlanContext (plano/features da conta)
│   ├── lib/                    # auth.ts, db.ts, loyalty.ts, billing.ts, whatsapp.ts, mailer.ts...
│   │   ├── chatbot/            # assistant.ts (bot do cliente) + copilot.ts (gestor/barbeiro)
│   │   └── copilot/            # insights.ts (inteligência de negócio, sem IA)
│   └── proxy.ts                # Substitui o middleware.ts do Next.js "clássico" — protege
│                                 rotas por papel e aplica CORS em /api/v1 e /uploads
```

---

## 🗄️ Modelo de dados (multi-tenant)

```
User (dono, barbeiro ou cliente — diferenciado por `role`)
  └── Barbershop ──┬── Staff (barbeiros)
                    ├── Service (serviços)
                    ├── Appointment (agendamentos) ──┬── Review (avaliação pós-atendimento)
                    │     • referencePhoto / resultPhoto (antes/depois)   └── Tip (gorjeta via PIX)
                    │     • recipeMachine/Finish/Products/Notes (receita do corte)
                    ├── Product (estoque)
                    ├── FinancialTransaction (lançamentos financeiros)
                    ├── WorkingHour (horário de funcionamento)
                    ├── BarbershopClient (vínculo cliente ↔ barbearia)
                    ├── WaitlistEntry (fila de espera / Auto-avise)
                    ├── SubscriptionPlan (clube de assinatura) / ServiceInvoice (NF-e)
                    ├── LoyaltyAccount (pontos/nível) ── PointsTransaction (extrato)
                    └── ChatMessage (histórico do chatbot / WhatsApp)

CutPhoto (Carteira de Cortes) ── User (cliente)
ClientPreferences (ficha do cliente) ── User (cliente)
RefreshToken (sessão) ── User
```

Campos de IA/negócio recentes no `Barbershop`: `pixKey` (gorjetas), `faqText` (FAQ do chatbot), `plan` (gate de IA via `planHasAI`).

Cada barbearia tem um `slug` único (ex.: `barbearia-do-joao`) que vira a URL pública de agendamento.

> Todos os campos de papel/status (`role`, `status`, `plan`, etc.) são `String` no schema — o SQLite usado em desenvolvimento não suporta `enum` nativo no Prisma. Os valores válidos estão documentados em `docs/api-v1.md`.

---

## ⚙️ Como rodar localmente

### Painel web (Next.js)

Pré-requisitos: **Node.js 18+**.

```bash
git clone https://github.com/alexanderjr02/barbearias-app.git
cd barbearias-app

npm install
npx prisma migrate dev        # cria/atualiza o banco local (dev.db)
npx tsx prisma/seed.ts        # opcional: popula com dados de demonstração
npm run dev
```

Acesse **http://localhost:3000**. Com o seed rodado, use:
```
E-mail: demo@cortix.app
Senha:  demo123456
```

### App mobile (Flutter)

Pré-requisitos: **Flutter SDK 3+** e o painel web rodando (o app consome `/api/v1`).

```bash
cd mobile
flutter pub get

# Web (aponte para o backend local; troque o IP se for testar em celular físico na mesma rede)
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/api/v1

# Android/iOS
flutter run --dart-define=API_BASE_URL=http://SEU_IP_NA_REDE:3000/api/v1
```

Faça login com o mesmo usuário do painel web — o `role` da conta decide se o app abre a experiência de gestor, barbeiro ou cliente. Cliente também pode criar a própria conta direto pelo app ("Sou cliente e quero criar uma conta" na tela de login) ou pelo site em `/register/cliente`.

---

## 📄 Variáveis de ambiente

```env
# Banco de dados (SQLite — arquivo local em dev, volume Docker em produção)
DATABASE_URL="file:./dev.db"

# Autenticação (JWT próprio — src/lib/auth.ts). Gere uma chave forte e
# EXCLUSIVA de produção — nunca reaproveite a de desenvolvimento:
#   openssl rand -base64 48
JWT_SECRET="sua-chave-secreta-aqui"

# Login com Google (opcional) — veja a seção "Login com Google" abaixo.
GOOGLE_CLIENT_ID=""
NEXT_PUBLIC_GOOGLE_CLIENT_ID=""

# IA — liga o Copiloto e o chatbot com IA (Claude/Anthropic). Sem ela, tudo
# roda em modo simulado/respostas prontas. Recurso Pro+.
ANTHROPIC_API_KEY=""
# CHATBOT_MODEL="claude-opus-4-8"   # opcional (ex.: claude-haiku-4-5 p/ baratear)

# WhatsApp Cloud API — envio + webhook do bot 24/7 (opcional; requer conta Meta)
WHATSAPP_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_VERIFY_TOKEN=""     # a mesma string digitada no painel da Meta
WHATSAPP_BARBERSHOP_ID=""    # id da barbearia dona do número

# Relatório semanal automático (cron) — /api/cron/weekly-report?secret=...
CRON_SECRET=""
```

Veja `.env.example` para o modelo mínimo.

### Login com Google

Sem configurar nada, o botão "Continuar com Google" fica **oculto** no painel web e a rota `/api/auth/google` responde 501 — nada quebra, o login por e-mail/senha continua funcionando normalmente. Para habilitar:

1. Crie um OAuth Client ID em [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) — tipo **Web application**, com seu(s) domínio(s) em "Authorized JavaScript origins" (ex.: `http://localhost:3000` em dev).
2. No `.env`, defina `GOOGLE_CLIENT_ID` e `NEXT_PUBLIC_GOOGLE_CLIENT_ID` com o **mesmo valor** (o client ID, não o secret — essa integração usa Google Identity Services, que não precisa de client secret).
3. Rebuilde (`docker compose up -d --build`, ou reinicie `npm run dev`).

Um login com Google novo (e-mail que ainda não existe) sempre vira uma conta **CLIENT** — dono de barbearia continua se cadastrando pelo formulário completo (`/register`), já que o Google não tem como preencher os dados da barbearia. Se o e-mail já existir (de qualquer papel), o Google só fica vinculado como forma de login adicional.

Pro **app Flutter**, o mesmo Client ID precisa ser passado via `--dart-define=GOOGLE_CLIENT_ID=...`, e no Android/iOS também é necessário configurar `google-services.json` (Android) e o URL scheme reverso (iOS) — veja a documentação do pacote [`google_sign_in`](https://pub.dev/packages/google_sign_in) para o passo a passo específico de cada plataforma.

---

## 🚀 Deploy em produção

O jeito recomendado é via Docker — já testado de ponta a ponta (build, migrations automáticas, persistência de dados):

```bash
docker compose up -d --build
```

Sobe em **http://localhost:3000** (ou na porta/host que você configurar na frente, ex.: nginx + certificado TLS). Na primeira vez, roda com um banco vazio e aplica todas as migrations sozinho.

**O que cada volume guarda** (definidos em `docker-compose.yml`):
- `db-data` → o banco SQLite (`/app/data/dev.db` dentro do container)
- `uploads-data` → fotos enviadas pelo painel (`/app/public/uploads`)

Os dados sobrevivem a `docker compose down` e a rebuilds da imagem — só somem se você remover os volumes explicitamente (`docker compose down -v`).

**Pra levar os dados que você já tem localmente** (em vez de começar com banco vazio), copie o `dev.db` pro volume antes do primeiro `up`:

```bash
docker volume create barbearias-app_db-data
docker run --rm -v barbearias-app_db-data:/data -v "$(pwd)":/host:ro alpine cp /host/dev.db /data/dev.db
docker run --rm -v barbearias-app_db-data:/data alpine chown -R 1001:1001 /data
docker compose up -d --build
```

**Health check**: `GET /api/health` (usado pelo `healthcheck` do `docker-compose.yml` — confirma que o processo subiu *e* que o banco está respondendo, não só que o Next.js iniciou).

**Antes de ir ao ar de verdade**, troque pelo menos:
- `JWT_SECRET` — chave forte, diferente da de desenvolvimento (veja acima)
- Um reverse proxy (nginx/Caddy) na frente, com HTTPS — o Next.js sozinho não faz TLS

### App Flutter Web

O `docker compose up -d --build` acima também sobe a versão web do app Flutter (serviço `mobile-web`, `mobile/Dockerfile`) em **http://localhost:8081**, servida como arquivos estáticos via nginx.

Diferente do painel web, o Flutter Web não lê variáveis de ambiente em tempo de execução — o endereço da API (`API_BASE_URL`) é **compilado dentro do JS** no momento do build. Por padrão aponta pra `http://localhost:3000/api/v1` (o próprio serviço `app` publicado na sua máquina); pra apontar pra um domínio real em produção, defina no seu `.env` antes do build:

```env
MOBILE_API_BASE_URL=https://seu-dominio.com/api/v1
```

e rode `docker compose up -d --build` de novo (só o `mobile-web` precisa rebuildar quando essa variável muda).

---

## 💰 Planos do sistema

| Plano | Preço | Barbeiros | Agendamentos | IA (Copiloto/chatbot) |
|---|---|---|---|---|
| **Essencial** | R$ 79/mês | Até 3 | Ilimitado | ❌ |
| **Pro** | R$ 149/mês | Até 10 | Ilimitado | ✅ |
| **White Label** | R$ 399/mês | Ilimitado | Ilimitado | ✅ |

O plano fica salvo em `Barbershop.plan` e controla o que a conta pode acessar (`src/context/PlanContext.tsx`). Os preços/limites vivem no banco (`PlatformSetting`, editáveis em `/admin/settings`), com fallback em `src/lib/billing.ts`. A **IA é exclusiva do Pro+** (`planHasAI()` em `src/lib/billing.ts`) — protege a margem, já que cada conversa consome a API da Anthropic. **A cobrança automática (gateway) e o teste grátis de 14 dias ainda não estão implementados** — troca de plano hoje é manual.

---

## 🌐 Referência da API

Contrato completo, com todas as rotas e papéis, em **[docs/api-v1.md](docs/api-v1.md)**.

---

## 🤝 Como contribuir

Fluxo trunk-based: `master` fica sempre pronta pra produção — mudanças maiores ou arriscadas passam por uma branch curta antes de voltar.

1. Crie uma branch a partir de `master`: `git checkout -b feature/minha-funcionalidade` (ou `fix/...`)
2. Commit: `git commit -m "feat: descrição da mudança"`
3. Push: `git push origin feature/minha-funcionalidade`
4. Abra um Pull Request descrevendo o que foi feito — o CI (`.github/workflows/ci.yml`) roda type-check, lint e build de produção automaticamente
5. Merge em `master` depois de revisado e com o CI verde
6. Ao publicar uma versão que vai pro ar, marque com uma tag: `git tag v1.1.0 && git push --tags`

> Recomendado (não configurado automaticamente): ative a proteção da branch `master` em *Settings → Branches* no GitHub, exigindo Pull Request e CI verde antes do merge.

---

## 📝 Licença

MIT © 2025 CORTIX — Feito para barbearias brasileiras.
