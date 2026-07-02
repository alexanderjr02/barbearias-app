"use client";

import { useState } from "react";
import { Plus, Search, AlertTriangle, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const products = [
  { id: "1", name: "Pomada Cabelo Black", brand: "Arnica", sku: "ARN-001", price: 35, cost: 18, quantity: 24, minQuantity: 5, category: "Finalizadores" },
  { id: "2", name: "Óleo de Barba", brand: "Barbeador Pro", sku: "BBP-002", price: 45, cost: 22, quantity: 3, minQuantity: 5, category: "Barba" },
  { id: "3", name: "Shampoo Profissional 500ml", brand: "Wella", sku: "WEL-003", price: 55, cost: 28, quantity: 12, minQuantity: 3, category: "Cabelo" },
  { id: "4", name: "Condicionador 500ml", brand: "Wella", sku: "WEL-004", price: 50, cost: 25, quantity: 8, minQuantity: 3, category: "Cabelo" },
  { id: "5", name: "Navalha Descartável (cx 100)", brand: "Gillette", sku: "GIL-005", price: 85, cost: 60, quantity: 2, minQuantity: 3, category: "Ferramentas" },
  { id: "6", name: "Pente Profissional", brand: "Hercules", sku: "HER-006", price: 25, cost: 12, quantity: 15, minQuantity: 5, category: "Ferramentas" },
  { id: "7", name: "Gel para Cabelo 240g", brand: "Salon Line", sku: "SLN-007", price: 28, cost: 14, quantity: 20, minQuantity: 5, category: "Finalizadores" },
  { id: "8", name: "Tintura Cabelo #1 (Preto)", brand: "L'Oréal", sku: "LOR-008", price: 40, cost: 20, quantity: 1, minQuantity: 3, category: "Coloração" },
];

export default function InventoryPage() {
  const [search, setSearch] = useState("");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = products.filter((p) => p.quantity <= p.minQuantity);
  const totalValue = products.reduce((a, p) => a + p.cost * p.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Estoque</h1>
          <p className="text-zinc-500 text-sm mt-1">{products.length} produtos cadastrados</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-lg hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" />
          Novo produto
        </button>
      </div>

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
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="text-xs text-zinc-500">{product.brand} · {product.sku}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-medium text-amber-400">{formatCurrency(product.price)}</p>
                      <p className="text-xs text-zinc-600">custo: {formatCurrency(product.cost)}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isLow ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-green-500/10 text-green-400 border border-green-500/30"}`}>
                        {isLow && <AlertTriangle className="w-3 h-3" />}
                        {product.quantity} un
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right hidden sm:table-cell">
                      <p className="text-sm font-medium text-white">{formatCurrency(product.cost * product.quantity)}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
