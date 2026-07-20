"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Scissors, Clock, Pencil, Trash2, Power } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/apiClient";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PhotoUpload } from "@/components/dashboard/PhotoUpload";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface ApiService {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  category: string;
  duration: number;
  price: number;
  cost?: number;
  isActive: boolean;
  appointmentsCount: number;
}

const categoryDot: Record<string, string> = {
  HAIRCUT: "bg-blue-400",
  BEARD: "bg-amber-400",
  COMBO: "bg-emerald-400",
  TREATMENT: "bg-purple-400",
};

const categoryLabels: Record<string, string> = {
  HAIRCUT: "Corte",
  BEARD: "Barba",
  COMBO: "Combo",
  TREATMENT: "Tratamento",
};

export default function ServicesPage() {
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiService | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({ queryKey: ["services"], queryFn: () => apiGet<ApiService[]>("/api/services") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["services"] });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiPatch(`/api/services/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  const createService = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/api/services", data),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
  });

  const updateService = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiPatch(`/api/services/${id}`, data),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setEditing(null);
    },
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/services/${id}`),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setImage(null);
    setModalOpen(true);
  };

  const openEdit = (service: ApiService) => {
    setEditing(service);
    setImage(service.image);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name"),
      description: form.get("description") || undefined,
      category: form.get("category"),
      duration: Number(form.get("duration")),
      price: Number(form.get("price")),
      cost: Number(form.get("cost") ?? 0),
      image,
    };
    if (editing) {
      updateService.mutate({ id: editing.id, data });
    } else {
      createService.mutate(data);
    }
  };

  const filtered = items.filter((s) => filter === "all" || s.category === filter);
  const activeMutation = editing ? updateService : createService;
  const avgPrice = items.length > 0 ? items.reduce((a, s) => a + s.price, 0) / items.length : 0;

  return (
    <div className="space-y-6">
      <FormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); setImage(null); }}
        title={editing ? "Editar serviço" : "Novo serviço"}
        onSubmit={handleSubmit}
        isPending={activeMutation.isPending}
        error={activeMutation.error?.message}
        submitLabel={editing ? "Salvar alterações" : "Criar serviço"}
      >
        <div>
          <label className={labelCls}>Foto</label>
          <PhotoUpload value={image} onChange={setImage} shape="square" />
        </div>
        <div>
          <label className={labelCls}>Nome</label>
          <input name="name" required defaultValue={editing?.name} className={fieldCls} placeholder="Ex: Corte Degradê" />
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <input name="description" defaultValue={editing?.description ?? ""} className={fieldCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Categoria</label>
            <select name="category" defaultValue={editing?.category ?? "HAIRCUT"} className={fieldCls}>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Duração (min)</label>
            <input name="duration" type="number" min={5} required defaultValue={editing?.duration ?? 30} className={fieldCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Preço (R$)</label>
            <input name="price" type="number" min={0} step="0.01" required defaultValue={editing?.price ?? 0} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Custo (R$)</label>
            <input name="cost" type="number" min={0} step="0.01" defaultValue={editing?.cost ?? 0} className={fieldCls} />
            {/* Sem custo, o sistema só sabe faturamento — nunca lucro. */}
            <p className="text-[11px] text-zinc-600 mt-1">Produto gasto, lâmina, toalha. Destrava a margem real.</p>
          </div>
        </div>
      </FormModal>

      <PageHeader
        icon={Scissors}
        title="Serviços"
        subtitle={`${items.filter((s) => s.isActive).length} ativos de ${items.length} · ticket médio ${formatCurrency(avgPrice)}`}
        action={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" />
            Novo serviço
          </button>
        }
      />

      {/* Category filter — segmented control */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
            filter === "all" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Todos <span className="opacity-60">· {items.length}</span>
        </button>
        {Object.entries(categoryLabels).map(([key, label]) => {
          const count = items.filter((s) => s.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "all" : key)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                filter === key ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {label} <span className="opacity-60">· {count}</span>
            </button>
          );
        })}
      </div>

      {/* Catalog */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-500 bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl">
          <Scissors className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
          Nenhum serviço cadastrado ainda
        </div>
      )}
      <div className="space-y-6">
        {Object.entries(categoryLabels)
          .map(([key, label]) => ({ key, label, list: filtered.filter((s) => s.category === key) }))
          .filter((g) => g.list.length > 0)
          .map((group) => (
            <div key={group.key} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", categoryDot[group.key] ?? categoryDot.HAIRCUT)} />
                  <h3 className="text-sm font-bold text-white">{group.label}</h3>
                  <span className="text-xs text-zinc-600">{group.list.length}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  a partir de {formatCurrency(Math.min(...group.list.map((s) => s.price)))}
                </span>
              </div>
              <div className="divide-y divide-zinc-800/80">
                {group.list.map((service) => (
                  <div key={service.id} className={cn("flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]", !service.isActive && "opacity-50")}>
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      {service.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      ) : (
                        <Scissors className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{service.name}</p>
                        {!service.isActive && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 flex-shrink-0">Inativo</span>}
                      </div>
                      {service.description && <p className="text-xs text-zinc-500 truncate mt-0.5">{service.description}</p>}
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 flex-shrink-0 w-16">
                      <Clock className="w-3.5 h-3.5 text-zinc-600" /> {service.duration}min
                    </div>
                    <div className="hidden lg:block text-xs text-zinc-600 flex-shrink-0 w-24 text-right">{service.appointmentsCount} realizados</div>
                    <div className="text-sm font-bold text-amber-400 flex-shrink-0 w-20 text-right">{formatCurrency(service.price)}</div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => toggleActive.mutate({ id: service.id, isActive: !service.isActive })}
                        disabled={toggleActive.isPending}
                        title={service.isActive ? "Desativar" : "Ativar"}
                        className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", service.isActive ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-600 hover:bg-zinc-800")}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(service)} title="Editar" className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${service.name}"?`)) deleteService.mutate(service.id);
                        }}
                        disabled={deleteService.isPending}
                        title="Excluir"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
