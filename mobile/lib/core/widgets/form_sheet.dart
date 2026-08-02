import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import 'rukz_date_picker.dart';

/// A bottom-sheet form scaffold shared by every "create/edit X" flow in the
/// Gestor app (services, products, staff, clients, transactions...) — mirrors
/// the web's `FormModal` component so every CRUD form gets the same busy /
/// error / submit behavior for free instead of each screen re-implementing it.
class FormSheet extends StatefulWidget {
  final String title;
  final List<Widget> children;
  final String submitLabel;
  final Future<void> Function() onSubmit;

  const FormSheet({
    super.key,
    required this.title,
    required this.children,
    required this.submitLabel,
    required this.onSubmit,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String title,
    required List<Widget> children,
    required String submitLabel,
    required Future<void> Function() onSubmit,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FormSheet(title: title, children: children, submitLabel: submitLabel, onSubmit: onSubmit),
    );
  }

  @override
  State<FormSheet> createState() => _FormSheetState();
}

class _FormSheetState extends State<FormSheet> {
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSubmit();
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.86,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(color: palette.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2))),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(widget.title, style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      icon: Icon(Icons.close, color: palette.textFaint),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                  children: widget.children,
                ),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12.5)),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: SizedBox(
                  height: 50,
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _busy ? null : _submit,
                    style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                    child: _busy
                        ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                        : Text(widget.submitLabel, style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Labeled section header used above each field/group inside a [FormSheet].
class FieldLabel extends StatelessWidget {
  final String text;
  const FieldLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6, top: 14),
      child: Text(text, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600)),
    );
  }
}

/// Styled [TextField] matching the app's dark-glass form language, themed via
/// [AppPalette] so it also works correctly in light mode.
class RukzField extends StatelessWidget {
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int maxLines;
  final List<TextInputFormatter>? inputFormatters;

  const RukzField({
    super.key,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.obscureText = false,
    this.maxLines = 1,
    this.inputFormatters,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      maxLines: maxLines,
      inputFormatters: inputFormatters,
      style: TextStyle(color: palette.textPrimary, fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
        filled: true,
        fillColor: palette.surfaceAlt,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      ),
    );
  }
}

/// Lista de itens curtos (bebidas, produtos de finalizacao) que o cliente ve
/// ao agendar.
///
/// Era um campo de texto "um por linha": o gestor digitava as cegas, sem saber
/// se o formato estava certo, e cada erro de digitacao virava uma opcao
/// estranha na tela do cliente. Aqui cada item vira uma etiqueta assim que ele
/// confirma — o que ele ve e exatamente o que o cliente vai ver.
///
/// Escreve de volta no mesmo [TextEditingController] (itens separados por
/// quebra de linha), entao a tela que salva nao muda em nada.
class TagListField extends StatefulWidget {
  final TextEditingController controller;
  final String? hint;

  /// Atalhos do ramo: um toque adiciona, sem digitar.
  final List<String> suggestions;

  const TagListField({super.key, required this.controller, this.hint, this.suggestions = const []});

  @override
  State<TagListField> createState() => _TagListFieldState();
}

class _TagListFieldState extends State<TagListField> {
  late List<String> _itens;
  final _rascunhoCtrl = TextEditingController();
  final _foco = FocusNode();

  @override
  void initState() {
    super.initState();
    _itens = _separa(widget.controller.text);
    // Sair do campo com texto pendente salva o item: ninguem deve perder o que
    // digitou por ter tocado fora antes de confirmar.
    _foco.addListener(() {
      if (!_foco.hasFocus) _adiciona(_rascunhoCtrl.text);
    });
  }

  @override
  void dispose() {
    _rascunhoCtrl.dispose();
    _foco.dispose();
    super.dispose();
  }

  static List<String> _separa(String texto) =>
      texto.split(RegExp(r'[\n,;]')).map((t) => t.trim()).where((t) => t.isNotEmpty).toList();

  bool _jaTem(String valor) => _itens.any((i) => i.toLowerCase() == valor.toLowerCase());

  void _sincroniza() => widget.controller.text = _itens.join('\n');

  void _adiciona(String texto) {
    final novos = _separa(texto).where((t) => !_jaTem(t)).toList();
    if (novos.isEmpty && _rascunhoCtrl.text.isEmpty) return;
    setState(() {
      _itens.addAll(novos);
      _rascunhoCtrl.clear();
    });
    _sincroniza();
  }

