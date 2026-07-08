"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, AlertTriangle, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/apiClient";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PhotoUpload } from "@/components/dashboard/PhotoUpload";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface ApiProduct {
  id: string;
  name: string;
  image: string | null;
  brand: string | null;
  sku: string | null;
  price: number;
  costPrice: number | null;
  quantity: number;
  minQuantity: number;
  category: string | null;
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => apiGet<ApiProduct[]>("/api/products") });

  const createProduct = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModalOpen(false);
      setImage(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createProduct.mutate({
      name: form.get("name"),
      image: image || undefined,
      brand: form.get("brand") || undefined,
      sku: form.get("sku") || undefined,
      category: form.get("category") || undefined,
      price: Number(form.get("price")),
      costPrice: form.get("costPrice") ? Number(form.get("costPrice")) : undefined,
      quantity: Number(form.get("quantity")),
      minQuantity: Number(form.get("minQuantity")),
    });
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = products.filter((p) => p.quantity <= p.minQuantity);
  const totalValue = products.reduce((a, p) => a + (p.costPrice ?? 0) * p.quantity, 0);

  return (
    <div className="space-y-6">
      <FormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setImage(null); }}
        title="Novo produto"
        onSubmit={handleSubmit}
        isPending={createProduct.isPending}
        error={createProduct.error?.message}
        submitLabel="Criar produto"
      >
        <div>
          <label className={labelCls}>Foto</label>
          <PhotoUpload value={image} onChange={setImage} shape="square" />
        </div>
        <div>
          <label className={labelCls}>Nome</label>
          <input name="name" required className={fieldCls} placeholder="Ex: Pomada Cabelo Black" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Marca</label>
            <input name="brand" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>SKU</label>
            <input name="sku" className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <input name="category" className={fieldCls} placeholder="Finalizadores" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Preço de venda (R$)</label>
            <input name="price" type="number" min={0} step="0.01" required className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Preço de custo (R$)</label>
            <input name="costPrice" type="number" min={0} step="0.01" className={fieldCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Quantidade</label>
            <input name="quantity" type="number" min={0} defaultValue={0} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Estoque mínimo</label>
            <input name="minQuantity" type="number" min={0} defaultValue={5} className={fieldCls} />
          </div>
        </div>
      </FormModal>

      <PageHeader
        icon={Package}
        title="Estoque"
        subtitle={`${products.length} produtos cadastrados`}
        action={
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" />
            Novo produto
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <Package className="w-6 h-6 text-blue-400 mb-3" />
          <p className="text-2xl font-bold text-white">{products.length}</p>
          <p className="text-sm text-zinc-500">Produtos</p>
        </div>
        <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-5">
          <AlertTriangle className="w-6 h-6 text-amber-400 mb-3" />
          <p className="text-2xl font-bold text-amber-400">{lowStock.length}</p>
          <p className="text-sm text-zinc-500">Estoque baixo</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-2">Valor em estoque</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
          <p className="text-sm text-zinc-500">Custo total</p>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-400">Atenção: {lowStock.length} produtos com estoque baixo</p>
            <p className="text-xs text-zinc-500 mt-1">
              {lowStock.map((p) => p.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">Produto</th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Preço</th>
                <th className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Estoque</th>
                <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((product) => {
                const isLow = product.quantity <= product.minQuantity;
                return (
                  <tr key={product.id} className={`hover:bg-white/2 transition-colors ${isLow ? "bg-amber-500/2" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-zinc-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{product.name}</p>
                          <p className="text-xs text-zinc-500">{[product.brand, product.sku].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                        {product.category ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-medium text-amber-400">{formatCurrency(product.price)}</p>
                      {product.costPrice != null && <p className="text-xs text-zinc-600">custo: {formatCurrency(product.costPrice)}</p>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isLow ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-green-500/10 text-green-400 border border-green-500/30"}`}>
                        {isLow && <AlertTriangle className="w-3 h-3" />}
                        {product.quantity} un
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right hidden sm:table-cell">
                      <p className="text-sm font-medium text-white">{formatCurrency((product.costPrice ?? 0) * product.quantity)}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              Nenhum produto cadastrado ainda
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
