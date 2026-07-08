import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

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

  // Create platform super-admin (for /admin panel access)
  const superAdminPassword = await bcrypt.hash("admin123456", 10);
  await prisma.user.upsert({
    where: { email: "admin@cortix.app" },
    update: {},
    create: {
      name: "Admin Cortix",
      email: "admin@cortix.app",
      password: superAdminPassword,
      role: "SUPER_ADMIN",
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

  // Create services (guarded so re-running the seed doesn't duplicate them)
  const existingServiceCount = await prisma.service.count({ where: { barbershopId: barbershop.id } });
  if (existingServiceCount === 0) {
    await Promise.all([
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
  }

  // Create staff (guarded so re-running the seed doesn't duplicate them)
  const existingStaffCount = await prisma.staff.count({ where: { barbershopId: barbershop.id } });
  if (existingStaffCount === 0) {
    await prisma.staff.create({
      data: {
        name: "Carlos Souza",
        role: "BARBER",
        specialties: "Degradê, Navalhado",
        commissionRate: 0.40,
        barbershopId: barbershop.id,
      },
    });
  }

  // Create working hours
  for (let day = 0; day <= 6; day++) {
    await prisma.workingHour.upsert({
      where: { barbershopId_dayOfWeek: { barbershopId: barbershop.id, dayOfWeek: day } },
      update: {},
      create: {
        dayOfWeek: day,
        openTime: "09:00",
        closeTime: day === 6 ? "18:00" : "20:00",
        isOpen: day !== 0,
        barbershopId: barbershop.id,
      },
    });
  }

  // --- Extra demo accounts, one per plan tier, so the Starter/Pro/White Label
  // experiences (and their gating) can each be logged into and shown directly. ---
  const starterUser = await prisma.user.upsert({
    where: { email: "demo.starter@cortix.app" },
    update: {},
    create: { name: "Ana Ferreira", email: "demo.starter@cortix.app", password: hashedPassword, role: "OWNER", phone: "(21) 98888-1111" },
  });
  const starterShop = await prisma.barbershop.upsert({
    where: { slug: "barbearia-ana" },
    update: {},
    create: {
      name: "Barbearia da Ana",
      slug: "barbearia-ana",
      description: "Barbearia de bairro, atendimento simples e rápido.",
      phone: "(21) 98888-1111",
      email: "contato@barbeariadaana.com",
      city: "Rio de Janeiro",
      state: "RJ",
      primaryColor: "#3B82F6",
      plan: "FREE",
      ownerId: starterUser.id,
    },
  });
  const starterServiceCount = await prisma.service.count({ where: { barbershopId: starterShop.id } });
  if (starterServiceCount === 0) {
    await prisma.service.create({ data: { name: "Corte Simples", duration: 30, price: 30, category: "HAIRCUT", barbershopId: starterShop.id } });
    await prisma.service.create({ data: { name: "Barba", duration: 20, price: 20, category: "BEARD", barbershopId: starterShop.id } });
    await prisma.staff.create({ data: { name: "Ana Ferreira", role: "BARBER", commissionRate: 0.4, barbershopId: starterShop.id } });
  }
  for (let day = 0; day <= 6; day++) {
    await prisma.workingHour.upsert({
      where: { barbershopId_dayOfWeek: { barbershopId: starterShop.id, dayOfWeek: day } },
      update: {},
      create: { dayOfWeek: day, openTime: "09:00", closeTime: day === 6 ? "17:00" : "19:00", isOpen: day !== 0, barbershopId: starterShop.id },
    });
  }

  const enterpriseUser = await prisma.user.upsert({
    where: { email: "demo.enterprise@cortix.app" },
    update: {},
    create: { name: "Marcos Andrade", email: "demo.enterprise@cortix.app", password: hashedPassword, role: "OWNER", phone: "(31) 97777-2222" },
  });
  const enterpriseShop = await prisma.barbershop.upsert({
    where: { slug: "rede-andrade" },
    update: {},
    create: {
      name: "Rede Andrade Barbershops",
      slug: "rede-andrade",
      description: "Rede com múltiplas unidades e app própria White Label.",
      phone: "(31) 97777-2222",
      email: "contato@redeandrade.com",
      city: "Belo Horizonte",
      state: "MG",
      primaryColor: "#8B5CF6",
      plan: "ENTERPRISE",
      ownerId: enterpriseUser.id,
    },
  });
  const enterpriseServiceCount = await prisma.service.count({ where: { barbershopId: enterpriseShop.id } });
  if (enterpriseServiceCount === 0) {
    await prisma.service.create({ data: { name: "Corte Simples", duration: 30, price: 40, category: "HAIRCUT", barbershopId: enterpriseShop.id } });
    await prisma.service.create({ data: { name: "Corte Degradê", duration: 45, price: 55, category: "HAIRCUT", barbershopId: enterpriseShop.id } });
    await prisma.service.create({ data: { name: "Corte + Barba", duration: 60, price: 70, category: "COMBO", barbershopId: enterpriseShop.id } });
    await prisma.staff.create({ data: { name: "Marcos Andrade", role: "BARBER", commissionRate: 0.45, barbershopId: enterpriseShop.id } });
    await prisma.staff.create({ data: { name: "Bianca Lima", role: "BARBER", commissionRate: 0.4, barbershopId: enterpriseShop.id } });
  }
  for (let day = 0; day <= 6; day++) {
    await prisma.workingHour.upsert({
      where: { barbershopId_dayOfWeek: { barbershopId: enterpriseShop.id, dayOfWeek: day } },
      update: {},
      create: { dayOfWeek: day, openTime: "08:00", closeTime: day === 6 ? "18:00" : "21:00", isOpen: true, barbershopId: enterpriseShop.id },
    });
  }

  console.log("✅ Seed concluído com sucesso!");
  console.log(`\n🔑 Login demo Pro (gestor):\n   E-mail: demo@cortix.app\n   Senha: demo123456`);
  console.log(`\n🔑 Login demo Starter (gestor):\n   E-mail: demo.starter@cortix.app\n   Senha: demo123456`);
  console.log(`\n🔑 Login demo White Label (gestor):\n   E-mail: demo.enterprise@cortix.app\n   Senha: demo123456`);
  console.log(`\n🔑 Login super admin:\n   E-mail: admin@cortix.app\n   Senha: admin123456`);

  await prisma.$disconnect();
}

main().catch(console.error);
