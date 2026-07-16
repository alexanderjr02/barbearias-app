import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

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
class CortixField extends StatelessWidget {
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int maxLines;
  final List<TextInputFormatter>? inputFormatters;

  const CortixField({
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

/// Formats a date as the "YYYY-MM-DD" key the API expects (matching native
/// `<input type="date">` on the web), or null when no date was chosen.
String? formatDobKey(DateTime? date) {
  if (date == null) return null;
  return '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

/// A tappable date field matching [CortixField], backed by a [ValueNotifier]
/// so the parent form can read the chosen date without managing its own state.
/// Used for the client's birthday in the gestor/barber "cadastrar cliente"
/// flows (birthday marketing) and anywhere else a date is collected.
class CortixDateField extends StatelessWidget {
  final ValueNotifier<DateTime?> value;
  final String hint;

  const CortixDateField({super.key, required this.value, this.hint = 'Selecionar'});

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final current = value.value;
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime(now.year - 20, now.month, now.day),
      firstDate: DateTime(now.year - 120),
      lastDate: now,
      helpText: 'Data de nascimento',
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
class CortixChoiceRow extends StatelessWidget {
  final List<(String value, String label)> options;
  final String value;
  final ValueChanged<String> onChanged;

  const CortixChoiceRow({super.key, required this.options, required this.value, required this.onChanged});

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
