"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Search, UserPlus, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { cn, formatDateTime } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  SUPPORT_ADMIN: "Admin de Suporte",
  OWNER: "Dono",
  MANAGER: "Gerente",
  BARBER: "Barbeiro",
  CLIENT: "Cliente",
};

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  barbershopName: string | null;
}

interface ListResponse {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter, page],
    queryFn: () => apiGet<ListResponse>(`/api/admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}&page=${page}&pageSize=${pageSize}`),
    placeholderData: (prev) => prev,
  });

  const toggleActive = async (user: UserRow) => {
    await apiPatch(`/api/admin/users/${user.id}`, { isActive: !user.isActive });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiPost("/api/admin/users", {
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
      });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar administrador");
    } finally {
      setCreating(false);
    }
  };

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Users}
        title="Usuários"
        subtitle="Todos os usuários da plataforma, de qualquer barbearia"
        accent="mono"
        action={
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-3.5 py-2 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/15 transition-colors">
            <UserPlus className="w-4 h-4" /> Novo administrador
          </button>
        }
      />

      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo administrador"
        onSubmit={handleCreate}
        submitLabel="Criar administrador"
        isPending={creating}
        error={createError}
      >
        <div>
          <label className={labelCls}>Nome</label>
          <input name="name" required className={fieldCls} placeholder="Nome completo" />
        </div>
        <div>
          <label className={labelCls}>E-mail</label>
          <input name="email" type="email" required className={fieldCls} placeholder="email@exemplo.com" />
        </div>
        <div>
          <label className={labelCls}>Senha</label>
          <input name="password" type="password" required minLength={8} className={fieldCls} placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label className={labelCls}>Papel</label>
          <select name="role" defaultValue="SUPPORT_ADMIN" className={fieldCls}>
            <option value="SUPPORT_ADMIN">Admin de Suporte — só Dashboard, Analytics e Suporte</option>
            <option value="SUPER_ADMIN">Super Admin — acesso total</option>
          </select>
        </div>
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Admin de Suporte não acessa Barbearias, Usuários, Faturamento nem Configurações.
        </p>
      </FormModal>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar nome ou e-mail..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL", "SUPER_ADMIN", "SUPPORT_ADMIN", "OWNER", "MANAGER", "BARBER", "CLIENT"].map((f) => (
            <button
              key={f}
              onClick={() => {
                setRoleFilter(f);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                roleFilter === f ? "bg-white/15 border border-white/20 text-white" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300"
              )}
            >
              {f === "ALL" ? "Todos" : ROLE_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/30">
                {["Nome / E-mail", "Papel", "Barbearia", "Último login", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", u.role === "SUPER_ADMIN" ? "bg-white text-zinc-950" : u.role === "SUPPORT_ADMIN" ? "bg-white/15 text-white" : "bg-zinc-800 text-zinc-400")}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <p className="text-sm text-zinc-400">{u.barbershopName ?? "—"}</p>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <p className="text-xs text-zinc-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Nunca"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", u.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                      {u.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => toggleActive(u)} className="text-xs text-white hover:text-zinc-200 transition-colors">
                      {u.isActive ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>{users.length} de {total} usuários</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
