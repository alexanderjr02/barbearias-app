import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Política de Privacidade · CORTIX",
  description: "Como o CORTIX coleta, usa e protege dados pessoais, conforme a LGPD.",
};

// NOTE: Starting template aligned with the LGPD (Lei 13.709/2018). Review with
// a lawyer and fill the bracketed placeholders before production.
export default function PrivacidadePage() {
  return (
    <LegalShell title="Política de Privacidade" updatedAt="14 de julho de 2026">
      <p className="text-zinc-400">
        Esta Política explica como o CORTIX (&quot;nós&quot;), operado por <strong className="text-zinc-300">[RAZÃO SOCIAL], CNPJ [CNPJ]</strong>,
        coleta, usa, compartilha e protege dados pessoais, em conformidade com a Lei Geral de Proteção
        de Dados (Lei nº 13.709/2018 — &quot;LGPD&quot;).
      </p>

      <LegalSection n={1} title="Quem é o controlador">
        <p>Para os dados da sua conta de Gestor e da operação da Plataforma, o CORTIX atua como <strong className="text-zinc-300">controlador</strong>.</p>
        <p>Para os dados dos clientes finais que o Gestor insere e gerencia na sua barbearia, o CORTIX atua como <strong className="text-zinc-300">operador</strong>, tratando-os sob instrução do Gestor, que é o controlador desses dados.</p>
      </LegalSection>

      <LegalSection n={2} title="Dados que coletamos">
        <p><strong className="text-zinc-300">Cadastro:</strong> nome, e-mail, telefone/WhatsApp, senha (armazenada com criptografia), e — no cadastro de barbearia — nome do negócio, cidade/estado, CNPJ e endereço quando informados.</p>
        <p><strong className="text-zinc-300">Clientes finais:</strong> nome, telefone, e-mail e data de nascimento, inseridos pelo Gestor para agendamento, histórico e comunicações.</p>
        <p><strong className="text-zinc-300">Uso e técnicos:</strong> registros de acesso, endereço IP e dados de dispositivo, para segurança e funcionamento.</p>
        <p><strong className="text-zinc-300">Pagamento:</strong> a cobrança é processada pelo Mercado Pago. <strong className="text-zinc-300">Não armazenamos números completos de cartão</strong> em nossos servidores.</p>
      </LegalSection>

      <LegalSection n={3} title="Para que usamos (finalidades e bases legais)">
        <p>Prestação do serviço e execução do contrato: criar e manter contas, agendamentos e o painel de gestão.</p>
        <p>Cumprimento de obrigação legal: registros fiscais e contábeis.</p>
        <p>Legítimo interesse: segurança, prevenção a fraudes e melhoria do produto.</p>
        <p>Consentimento: comunicações de marketing, felicitações e campanhas de aniversário — que você pode revogar a qualquer momento.</p>
      </LegalSection>

      <LegalSection n={4} title="Compartilhamento">
        <p>Compartilhamos dados apenas com operadores necessários para o funcionamento do Serviço, sob contrato e dever de confidencialidade, tais como: Mercado Pago (pagamentos), Resend (envio de e-mails), provedor de mensagens WhatsApp e provedor de hospedagem em nuvem.</p>
        <p>Não vendemos dados pessoais. Poderemos divulgar dados quando exigido por lei ou ordem judicial.</p>
      </LegalSection>

      <LegalSection n={5} title="Cookies e tecnologias similares">
        <p>Usamos cookies essenciais para autenticação e manutenção da sessão. Sem eles, o login não funciona. Não usamos cookies de rastreamento publicitário de terceiros.</p>
      </LegalSection>

      <LegalSection n={6} title="Por quanto tempo guardamos">
        <p>Mantemos os dados enquanto a conta estiver ativa e pelo prazo necessário ao cumprimento de obrigações legais. Após o encerramento, os dados são excluídos ou anonimizados, respeitados os prazos legais de retenção fiscal.</p>
      </LegalSection>

      <LegalSection n={7} title="Seus direitos (LGPD)">
        <p>Você pode, a qualquer momento, solicitar: confirmação e acesso aos seus dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação; portabilidade; informação sobre compartilhamentos; e revogação do consentimento.</p>
        <p>Para exercer seus direitos, escreva para <strong className="text-zinc-300">[E-MAIL DO ENCARREGADO/DPO]</strong>. Responderemos nos prazos previstos na LGPD.</p>
      </LegalSection>

      <LegalSection n={8} title="Segurança">
        <p>Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo criptografia de senhas, controle de acesso e conexões seguras (HTTPS). Nenhum sistema é 100% infalível, mas trabalhamos continuamente para reduzir riscos.</p>
      </LegalSection>

      <LegalSection n={9} title="Transferência internacional">
        <p>Alguns provedores podem processar dados fora do Brasil. Nesses casos, exigimos salvaguardas adequadas conforme a LGPD.</p>
      </LegalSection>

      <LegalSection n={10} title="Encarregado (DPO) e contato">
        <p>Encarregado pelo tratamento de dados: <strong className="text-zinc-300">[NOME DO ENCARREGADO]</strong> — <strong className="text-zinc-300">[E-MAIL DO ENCARREGADO/DPO]</strong>.</p>
      </LegalSection>

      <LegalSection n={11} title="Alterações desta Política">
        <p>Podemos atualizar esta Política periodicamente. Mudanças relevantes serão comunicadas na Plataforma ou por e-mail. Recomendamos revisá-la de tempos em tempos.</p>
      </LegalSection>
    </LegalShell>
  );
}
