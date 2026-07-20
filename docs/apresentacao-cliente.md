# CORTIX — Onde o projeto está hoje

> Documento de apresentação, sem termos técnicos, para mostrar a clientes e parceiros o que o sistema já faz e o que ainda falta para ele estar pronto para vender.

---

## 1. Resumo em uma frase

O CORTIX já é um sistema funcional de ponta a ponta: o dono da barbearia gerencia o negócio, o barbeiro usa o próprio app para ver a agenda e os clientes, e o cliente final agenda e acompanha seus pontos de fidelidade — tudo com dados reais, salvos em banco de dados, tanto pelo computador quanto pelo celular.

O que falta hoje não é "fazer o sistema funcionar" — é **conectar peças de operação comercial** (cobrança automática, envio de mensagens, IA no chat) que normalmente são plugadas por último, quando já existem clientes reais usando o produto.

---

## 2. O que já funciona hoje

### 2.1 Painel do dono/gerente da barbearia (computador)

| Área | O que já faz |
|---|---|
| Login e conta | Cadastro e login reais, com sessão segura — não é mais uma tela "de mentira" |
| Dashboard | Mostra receita, número de agendamentos, clientes ativos e ticket médio **do dia real**, puxado do banco de dados |
| Agenda | Lista de agendamentos com status (agendado, concluído, cancelado, não compareceu) |
| Clientes | Histórico de visitas e gasto de cada cliente, juntando quem agendou pelo link público com quem foi cadastrado manualmente |
| Equipe | Cadastro de barbeiros, comissão de cada um, quantos atendimentos e quanto cada um gerou de receita no mês |
| Serviços | Cadastro de serviços com preço, duração, categoria e foto |
| Estoque | Cadastro de produtos com aviso automático quando o estoque está acabando |
| Financeiro | Lançamento de receitas e despesas, com gráfico comparando os dois |
| Fidelidade | Cada real gasto vira pontos; o cliente sobe de nível (Bronze/Prata/Ouro) conforme acumula |
| Configurações | Logo, banner e cor da marca da barbearia, horário de funcionamento e plano da conta |

### 2.2 App de celular (Android, iPhone e navegador) — um app para os três perfis

O mesmo aplicativo reconhece quem está logado e mostra a tela certa:

- **Dono/gerente**: praticamente tudo que existe no painel do computador, incluindo os gráficos, dentro do bolso — mais o **Copiloto** (assistente de negócio) num botão fixo.
- **Barbeiro**: agenda do dia com **check-in ao vivo** (chegou → em atendimento → concluído), finalização do corte com **foto do resultado + "receita" do corte** (como foi feito, pra repetir igual na próxima), foto de referência e preferências do cliente na hora do atendimento, ganhos/comissão + **gorjetas**, e um **Copiloto pessoal** (quanto vai receber, próximo cliente, quem sumiu).
- **Cliente final**: agenda escolhendo barbeiro e serviço, guarda seus cortes numa **Carteira de Cortes**, vê a **fila ao vivo** (sua posição e a espera estimada), dá **gorjeta via PIX**, avalia o atendimento e conversa com o assistente (podendo mandar **foto de referência**).

O app já se adapta à identidade visual de cada barbearia (cores, logo, banner) e já funciona em português, incluindo o calendário de escolha de data.

### 2.3 Página pública de agendamento (o link que vai no WhatsApp/Instagram)

Qualquer pessoa, sem precisar de conta, consegue: escolher o serviço → escolher o barbeiro → escolher data e horário (só aparecem horários realmente livres) → informar nome e WhatsApp → confirmar. Isso já está no ar e gravando de verdade no banco de dados da barbearia.

### 2.4 Assistente virtual e Copiloto (IA)

Há duas frentes de inteligência, ambas **prontas e esperando só a chave da IA** ser ligada (com a chave, elas passam a conversar livremente; sem ela, respondem com respostas prontas — nada quebra):

- **Assistente do cliente**: agenda, remarca, cancela e consulta horários de verdade, entra na fila de espera e responde pelas perguntas frequentes que o dono cadastrar. Já aceita **foto de referência** no chat.
- **Copiloto do dono e do barbeiro**: um assistente de negócio que, de manhã, já mostra o resumo do dia (clientes que sumiram, horários vazios, agendamentos a confirmar, estoque baixo) com **ações de um toque**, e responde perguntas como "quanto faturei essa semana?" — além de **cadastrar serviço, mudar preço e dar folga por conversa**.

