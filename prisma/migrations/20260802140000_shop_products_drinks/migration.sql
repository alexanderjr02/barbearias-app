-- Produtos de finalização e bebidas que a barbearia oferece, um por linha.
-- Antes as opções que o cliente via ao agendar eram fixas no app.
ALTER TABLE "Barbershop" ADD COLUMN "finishProducts" TEXT;
ALTER TABLE "Barbershop" ADD COLUMN "drinks" TEXT;
