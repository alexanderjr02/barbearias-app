// Client-side data store using localStorage
// In production this would be replaced by a real database API

export interface Barbershop {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  city?: string;
  state?: string;
  instagram?: string;
  address?: string;
  description?: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  planExpiry?: string | null;
  primaryColor: string;
  logo?: string;
  coverImage?: string;
  createdAt: string;
  isActive: boolean;
  whatsapp?: string;
}

export interface StoreUser {
  id: string;
  name: string;
  email: string;
  password: string;
  barbershopId: string;
  role: "OWNER" | "BARBER";
  phone?: string;
}

// ─── Seed data (pre-loaded demo barbershops) ──────────────────────────────────

const SEED_SHOPS: Barbershop[] = [
  {
    id: "seed-1",
    name: "Barbearia do João",
    slug: "barbearia-do-joao",
    ownerName: "João Silva",
    ownerEmail: "demo@cortix.app",
    phone: "(11) 99999-9999",
    whatsapp: "(11) 99999-9999",
    city: "São Paulo",
    state: "SP",
    instagram: "@barbearia_joao",
    address: "Rua das Barbearias, 123",
    description: "Especialistas em corte degradê e barba. +15 anos de experiência.",
    plan: "PRO",
    planExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    primaryColor: "#D4AF37",
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "seed-2",
    name: "Barber Shop Premium",
    slug: "barber-shop-premium",
    ownerName: "Diego Ferreira",
    ownerEmail: "diego@barber.com",
    phone: "(21) 98888-7777",
    city: "Rio de Janeiro",
    state: "RJ",
    description: "Barbearia premium no coração do Rio.",
    plan: "ENTERPRISE",
    planExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    primaryColor: "#3B82F6",
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "seed-3",
    name: "Corte Perfeito",
    slug: "corte-perfeito",
    ownerName: "Rafael Santos",
    ownerEmail: "rafael@corte.com",
    phone: "(31) 97777-6666",
    city: "Belo Horizonte",
    state: "MG",
    plan: "FREE",
    planExpiry: null,
    primaryColor: "#10B981",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "seed-4",
    name: "Navalha de Ouro",
    slug: "navalha-de-ouro",
    ownerName: "Carlos Mendes",
    ownerEmail: "carlos@navalha.com",
    phone: "(41) 96666-5555",
    city: "Curitiba",
    state: "PR",
    plan: "PRO",
    planExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // expiring soon
    primaryColor: "#F59E0B",
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "seed-5",
    name: "Estilo & Tesoura",
    slug: "estilo-e-tesoura",
    ownerName: "Marcos Lima",
    ownerEmail: "marcos@estilo.com",
    phone: "(51) 95555-4444",
    city: "Porto Alegre",
    state: "RS",
    plan: "FREE",
    planExpiry: null,
    primaryColor: "#8B5CF6",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: false,
  },
];

const SEED_USERS: StoreUser[] = [
  {
    id: "seed-user-1",
    name: "João Silva",
    email: "demo@cortix.app",
    password: "demo123456",
    barbershopId: "seed-1",
    role: "OWNER",
    phone: "(11) 99999-9999",
  },
];

// ─── Store API ─────────────────────────────────────────────────────────────────

function isClient() {
  return typeof window !== "undefined";
}

function initStore() {
  if (!isClient()) return;
  if (!localStorage.getItem("cortix_barbershops")) {
    localStorage.setItem("cortix_barbershops", JSON.stringify(SEED_SHOPS));
  }
  if (!localStorage.getItem("cortix_users")) {
    localStorage.setItem("cortix_users", JSON.stringify(SEED_USERS));
  }
}