  void _remove(int indice) {
    setState(() => _itens.removeAt(indice));
    _sincroniza();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final disponiveis = widget.suggestions.where((s) => !_jaTem(s)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(10, 9, 10, 9),
          decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
          child: Wrap(
            spacing: 7,
            runSpacing: 7,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              ..._itens.asMap().entries.map((e) => Container(
                    padding: const EdgeInsets.fromLTRB(11, 6, 6, 6),
                    decoration: BoxDecoration(
                      color: palette.surface,
                      borderRadius: BorderRadius.circular(9),
                      border: Border.all(color: palette.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(e.value, style: TextStyle(color: palette.textPrimary, fontSize: 13)),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () => _remove(e.key),
                          behavior: HitTestBehavior.opaque,
                          child: Padding(
                            padding: const EdgeInsets.all(2),
                            child: Icon(Icons.close_rounded, size: 14, color: palette.textFaint),
                          ),
                        ),
                      ],
                    ),
                  )),
              ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 120, maxWidth: 220),
                child: TextField(
                  controller: _rascunhoCtrl,
                  focusNode: _foco,
                  style: TextStyle(color: palette.textPrimary, fontSize: 13.5),
                  textInputAction: TextInputAction.done,
                  // O teclado confirma o item e continua aberto: o gestor
                  // cadastra a lista inteira sem sair do campo.
                  onSubmitted: (v) {
                    _adiciona(v);
                    _foco.requestFocus();
                  },
                  decoration: InputDecoration(
                    isDense: true,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 7),
                    hintText: _itens.isEmpty ? (widget.hint ?? 'Digite e confirme') : 'Adicionar...',
                    hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (disponiveis.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text('Sugestões:', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                ...disponiveis.map((s) => GestureDetector(
                      onTap: () => _adiciona(s),
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                        decoration: BoxDecoration(
                          color: palette.bg,
                          borderRadius: BorderRadius.circular(9),
                          border: Border.all(color: palette.border),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.add_rounded, size: 13, color: accent),
                            const SizedBox(width: 3),
                            Text(s, style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                          ],
                        ),
                      ),
                    )),
              ],
            ),
          ),
      ],
    );
  }
}

/// Formats a date as the "YYYY-MM-DD" key the API expects (matching native
/// `<input type="date">` on the web), or null when no date was chosen.
String? formatDobKey(DateTime? date) {
  if (date == null) return null;
  return '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

/// A tappable date field matching [RukzField], backed by a [ValueNotifier]
/// so the parent form can read the chosen date without managing its own state.
/// Used for the client's birthday in the gestor/barber "cadastrar cliente"
/// flows (birthday marketing) and anywhere else a date is collected.
class RukzDateField extends StatelessWidget {
  final ValueNotifier<DateTime?> value;
  final String hint;

  const RukzDateField({super.key, required this.value, this.hint = 'Selecionar'});

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final current = value.value;
    final picked = await showRukzDatePicker(
      context: context,
      initialDate: current ?? DateTime(now.year - 20, now.month, now.day),
      firstDate: DateTime(now.year - 120),
      lastDate: now,
      title: 'Data de nascimento',
    );
    if (picked != null) value.value = picked;
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return ValueListenableBuilder<DateTime?>(
      valueListenable: value,
      builder: (context, date, _) {
        final label = date == null
            ? hint
            : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
        return InkWell(
          onTap: () => _pick(context),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: palette.surfaceAlt,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.cake_outlined, size: 18, color: palette.textFaint),
                const SizedBox(width: 10),
                Text(
                  label,
                  style: TextStyle(color: date == null ? palette.textFaint : palette.textPrimary, fontSize: 14),
                ),
                const Spacer(),
                Icon(Icons.calendar_today_outlined, size: 16, color: palette.textFaint),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// A segmented single-select row of chips, used for category/type pickers.
class RukzChoiceRow extends StatelessWidget {
  final List<(String value, String label)> options;
  final String value;
  final ValueChanged<String> onChanged;

  const RukzChoiceRow({super.key, required this.options, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((o) {
        final selected = o.$1 == value;
        return GestureDetector(
          onTap: () => onChanged(o.$1),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            decoration: BoxDecoration(
              color: selected ? accent.withValues(alpha: 0.18) : palette.surfaceAlt,
              borderRadius: BorderRadius.circular(20),
              border: selected ? Border.all(color: accent.withValues(alpha: 0.5)) : null,
            ),
            child: Text(o.$2, style: TextStyle(color: selected ? accent : palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600)),
          ),
        );
      }).toList(),
    );
  }
}
