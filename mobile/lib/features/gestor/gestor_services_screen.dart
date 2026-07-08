import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/photo_picker_tile.dart';
import 'gestor_repository.dart';

const _categoryLabels = {'HAIRCUT': 'Corte', 'BEARD': 'Barba', 'COMBO': 'Combo', 'TREATMENT': 'Tratamento'};
const _categoryDots = {
  'HAIRCUT': Color(0xFF60A5FA),
  'BEARD': Color(0xFFFBBF24),
  'COMBO': Color(0xFF34D399),
  'TREATMENT': Color(0xFFA78BFA),
};

class GestorServicesScreen extends StatefulWidget {
  const GestorServicesScreen({super.key});

  @override
  State<GestorServicesScreen> createState() => _GestorServicesScreenState();
}

class _GestorServicesScreenState extends State<GestorServicesScreen> {
  final _repository = GestorRepository();
  late Future<List<GestorService>> _future;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _future = _repository.services();
  }

  void _refresh() => setState(() => _future = _repository.services());

  Future<void> _openForm({GestorService? editing}) async {
    final nameCtrl = TextEditingController(text: editing?.name);
    final descCtrl = TextEditingController(text: editing?.description ?? '');
    final durationCtrl = TextEditingController(text: (editing?.duration ?? 30).toString());
    final priceCtrl = TextEditingController(text: (editing?.price ?? 0).toStringAsFixed(2));
    String category = editing?.category ?? 'HAIRCUT';
    String? image = editing?.image;

    final saved = await FormSheet.show(
      context,
      title: editing != null ? 'Editar serviço' : 'Novo serviço',
      submitLabel: editing != null ? 'Salvar alterações' : 'Criar serviço',
      onSubmit: () async {
        final duration = int.tryParse(durationCtrl.text) ?? 30;
        final price = double.tryParse(priceCtrl.text.replaceAll(',', '.')) ?? 0;
        if (nameCtrl.text.trim().isEmpty) throw Exception('Informe o nome do serviço.');
        if (editing != null) {
          await _repository.updateService(
            editing.id,
            name: nameCtrl.text.trim(),
            description: descCtrl.text.trim(),
            category: category,
            duration: duration,
            price: price,
            image: image,
          );
        } else {
          await _repository.createService(
            name: nameCtrl.text.trim(),
            description: descCtrl.text.trim().isEmpty ? null : descCtrl.text.trim(),
            category: category,
            duration: duration,
            price: price,
            image: image,
          );
        }
      },
      children: [
        StatefulBuilder(
          builder: (context, setSheetState) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const FieldLabel('Foto'),
              PhotoPickerTile(
                imageUrl: image,
                upload: _repository.uploadImage,
                placeholderIcon: Icons.content_cut,
                onChanged: (url) => setSheetState(() => image = url),
              ),
              const FieldLabel('Nome'),
              CortixField(controller: nameCtrl, hint: 'Ex: Corte Degradê'),
              const FieldLabel('Descrição'),
              CortixField(controller: descCtrl, hint: 'Opcional'),
              const FieldLabel('Categoria'),
              CortixChoiceRow(
                value: category,
                options: _categoryLabels.entries.map((e) => (e.key, e.value)).toList(),
                onChanged: (v) => setSheetState(() => category = v),
              ),
              const FieldLabel('Duração (min)'),
              CortixField(controller: durationCtrl, keyboardType: TextInputType.number),
              const FieldLabel('Preço (R\$)'),
              CortixField(controller: priceCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
            ],
          ),
        ),
      ],
    );
    if (saved == true) _refresh();
  }

  Future<void> _toggleActive(GestorService s) async {
    await _repository.updateService(s.id, isActive: !s.isActive);
    _refresh();
  }

  Future<void> _delete(GestorService s) async {
    final palette = AppPalette.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: palette.surface,
        title: Text('Excluir serviço', style: TextStyle(color: palette.textPrimary)),
        content: Text('Excluir "${s.name}"? Essa ação não pode ser desfeita.', style: TextStyle(color: palette.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Excluir', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );
    if (confirmed == true) {
      await _repository.deleteService(s.id);
      _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Serviços'), elevation: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(),
        backgroundColor: accent,
        icon: Icon(Icons.add, color: contrastingTextColor(accent)),
        label: Text('Novo serviço', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<GestorService>>(
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
            final filtered = _filter == 'all' ? all : all.where((s) => s.category == _filter).toList();
            final groups = _categoryLabels.keys
                .map((key) => (key, filtered.where((s) => s.category == key).toList()))
                .where((g) => g.$2.isNotEmpty)
                .toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
              children: [
                Text('${all.where((s) => s.isActive).length} ativos de ${all.length}', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                const SizedBox(height: 12),
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _FilterChip(label: 'Todos', selected: _filter == 'all', onTap: () => setState(() => _filter = 'all'), palette: palette, accent: accent),
                      ..._categoryLabels.entries.map((e) => Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: _FilterChip(label: e.value, selected: _filter == e.key, onTap: () => setState(() => _filter = e.key), palette: palette, accent: accent),
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                if (groups.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 40),
                    child: Center(child: Text('Nenhum serviço cadastrado ainda.', style: TextStyle(color: palette.textFaint))),
                  ),
                ...groups.map((g) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(width: 8, height: 8, decoration: BoxDecoration(color: _categoryDots[g.$1], shape: BoxShape.circle)),
                              const SizedBox(width: 8),
                              Text(_categoryLabels[g.$1]!, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ...g.$2.map((s) => RiseIn(
                                child: Opacity(
                                  opacity: s.isActive ? 1 : 0.5,
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 42,
                                          height: 42,
                                          decoration: BoxDecoration(
                                            color: palette.surfaceAlt,
                                            borderRadius: BorderRadius.circular(10),
                                            image: resolveAssetUrl(s.image) != null ? DecorationImage(image: NetworkImage(resolveAssetUrl(s.image)!), fit: BoxFit.cover) : null,
                                          ),
                                          child: resolveAssetUrl(s.image) == null ? Icon(Icons.content_cut, size: 16, color: palette.textFaint) : null,
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(s.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis),
                                              Text('${s.duration}min · R\$ ${s.price.toStringAsFixed(2)}', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                                            ],
                                          ),
                                        ),
                                        IconButton(
                                          onPressed: () => _toggleActive(s),
                                          icon: Icon(Icons.power_settings_new_rounded, size: 19, color: s.isActive ? Colors.green : palette.textFaint),
                                          tooltip: s.isActive ? 'Desativar' : 'Ativar',
                                        ),
                                        IconButton(
                                          onPressed: () => _openForm(editing: s),
                                          icon: Icon(Icons.edit_outlined, size: 18, color: palette.textSecondary),
                                        ),
                                        IconButton(
                                          onPressed: () => _delete(s),
                                          icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.redAccent),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              )),
                        ],
                      ),
                    )),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final AppPalette palette;
  final Color accent;

  const _FilterChip({required this.label, required this.selected, required this.onTap, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? accent.withValues(alpha: 0.18) : palette.surfaceAlt,
          borderRadius: BorderRadius.circular(20),
          border: selected ? Border.all(color: accent.withValues(alpha: 0.5)) : null,
        ),
        alignment: Alignment.center,
        child: Text(label, style: TextStyle(color: selected ? palette.textPrimary : palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