### 2.5 Gorjeta, fila ao vivo e antes/depois

- **Gorjeta via PIX**: no fim do atendimento o cliente pode deixar uma gorjeta pela chave PIX da barbearia; o barbeiro vê o total nos Ganhos.
- **Fila ao vivo**: o cliente acompanha em tempo real sua posição na fila e o tempo estimado de espera.
- **Antes/depois automático**: a foto do resultado do corte vai direto pra Carteira de Cortes do cliente e vira o portfólio do barbeiro.

### 2.6 Planos de assinatura (Essencial / Pro / White Label)

Três planos — **Essencial R$ 79**, **Pro R$ 149** e **White Label R$ 399** — com a **IA (Copiloto e chatbot inteligente) exclusiva do Pro pra cima**. Os preços e limites são editáveis no painel administrativo. A troca de plano já funciona; a cobrança automática ainda não (ver abaixo).

---

## 3. O que falta para o produto ficar pronto para vender

Organizado por impacto — o que trava a venda primeiro aparece no topo.

| # | O que falta | Por que importa | Tamanho do esforço |
|---|---|---|---|
| 1 | **Ligar a chave da IA** | O Copiloto e o chatbot inteligente já estão **construídos** — falta só colar a chave da Anthropic (`ANTHROPIC_API_KEY`) para eles saírem do modo "respostas prontas" e passarem a conversar de verdade. É uma conexão, não um desenvolvimento. | Baixo |
| 2 | **Cobrança automática (gateway de pagamento)** | Hoje a troca de plano é manual — não existe cartão/boleto/Pix cobrando a mensalidade sozinho. Sem isso, não dá para vender assinatura em escala. (A estrutura de Mercado Pago já existe no código.) | Médio–Alto |
| 3 | **Teste grátis de 14 dias** | Combinado como isca de venda, mas ainda não implementado (exige controlar quando o teste começa/termina e o que acontece ao expirar). | Baixo–Médio |
| 4 | **Conectar o WhatsApp oficial** | O envio de mensagens **e** o robô de atendimento 24h no WhatsApp já estão prontos no código; falta criar/verificar a conta no WhatsApp Business (Meta) e colar as credenciais. | Médio (burocracia da Meta) |
| 5 | **Voz/áudio no chat** | Falar em vez de digitar. Diferente do resto, precisa contratar um serviço de transcrição de voz à parte — não é só "ligar uma chave". | Médio |
| 6 | **Publicação do app nas lojas (Google Play / App Store)** | O app já funciona em Android, iPhone e navegador, mas ainda não está publicado. Publicar exige conta de desenvolvedor nas duas lojas e passar pela revisão de cada uma. | Médio |
| 7 | **Identidade visual própria por cliente grande (White Label)** | Para o plano mais caro, a promessa é o app parecer "deles" (nome, ícone próprios na loja). A personalização de cor/logo dentro do app já existe; um app publicado com marca própria é um projeto à parte por cliente. | Alto (por cliente) |
| 8 | **Segurança e banco para produção** | Restringir acessos internos ao necessário e migrar o banco (hoje um arquivo local, ótimo para testes) para um serviço hospedado. A troca é simples, pois o sistema já foi construído pensando nisso. | Baixo–Médio |

### Como ler esta lista

- O item **1** é praticamente um botão a ligar — a IA já está feita.
- Os itens **2 a 4** são o que separa "sistema completo" de "produto cobrando sozinho e atendendo no WhatsApp" — são conexões/burocracias, não reescrita.
- Os itens **5 a 8** só importam mais perto do lançamento ao público ou de fechar um cliente grande.

> A ideia antiga de "marketplace entre barbearias" foi **removida** do produto — não fazia sentido para a operação de uma barbearia individual.

---

## 4. Em resumo

O CORTIX já entrega, hoje, a experiência completa de uso diário: agendar, atender, controlar caixa e estoque, fidelizar cliente — pelo computador ou pelo celular, para os três tipos de usuário da barbearia. O que resta é o conjunto de integrações comerciais (cobrança, mensagens, publicação nas lojas) necessárias para transformar o sistema, que já funciona, em um produto pronto para ser vendido e cobrado de múltiplos clientes ao mesmo tempo.
