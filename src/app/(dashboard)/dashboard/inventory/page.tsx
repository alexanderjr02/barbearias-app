"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, AlertTriangle, Package, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PhotoUpload } from "@/components/dashboard/PhotoUpload";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NumberStepper } from "@/components/dashboard/NumberStepper";

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
  const [selling, setSelling] = useState<ApiProduct | null>(null);
  // Produto em edicao: o mesmo formulario cria e edita, entao o gestor nao
  // aprende duas telas pra mesma coisa.
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiProduct | null>(null);
  const [sellQty, setSellQty] = useState(1);
  // Quantidades do form de novo produto, controladas, para o NumberStepper.
  const [newQty, setNewQty] = useState(0);
  const [newMinQty, setNewMinQty] = useState(5);
  const queryClient = useQueryClient();

  const openNewProduct = () => {
    setEditing(null);
    setNewQty(0);
    setNewMinQty(5);
    setImage(null);
    setModalOpen(true);
  };

  const openEditProduct = (product: ApiProduct) => {
    setEditing(product);
    setNewQty(product.quantity);
    setNewMinQty(product.minQuantity);
    setImage(product.image);
    setModalOpen(true);
  };

  const fecharForm = () => { setModalOpen(false); setEditing(null); setImage(null); };

  const sellProduct = useMutation({
    mutationFn: ({ id, quantity, paymentMethod }: { id: string; quantity: number; paymentMethod: string }) =>
      apiPost(`/api/products/${id}/sell`, { quantity, paymentMethod }),
    onSuccess: () => {
      // Invalida o financeiro junto: a venda virou receita lá, e deixar a
      // outra tela com número velho é como o gestor perde a confiança no
      // sistema, ele confere, não bate, e volta pra planilha.
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      toast.success("Venda registrada e lançada no financeiro");
      setSelling(null);
    },
  });

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => apiGet<ApiProduct[]>("/api/products") });

  const saveProduct = useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: Record<string, unknown> }) =>
      id ? apiPatch(`/api/products/${id}`, data) : apiPost("/api/products", data),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(vars.id ? "Produto atualizado" : "Produto criado");
      fecharForm();
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto excluído");
      setConfirmDelete(null);
      fecharForm();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveProduct.mutate({
      id: editing?.id ?? null,
      data: {
        name: form.get("name"),
        // Editando, mandamos null pra limpar de fato quando ele apaga a foto —
        // undefined faria o servidor manter a antiga.
        image: image || (editing ? null : undefined),
        brand: form.get("brand") || null,
        sku: form.get("sku") || null,
        category: form.get("category") || null,
        price: Number(form.get("price")),
        costPrice: form.get("costPrice") ? Number(form.get("costPrice")) : null,
        quantity: newQty,
        minQuantity: newMinQty,
      },
    });
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSell = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selling) return;
    const form = new FormData(e.currentTarget);
    sellProduct.mutate({
      id: selling.id,
      quantity: Number(form.get("sellQuantity")),
      paymentMethod: String(form.get("sellPayment") || "DINHEIRO"),
    });
  };

  const lowStock = products.filter((p) => p.quantity <= p.minQuantity);
  const totalValue = products.reduce((a, p) => a + (p.costPrice ?? 0) * p.quantity, 0);

  return (
    <div className="space-y-6">
      <FormModal
        key={editing?.id ?? "novo"}
        open={modalOpen}
        onClose={fecharForm}
        title={editing ? "Editar produto" : "Novo produto"}
        onSubmit={handleSubmit}
        isPending={saveProduct.isPending}
        error={saveProduct.error?.message}
        submitLabel={editing ? "Salvar alterações" : "Criar produto"}
        footerExtra={
          editing ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(editing)}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          ) : undefined
        }
      >
        <div>
          <label className={labelCls}>Foto</label>
          <PhotoUpload value={image} onChange={setImage} shape="square" />
        </div>
        <div>
          <label className={labelCls}>Nome</label>
          <input name="name" required defaultValue={editing?.name ?? ""} className={fieldCls} placeholder="Ex: Pomada Cabelo Black" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Marca</label>
            <input name="brand" defaultValue={editing?.brand ?? ""} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>SKU</label>
            <input name="sku" defaultValue={editing?.sku ?? ""} className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <input name="category" defaultValue={editing?.category ?? ""} className={fieldCls} placeholder="Finalizadores" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Preço de venda (R$)</label>
            <input name="price" type="number" min={0} step="0.01" required defaultValue={editing?.price ?? ""} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Preço de custo (R$)</label>
            <input name="costPrice" type="number" min={0} step="0.01" defaultValue={editing?.costPrice ?? ""} className={fieldCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Quantidade</label>
            <NumberStepper value={newQty} onChange={setNewQty} min={0} />
          </div>
          <div>
            <label className={labelCls}>Estoque mínimo</label>
            <NumberStepper value={newMinQty} onChange={setNewMinQty} min={0} />
          </div>
        </div>
      </FormModal>

      <FormModal
        open={!!selling}
        onClose={() => setSelling(null)}
        title={selling ? `Vender ${selling.name}` : "Vender"}
        onSubmit={handleSell}
        isPending={sellProduct.isPending}
        error={sellProduct.error?.message}
        submitLabel="Registrar venda"
      >
        {selling && (
          <>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3.5 py-3">
              <span className="text-xs text-zinc-500">Em estoque</span>
              <span className="text-sm font-bold text-white">
                {selling.quantity} {selling.quantity === 1 ? "unidade" : "unidades"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Quantidade</label>
                <NumberStepper name="sellQuantity" value={sellQty} onChange={setSellQty} min={1} max={selling.quantity} />
              </div>
              <div>
                <label className={labelCls}>Pagamento</label>
                <select name="sellPayment" defaultValue="DINHEIRO" className={fieldCls}>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão</option>
                </select>
              </div>
            </div>
            {/* O total aparece antes de confirmar: é o número que o gestor vai
                cobrar do cliente na hora, e conferir depois no financeiro. */}
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-3">
              <span className="text-xs text-zinc-400">Total a cobrar</span>
              <span className="text-lg font-black text-emerald-400">
                {formatCurrency(selling.price * Math.min(Math.max(sellQty, 1), selling.quantity))}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-600">
              Baixa o estoque e lança a receita no Financeiro na mesma ação.
            </p>
          </>
        )}
      </FormModal>

      <FormModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Excluir produto"
        onSubmit={(e) => { e.preventDefault(); if (confirmDelete) deleteProduct.mutate(confirmDelete.id); }}
        isPending={deleteProduct.isPending}
        error={deleteProduct.error?.message}
        submitLabel="Excluir definitivamente"
        submitTone="danger"
      >
        {confirmDelete && (
          <>
            <p className="text-sm text-zinc-300">
              Excluir <span className="font-bold text-white">{confirmDelete.name}</span> do estoque?
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              As vendas já registradas continuam no Financeiro, o histórico não muda. Só o produto sai da lista.
            </p>
            {confirmDelete.quantity > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                <p className="text-xs text-zinc-300">
                  Ainda há <span className="font-bold text-white">{confirmDelete.quantity} em estoque</span>. Se for só uma pausa
                  na venda, editar e zerar a quantidade preserva o produto.
                </p>
              </div>
            )}
          </>
        )}
      </FormModal>

      <PageHeader
        icon={Package}
        title="Estoque"
        subtitle={`${products.length} produtos cadastrados`}
        action={
          <button onClick={openNewProduct} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-zinc-950 text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors">
            <Plus className="w-4 h-4" />
            Novo produto
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <Package className="w-6 h-6 text-zinc-400 mb-3" />
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
                <th className="px-4 py-3" />
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
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isLow ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"}`}>
                        {isLow && <AlertTriangle className="w-3 h-3" />}
                        {product.quantity} un
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right hidden sm:table-cell">
                      <p className="text-sm font-medium text-white">{formatCurrency((product.costPrice ?? 0) * product.quantity)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => { setSellQty(1); setSelling(product); }}
                        disabled={product.quantity < 1}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:bg-transparent disabled:hover:text-zinc-300"
                      >
                        Vender
                      </button>
                      <button
                        onClick={() => openEditProduct(product)}
                        title="Editar produto"
                        aria-label={`Editar ${product.name}`}
                        className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-400"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(product)}
                        title="Excluir produto"
                        aria-label={`Excluir ${product.name}`}
                        className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      </div>
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
