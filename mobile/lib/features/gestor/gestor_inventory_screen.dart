import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/rukz_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/photo_picker_tile.dart';
import 'gestor_repository.dart';
import '../../core/utils/moeda.dart';

class GestorInventoryScreen extends StatefulWidget {
  const GestorInventoryScreen({super.key});

  @override
  State<GestorInventoryScreen> createState() => _GestorInventoryScreenState();
}

class _GestorInventoryScreenState extends State<GestorInventoryScreen> {
  final _repository = GestorRepository();
  late Future<List<GestorProduct>> _future;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _future = _repository.products();
  }

  void _refresh() => setState(() => _future = _repository.products());

  Future<void> _openCreate() => _openForm();

  /// Mesmo formulário para criar e editar. Com [produto] preenchido, os campos
  /// já vêm com o que está salvo e o envio vira uma edição.
  Future<void> _openForm({GestorProduct? produto}) async {
    final editando = produto != null;
    final nameCtrl = TextEditingController(text: produto?.name ?? '');
    final brandCtrl = TextEditingController(text: produto?.brand ?? '');
    final skuCtrl = TextEditingController(text: produto?.sku ?? '');
    final categoryCtrl = TextEditingController(text: produto?.category ?? '');
    final priceCtrl = TextEditingController(text: produto != null ? produto.price.toStringAsFixed(2) : '');
    final costCtrl = TextEditingController(text: produto?.costPrice != null ? produto!.costPrice!.toStringAsFixed(2) : '');
    final qtyCtrl = TextEditingController(text: '${produto?.quantity ?? 0}');
    final minQtyCtrl = TextEditingController(text: '${produto?.minQuantity ?? 5}');
    String? image = produto?.image;

    final saved = await FormSheet.show(
      context,
      title: editando ? 'Editar produto' : 'Novo produto',
      submitLabel: editando ? 'Salvar' : 'Criar produto',
      onSubmit: () async {
        if (nameCtrl.text.trim().isEmpty) throw Exception('Informe o nome do produto.');
        final campos = (
          name: nameCtrl.text.trim(),
          image: image,
          brand: brandCtrl.text.trim().isEmpty ? null : brandCtrl.text.trim(),
          sku: skuCtrl.text.trim().isEmpty ? null : skuCtrl.text.trim(),
          category: categoryCtrl.text.trim().isEmpty ? null : categoryCtrl.text.trim(),
          price: double.tryParse(priceCtrl.text.replaceAll(',', '.')) ?? 0,
          costPrice: costCtrl.text.trim().isEmpty ? null : double.tryParse(costCtrl.text.replaceAll(',', '.')),
          quantity: int.tryParse(qtyCtrl.text) ?? 0,
          minQuantity: int.tryParse(minQtyCtrl.text) ?? 5,
        );
        if (editando) {
          await _repository.updateProduct(
            produto.id,
            name: campos.name,
            image: campos.image,
            brand: campos.brand,
            sku: campos.sku,
            category: campos.category,
            price: campos.price,
            costPrice: campos.costPrice,
            quantity: campos.quantity,
            minQuantity: campos.minQuantity,
          );
        } else {
          await _repository.createProduct(
            name: campos.name,
            image: campos.image,
            brand: campos.brand,
            sku: campos.sku,
            category: campos.category,
            price: campos.price,
            costPrice: campos.costPrice,
            quantity: campos.quantity,
            minQuantity: campos.minQuantity,
          );
        }
      },
      children: [
        StatefulBuilder(
          builder: (context, setSheetState) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const FieldLabel('Foto'),
              PhotoPickerTile(imageUrl: image, upload: _repository.uploadImage, placeholderIcon: Icons.inventory_2_outlined, onChanged: (url) => setSheetState(() => image = url)),
              const FieldLabel('Nome'),
              RukzField(controller: nameCtrl, hint: 'Ex: Pomada Cabelo Black'),
              const FieldLabel('Marca'),
              RukzField(controller: brandCtrl),
              const FieldLabel('SKU'),
              RukzField(controller: skuCtrl),
              const FieldLabel('Categoria'),
              RukzField(controller: categoryCtrl, hint: 'Finalizadores'),
              const FieldLabel('Preço de venda (R\$)'),
              RukzField(controller: priceCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
              const FieldLabel('Preço de custo (R\$)'),
              RukzField(controller: costCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
              const FieldLabel('Quantidade'),
              RukzField(controller: qtyCtrl, keyboardType: TextInputType.number),
              const FieldLabel('Estoque mínimo'),
              RukzField(controller: minQtyCtrl, keyboardType: TextInputType.number),
            ],
          ),
        ),
      ],
    );
    if (saved == true) _refresh();
  }

  /// Ações do produto (editar / excluir). Antes o card não respondia a toque
  /// nenhum: produto cadastrado errado ficava na lista pra sempre.
  Future<void> _openActions(GestorProduct produto) async {
    final palette = AppPalette.of(context);
    final acao = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(produto.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: Icon(Icons.edit_outlined, color: palette.textSecondary),
              title: Text('Editar produto', style: TextStyle(color: palette.textPrimary)),
              onTap: () => Navigator.of(sheet).pop('editar'),
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
              title: const Text('Excluir produto', style: TextStyle(color: Colors.redAccent)),
              onTap: () => Navigator.of(sheet).pop('excluir'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (!mounted || acao == null) return;
    if (acao == 'editar') {
      await _openForm(produto: produto);
      return;
    }
    // Excluir pede confirmação: é irreversível e o toque fica ao lado de editar.
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        backgroundColor: palette.surface,
        title: Text('Excluir produto', style: TextStyle(color: palette.textPrimary)),
        content: Text(
          'Remover "${produto.name}" do estoque? As vendas já registradas continuam no financeiro.',
          style: TextStyle(color: palette.textSecondary),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialog).pop(false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.of(dialog).pop(true),
            child: const Text('Excluir', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
    if (confirmado != true || !mounted) return;
    try {
      await _repository.deleteProduct(produto.id);
      if (!mounted) return;
      AppToast.success(context, 'Produto excluído.');
      _refresh();
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível excluir agora.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Estoque'), elevation: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        backgroundColor: accent,
        icon: Icon(Icons.add, color: contrastingTextColor(accent)),
        label: Text('Novo produto', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<GestorProduct>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(children: [
                const SizedBox(height: 80),
                Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent))),
              ]);
            }
            final all = snapshot.data ?? [];
            final lowStock = all.where((p) => p.quantity <= p.minQuantity).toList();
            final totalValue = all.fold<double>(0, (a, p) => a + (p.costPrice ?? 0) * p.quantity);
            final filtered = all
                .where((p) =>
                    _search.isEmpty ||
                    p.name.toLowerCase().contains(_search.toLowerCase()) ||
                    (p.brand ?? '').toLowerCase().contains(_search.toLowerCase()))
                .toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
              children: [
                Row(
                  children: [
                    Expanded(child: _StatCard(icon: Icons.inventory_2_outlined, iconColor: palette.textSecondary, value: '${all.length}', label: 'Produtos', palette: palette)),
                    const SizedBox(width: 10),
                    Expanded(child: _StatCard(icon: Icons.warning_amber_rounded, iconColor: kWarningColor, value: '${lowStock.length}', label: 'Estoque baixo', palette: palette)),
                  ],
                ),
                const SizedBox(height: 10),
                _StatCard(icon: Icons.payments_outlined, iconColor: palette.textSecondary, value: '${reais(totalValue)}', label: 'Valor em estoque (custo)', palette: palette, wide: true),
                if (lowStock.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.amber.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.amber.withValues(alpha: 0.25))),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${lowStock.length} produtos com estoque baixo', style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 12.5)),
                              Text(lowStock.map((p) => p.name).join(', '), style: TextStyle(color: palette.textFaint, fontSize: 11)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                TextField(
                  onChanged: (v) => setState(() => _search = v),
                  style: TextStyle(color: palette.textPrimary, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Buscar produto...',
                    hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
                    prefixIcon: Icon(Icons.search, color: palette.textFaint, size: 20),
                    filled: true,
                    fillColor: palette.surfaceAlt,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 30),
                    child: Center(child: Text('Nenhum produto encontrado.', style: TextStyle(color: palette.textFaint))),
                  ),
                ...filtered.map((p) {
                  final isLow = p.quantity <= p.minQuantity;
                  final img = resolveAssetUrl(p.image);
                  return RiseIn(
                    child: GestureDetector(
                      onTap: () => _openActions(p),
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: palette.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: isLow ? Border.all(color: Colors.amber.withValues(alpha: 0.3)) : null,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(10), image: img != null ? DecorationImage(image: NetworkImage(img), fit: BoxFit.cover) : null),
                            child: img == null ? Icon(Icons.inventory_2_outlined, size: 16, color: palette.textFaint) : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(p.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis),
                                Text([p.brand, p.sku].where((e) => e != null && e.isNotEmpty).join(' · '), style: TextStyle(color: palette.textFaint, fontSize: 11)),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('${reais(p.price)}', style: TextStyle(color: accent, fontWeight: FontWeight.bold, fontSize: 12.5)),
                              Container(
                                margin: const EdgeInsets.only(top: 3),
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (isLow ? Colors.amber : Colors.green).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text('${p.quantity} un', style: TextStyle(color: isLow ? Colors.amber : Colors.green, fontSize: 10.5, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.more_vert_rounded, size: 18, color: palette.textFaint),
                        ],
                      ),
                    ),
                    ),
                  );
                }),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String value;
  final String label;
  final AppPalette palette;
  final bool wide;

  const _StatCard({required this.icon, required this.iconColor, required this.value, required this.label, required this.palette, this.wide = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: wide ? double.infinity : null,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 11)),
        ],
      ),
    );
  }
}
