import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seed script for development
async function main() {

  console.log("🌱 Iniciando seed do banco de dados...");

  // Create demo user
  const hashedPassword = await bcrypt.hash("demo123456", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@cortix.app" },
    update: {},
    create: {
      name: "João Silva",
      email: "demo@cortix.app",
      password: hashedPassword,
      role: "OWNER",
      phone: "(11) 99999-9999",
    },
  });

  // Create barbershop
  const barbershop = await prisma.barbershop.upsert({
    where: { slug: "barbearia-do-joao" },
    update: {},
    create: {
      name: "Barbearia do João",
      slug: "barbearia-do-joao",
      description: "Especialistas em corte degradê e barba. +15 anos de experiência.",
      phone: "(11) 99999-9999",
      email: "contato@barbearia.com",
      address: "Rua das Barbearias, 123",
      city: "São Paulo",
      state: "SP",
      primaryColor: "#D4AF37",
      plan: "PRO",
      ownerId: user.id,
    },
  });

  // Create services
  const services = await Promise.all([
    prisma.service.create({
      data: { name: "Corte Simples", duration: 30, price: 35, category: "HAIRCUT", barbershopId: barbershop.id },
    }),
    prisma.service.create({
      data: { name: "Corte Degradê", duration: 45, price: 45, category: "HAIRCUT", barbershopId: barbershop.id },
    }),
    prisma.service.create({
      data: { name: "Corte + Barba", duration: 60, price: 55, category: "COMBO", barbershopId: barbershop.id },
    }),
    prisma.service.create({
      data: { name: "Barba Completa", duration: 30, price: 25, category: "BEARD", barbershopId: barbershop.id },
    }),
  ]);

  // Create staff
  const staff = await prisma.staff.create({
    data: {
      name: "Carlos Souza",
      role: "BARBER",
      specialties: "Degradê, Navalhado",
      commissionRate: 0.40,
      barbershopId: barbershop.id,
    },
  });

  // Create working hours
  for (let day = 0; day <= 6; day++) {
    await prisma.workingHour.create({
      data: {
        dayOfWeek: day,
        openTime: "09:00",
        closeTime: day === 6 ? "18:00" : "20:00",
        isOpen: day !== 0,
        barbershopId: barbershop.id,
      },
    });
  }

  console.log("✅ Seed concluído com sucesso!");
  console.log(`\n🔑 Login demo:\n   E-mail: demo@cortix.app\n   Senha: demo123456`);

  await prisma.$disconnect();
}

main().catch(console.error);