export const store = {
  // ── Barbershops ──────────────────────────────────────────────────────────────
  getBarbershops(): Barbershop[] {
    if (!isClient()) return SEED_SHOPS;
    initStore();
    try {
      const data = localStorage.getItem("cortix_barbershops");
      return data ? JSON.parse(data) : SEED_SHOPS;
    } catch {
      return SEED_SHOPS;
    }
  },

  getBarbershopById(id: string): Barbershop | null {
    return this.getBarbershops().find(s => s.id === id) ?? null;
  },

  getBarbershopBySlug(slug: string): Barbershop | null {
    return this.getBarbershops().find(s => s.slug === slug) ?? null;
  },

  saveBarbershop(shop: Barbershop): void {
    if (!isClient()) return;
    const shops = this.getBarbershops();
    const idx = shops.findIndex(s => s.id === shop.id);
    if (idx >= 0) shops[idx] = shop;
    else shops.push(shop);
    localStorage.setItem("cortix_barbershops", JSON.stringify(shops));
  },

  deleteBarbershop(id: string): void {
    if (!isClient()) return;
    const shops = this.getBarbershops().filter(s => s.id !== id);
    localStorage.setItem("cortix_barbershops", JSON.stringify(shops));
  },

  // ── Users ────────────────────────────────────────────────────────────────────
  getUsers(): StoreUser[] {
    if (!isClient()) return SEED_USERS;
    initStore();
    try {
      const data = localStorage.getItem("cortix_users");
      return data ? JSON.parse(data) : SEED_USERS;
    } catch {
      return SEED_USERS;
    }
  },

  getUserByEmail(email: string): StoreUser | null {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },

  saveUser(user: StoreUser): void {
    if (!isClient()) return;
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    localStorage.setItem("cortix_users", JSON.stringify(users));
  },

  // ── Session ──────────────────────────────────────────────────────────────────
  getSession(): { userId: string; barbershopId: string } | null {
    if (!isClient()) return null;
    try {
      const data = sessionStorage.getItem("cortix_session");
      if (data) return JSON.parse(data);
      // Fall back to last used barbershop
      const current = localStorage.getItem("cortix_current_shop");
      if (current) return { userId: "demo", barbershopId: current };
      return { userId: "seed-user-1", barbershopId: "seed-1" };
    } catch {
      return null;
    }
  },

  setSession(userId: string, barbershopId: string): void {
    if (!isClient()) return;
    sessionStorage.setItem("cortix_session", JSON.stringify({ userId, barbershopId }));
    localStorage.setItem("cortix_current_shop", barbershopId);
  },

  clearSession(): void {
    if (!isClient()) return;
    sessionStorage.removeItem("cortix_session");
    localStorage.removeItem("cortix_current_shop");
  },

  getCurrentShop(): Barbershop | null {
    const session = this.getSession();
    if (!session) return this.getBarbershopById("seed-1");
    return this.getBarbershopById(session.barbershopId);
  },

  /**
   * Seeds demo data for a newly created barbershop so the dashboard
   * looks realistic from day 1 during demos and presentations.
   */
  seedDemoData(shopId: string, ownerName: string): void {
    if (!isClient()) return;
    const first = ownerName.split(" ")[0] || "João";

    // ── Staff ──────────────────────────────────────────────────────────────────
    const staff = [
      { id: `${shopId}-s1`, name: first + " Silva", role: "Barbeiro Sênior", specialties: "Degradê, Navalhado", appointments: 145, revenue: 8700, commission: 40, rating: 4.9, avatar: first[0] + "S", isActive: true },
      { id: `${shopId}-s2`, name: "Carlos Souza", role: "Barbeiro", specialties: "Corte Clássico, Barba", appointments: 118, revenue: 6490, commission: 40, rating: 4.8, avatar: "CS", isActive: true },
      { id: `${shopId}-s3`, name: "André Santos", role: "Barbeiro", specialties: "Tratamentos, Coloração", appointments: 93, revenue: 5115, commission: 35, rating: 4.7, avatar: "AS", isActive: true },
    ];

    // ── Clients ────────────────────────────────────────────────────────────────
    const clients = [
      { id: `${shopId}-c1`, name: "Lucas Mendes", phone: "(11) 99999-0001", email: "lucas@email.com", visits: 24, totalSpent: 1320, lastVisit: "2026-07-01", favorite: "Corte + Barba", isVip: true },
      { id: `${shopId}-c2`, name: "Pedro Alves", phone: "(11) 99999-0002", email: "pedro@email.com", visits: 18, totalSpent: 810, lastVisit: "2026-06-28", favorite: "Corte Degradê", isVip: false },
      { id: `${shopId}-c3`, name: "Marcos Lima", phone: "(11) 99999-0003", email: "marcos@email.com", visits: 31, totalSpent: 1550, lastVisit: "2026-07-02", favorite: "Barba", isVip: true },
      { id: `${shopId}-c4`, name: "Felipe Costa", phone: "(11) 99999-0004", email: "felipe@email.com", visits: 8, totalSpent: 280, lastVisit: "2026-06-15", favorite: "Corte Simples", isVip: false },
      { id: `${shopId}-c5`, name: "Gabriel Rocha", phone: "(11) 99999-0005", email: "gabriel@email.com", visits: 45, totalSpent: 2475, lastVisit: "2026-07-01", favorite: "Corte + Barba", isVip: true },
      { id: `${shopId}-c6`, name: "Rafael Torres", phone: "(11) 99999-0006", email: "rafael@email.com", visits: 12, totalSpent: 540, lastVisit: "2026-06-20", favorite: "Tratamento", isVip: false },
      { id: `${shopId}-c7`, name: "Bruno Dias", phone: "(11) 99999-0007", email: "bruno@email.com", visits: 5, totalSpent: 150, lastVisit: "2026-06-01", favorite: "Corte Infantil", isVip: false },
      { id: `${shopId}-c8`, name: "Thiago Carvalho", phone: "(11) 99999-0008", email: "thiago@email.com", visits: 22, totalSpent: 1210, lastVisit: "2026-06-30", favorite: "Corte + Barba", isVip: true },
    ];

    // ── Appointments ───────────────────────────────────────────────────────────
    const today = new Date().toLocaleDateString("pt-BR");
    const appointments = [
      { id: `${shopId}-a1`, client: "Lucas Mendes", phone: "(11) 99999-0001", service: "Corte + Barba", barber: `${first} Silva`, date: today, time: "09:00", status: "COMPLETED", value: 55 },
      { id: `${shopId}-a2`, client: "Pedro Alves", phone: "(11) 99999-0002", service: "Corte Degradê", barber: "Carlos Souza", date: today, time: "10:00", status: "IN_PROGRESS", value: 45 },
      { id: `${shopId}-a3`, client: "Marcos Lima", phone: "(11) 99999-0003", service: "Barba", barber: `${first} Silva`, date: today, time: "11:00", status: "SCHEDULED", value: 25 },
      { id: `${shopId}-a4`, client: "Felipe Costa", phone: "(11) 99999-0004", service: "Corte Simples", barber: "André Santos", date: today, time: "11:30", status: "SCHEDULED", value: 35 },
      { id: `${shopId}-a5`, client: "Gabriel Rocha", phone: "(11) 99999-0005", service: "Corte + Barba", barber: "Carlos Souza", date: today, time: "14:00", status: "SCHEDULED", value: 55 },
      { id: `${shopId}-a6`, client: "Rafael Torres", phone: "(11) 99999-0006", service: "Tratamento", barber: "André Santos", date: today, time: "15:00", status: "SCHEDULED", value: 45 },
      { id: `${shopId}-a7`, client: "Thiago Carvalho", phone: "(11) 99999-0008", service: "Corte + Barba", barber: "Carlos Souza", date: today, time: "16:00", status: "SCHEDULED", value: 55 },
    ];

    localStorage.setItem(`cortix_demo_${shopId}`, JSON.stringify({ staff, clients, appointments, seeded: true }));
  },

  getDemoData(shopId: string) {
    if (!isClient()) return null;
    const data = localStorage.getItem(`cortix_demo_${shopId}`);
    if (data) return JSON.parse(data);
    // Return for seed-1 as well
    const fallback = localStorage.getItem("cortix_demo_seed-1");
    return fallback ? JSON.parse(fallback) : null;
  },
};
