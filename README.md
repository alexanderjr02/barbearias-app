<div align="center">

# ✂️ CORTIX

### Sistema de Gestão Completo para Barbearias Modernas

**Painel web + app mobile • Agendamento online • Fidelidade • Chatbot • Gestão financeira • Multi-tenant SaaS**

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
| **Marketing** | Campanhas e automações (tela pronta; disparo real ainda não integrado — ver roadmap) |
| **Configurações** | Marca (logo/cores/banner), horários de funcionamento e plano da conta |

### App mobile (Flutter — Android/iOS/Web), um app para os 3 papéis

- **Gestor**: tudo que existe no painel web, incluindo dashboard com gráficos, agenda em calendário, clientes, equipe, serviços, estoque, financeiro, marketing e configurações.
- **Barbeiro**: início com resumo do dia, agenda em calendário, cadastro e lista de clientes, ganhos/comissão.
- **Cliente**: agendamento com seleção de barbeiro (foto + especialidade) e serviço em formato de cards, histórico de agendamentos e pontos de fidelidade.
- Tema claro/escuro, marca da barbearia (logo/banner/cor) refletida em tempo real, localização em pt-BR.

### Página pública de agendamento (`/booking/[slug]`)

Fluxo em 5 passos para o cliente final, sem precisar de conta: escolher serviço → escolher barbeiro → escolher data/horário (apenas horários realmente livres) → informar nome e WhatsApp → confirmar.

### Chatbot

Widget flutuante nas páginas públicas e no painel, hoje com respostas automáticas por palavra-chave (horário, serviços, preços, como agendar). Upgrade para IA generativa está no roadmap (veja abaixo).

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
│   │   └── api/v1/             # API versionada (painel web + app Flutter), envelope {data,error}
│   │
│   ├── components/             # Layout, dashboard, chatbot, billing, UI base
│   ├── context/                # PlanContext (plano/features da conta)
│   ├── lib/                    # auth.ts, db.ts, loyalty.ts, api/relay.ts, etc.
│   └── proxy.ts                # Substitui o middleware.ts do Next.js "clássico" — protege
│                                 rotas por papel e aplica CORS em /api/v1 e /uploads
```

---

## 🗄️ Modelo de dados (multi-tenant)

```
User (dono, barbeiro ou cliente — diferenciado por `role`)
  └── Barbershop ──┬── Staff (barbeiros)
                    ├── Service (serviços)
                    ├── Appointment (agendamentos) ── Review (avaliação pós-atendimento)
                    ├── Product (estoque)
                    ├── FinancialTransaction (lançamentos financeiros)
                    ├── WorkingHour (horário de funcionamento)
                    ├── BarbershopClient (vínculo cliente ↔ barbearia, mesmo sem agendamento ainda)
                    ├── LoyaltyAccount (pontos/nível) ── PointsTransaction (extrato)
                    └── ChatMessage (histórico do chatbot)

RefreshToken (sessão) ── User
```

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

Faça login com o mesmo usuário do painel web — o `role` da conta decide se o app abre a experiência de gestor, barbeiro ou cliente.

---

## 📄 Variáveis de ambiente

```env
# Banco de dados (SQLite em dev; troca de provider no Prisma para produção)
DATABASE_URL="file:./dev.db"

# Autenticação (JWT próprio — src/lib/auth.ts)
JWT_ACCESS_SECRET="sua-chave-secreta-aqui"
JWT_REFRESH_SECRET="outra-chave-secreta-aqui"
```

---

## 💰 Planos do sistema

| Plano | Preço | Barbeiros | Agendamentos |
|---|---|---|---|
| **Starter** | R$ 29/mês | Até 3 | 50/mês |
| **Pro** | R$ 79/mês | Até 10 | Ilimitado |
| **White Label** | R$ 299/mês + 3% | Ilimitado | Ilimitado |

O plano fica salvo em `Barbershop.plan` e controla o que a conta pode acessar (`src/context/PlanContext.tsx`). **Não há cobrança automática ainda** — troca de plano hoje é manual, sem gateway de pagamento (veja o roadmap em [docs/apresentacao-cliente.md](docs/apresentacao-cliente.md)).

---

## 🌐 Referência da API

Contrato completo, com todas as rotas e papéis, em **[docs/api-v1.md](docs/api-v1.md)**.

---

## 🤝 Como contribuir

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-funcionalidade`
3. Commit: `git commit -m "feat: descrição da mudança"`
4. Push: `git push origin feature/minha-funcionalidade`
5. Abra um Pull Request descrevendo o que foi feito

---

## 📝 Licença

MIT © 2025 CORTIX — Feito para barbearias brasileiras.
