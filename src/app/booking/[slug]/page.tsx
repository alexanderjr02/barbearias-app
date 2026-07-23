import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { BookingWizard, type Shop } from "./BookingWizard";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";

// Always reflect the barbershop's current services/staff/hours.
export const dynamic = "force-dynamic";

async function getShop(slug: string): Promise<Shop | null> {
  const shop = await prisma.barbershop.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      // Usado para decidir se a marca CORTIX aparece (White Label = não).
      plan: true,
      description: true,
      phone: true,
      whatsapp: true,
      address: true,
      city: true,
      state: true,
      instagram: true,
      primaryColor: true,
      logo: true,
      coverImage: true,
      isActive: true,
      services: {
        where: { isActive: true },
        orderBy: { price: "asc" },
        select: { id: true, name: true, description: true, duration: true, price: true, category: true },
      },
      staff: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, role: true, specialties: true, avatar: true },
      },
    },
  });
  if (!shop || !shop.isActive) return null;
  // Strip isActive before handing to the client component.
  const { isActive: _isActive, ...rest } = shop;
  void _isActive;
  return rest;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return { title: "Barbearia não encontrada" };
  // No White Label a nossa marca não aparece em lugar nenhum — nem na aba do
  // navegador, nem no nome do app instalado. Nos demais planos, mantemos a
  // assinatura do CORTIX.
  const isWhiteLabel = shop.plan === "ENTERPRISE";
  return {
    title: isWhiteLabel ? `Agende na ${shop.name}` : `Agende na ${shop.name} · CORTIX`,
    description: shop.description ?? `Agende seu horário na ${shop.name} online, em segundos.`,
  };
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  // Origem de um link/QR rastreado por campanha (?ch=canal&c=campanha). Viaja
  // até o POST do agendamento para virar a origem do lead (atribuição).
  const sp = await searchParams;
  const channel = typeof sp.ch === "string" ? sp.ch : undefined;
  const campaign = typeof sp.c === "string" ? sp.c : undefined;
  const shop = await getShop(slug);
  if (!shop) notFound();
  return (
    <>
      <BookingWizard shop={shop} channel={channel} campaign={campaign} />
      {/* Sem este convite o app com a marca da barbearia praticamente não é
          instalado no iPhone, onde o processo é manual e escondido. */}
      <InstallAppPrompt shopName={shop.name} color={shop.primaryColor} slug={shop.slug} />
    </>
  );
}
