import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Termos de Uso · CORTIX",
  description: "Termos e condições de uso da plataforma CORTIX.",
};

// NOTE: This is a solid starting template, not a substitute for review by a
// lawyer. Fill in the bracketed placeholders ([RAZÃO SOCIAL], [CNPJ], etc.)
// with your company's real data before going to production.
export default function TermosPage() {
  return (
    <LegalShell title="Termos de Uso" updatedAt="14 de julho de 2026">
      <p className="text-zinc-400">
        Bem-vindo ao CORTIX. Estes Termos de Uso (&quot;Termos&quot;) regem o acesso e a utilização da
        plataforma de gestão para barbearias CORTIX (&quot;Plataforma&quot;, &quot;Serviço&quot;), oferecida por
        <strong className="text-zinc-300"> [RAZÃO SOCIAL], inscrita no CNPJ [CNPJ]</strong> (&quot;CORTIX&quot;, &quot;nós&quot;).
        Ao criar uma conta ou usar o Serviço, você concorda com estes Termos.
      </p>

      <LegalSection n={1} title="Definições">
        <p><strong className="text-zinc-300">Gestor:</strong> dono ou responsável por uma barbearia que assina a Plataforma.</p>
        <p><strong className="text-zinc-300">Cliente final:</strong> pessoa que agenda serviços em uma barbearia usuária da Plataforma.</p>
        <p><strong className="text-zinc-300">Assinatura:</strong> plano contratado pelo Gestor (Starter, Pro ou White Label).</p>
      </LegalSection>

      <LegalSection n={2} title="Cadastro e conta">
        <p>Para usar o Serviço é necessário criar uma conta com informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade das suas credenciais e por toda atividade realizada na sua conta.</p>
        <p>É preciso ter pelo menos 18 anos para cadastrar uma barbearia. Clientes finais menores de idade devem ter autorização de um responsável.</p>
      </LegalSection>

      <LegalSection n={3} title="Planos, pagamento e renovação">
        <p>O Serviço é oferecido em planos com cobrança mensal recorrente, processada pelo Mercado Pago. Os preços vigentes são exibidos no momento da contratação e podem ser reajustados mediante aviso prévio de 30 dias.</p>
        <p>A assinatura é renovada automaticamente a cada período até que seja cancelada. Em caso de falha no pagamento, o acesso aos recursos pagos poderá ser suspenso até a regularização.</p>
        <p>Você pode cancelar a qualquer momento pelo painel; o cancelamento encerra a renovação seguinte, sem reembolso de períodos já pagos, salvo quando exigido por lei.</p>
      </LegalSection>

      <LegalSection n={4} title="Uso aceitável">
        <p>Você concorda em não utilizar a Plataforma para fins ilícitos, enviar conteúdo ofensivo ou spam, tentar acessar dados de outras contas, ou comprometer a segurança e o funcionamento do Serviço.</p>
        <p>Os dados de clientes finais inseridos por você devem ter base legal adequada e ser usados apenas para a operação da sua barbearia, respeitando a LGPD.</p>
      </LegalSection>

      <LegalSection n={5} title="Conteúdo e dados do Gestor">
        <p>Os dados que você insere (clientes, agendamentos, serviços, financeiro) permanecem seus. Concedemos a você acesso a esses dados enquanto a conta estiver ativa e, no encerramento, disponibilizamos exportação por um período razoável antes da exclusão definitiva.</p>
      </LegalSection>

      <LegalSection n={6} title="Disponibilidade e suporte">
        <p>Empregamos esforços comercialmente razoáveis para manter o Serviço disponível, mas ele é fornecido &quot;como está&quot;, podendo haver manutenções e interrupções. O suporte é prestado em português pelos canais indicados na Plataforma.</p>
      </LegalSection>

      <LegalSection n={7} title="Limitação de responsabilidade">
        <p>Na máxima extensão permitida pela lei, o CORTIX não se responsabiliza por lucros cessantes ou danos indiretos decorrentes do uso ou da indisponibilidade do Serviço. A responsabilidade total fica limitada ao valor pago por você nos 3 meses anteriores ao evento.</p>
      </LegalSection>

      <LegalSection n={8} title="Rescisão">
        <p>Podemos suspender ou encerrar contas que violem estes Termos. Você pode encerrar sua conta a qualquer momento. Obrigações de pagamento acumuladas até o encerramento permanecem devidas.</p>
      </LegalSection>

      <LegalSection n={9} title="Alterações destes Termos">
        <p>Podemos atualizar estes Termos periodicamente. Mudanças relevantes serão comunicadas por e-mail ou na Plataforma com antecedência razoável. O uso continuado após a vigência implica concordância.</p>
      </LegalSection>

      <LegalSection n={10} title="Lei aplicável e foro">
        <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de <strong className="text-zinc-300">[CIDADE/UF]</strong> para dirimir controvérsias, salvo competência legal diversa.</p>
      </LegalSection>

      <LegalSection n={11} title="Contato">
        <p>Dúvidas sobre estes Termos: <strong className="text-zinc-300">[E-MAIL DE CONTATO]</strong>.</p>
      </LegalSection>
    </LegalShell>
  );
}
