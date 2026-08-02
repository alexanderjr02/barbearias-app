-- Formas de cobrança aceitas por plano de assinatura. Sem isto o cliente via
-- sempre Pix e Cartão, mesmo numa barbearia que só recebe Pix.
ALTER TABLE "SubscriptionPlan" ADD COLUMN "paymentMethods" TEXT NOT NULL DEFAULT 'PIX,CREDIT_CARD';
