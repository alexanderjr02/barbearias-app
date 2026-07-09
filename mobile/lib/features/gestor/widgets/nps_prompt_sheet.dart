import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../gestor_repository.dart';

/// Mirrors the web NpsPrompt floating card: an occasional 0-10 satisfaction
/// check shown once /nps says shouldPrompt is true (server-side 30-day
/// cooldown, same rule as web — no local scheduling needed here).
class NpsPromptSheet extends StatefulWidget {
  final GestorRepository repository;

  const NpsPromptSheet({super.key, required this.repository});

  static Future<void> show(BuildContext context, {required GestorRepository repository}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      backgroundColor: Colors.transparent,
      builder: (_) => NpsPromptSheet(repository: repository),
    );
  }

  @override
  State<NpsPromptSheet> createState() => _NpsPromptSheetState();
}

class _NpsPromptSheetState extends State<NpsPromptSheet> {
  int? _score;
  final _commentController = TextEditingController();
  bool _busy = false;
  bool _submitted = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_score == null) return;
    setState(() => _busy = true);
    try {
      await widget.repository.submitNps(score: _score!, comment: _commentController.text.trim());
      if (mounted) setState(() => _submitted = true);
    } catch (_) {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(color: palette.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            if (_submitted) ...[
              Row(children: [
                Icon(Icons.favorite_rounded, color: accent, size: 20),
                const SizedBox(width: 8),
                Text('Valeu pelo retorno!', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
              ]),
              const SizedBox(height: 6),
              Text('Sua opinião ajuda a melhorar o CORTIX.', style: TextStyle(color: palette.textSecondary, fontSize: 13)),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Fechar'),
                ),
              ),
            ] else ...[
              Row(children: [
                Icon(Icons.emoji_emotions_outlined, color: accent, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('Como está sua experiência?', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 16))),
              ]),
              const SizedBox(height: 6),
              Text('De 0 a 10, o quanto você recomendaria o CORTIX para outro barbeiro?', style: TextStyle(color: palette.textSecondary, fontSize: 12.5)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List.generate(11, (n) {
                  final selected = _score == n;
                  return GestureDetector(
                    onTap: () => setState(() => _score = n),
                    child: Container(
                      width: 34,
                      height: 34,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: selected ? accent : palette.surfaceAlt,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('$n', style: TextStyle(color: selected ? onAccent : palette.textSecondary, fontWeight: FontWeight.w700, fontSize: 12.5)),
                    ),
                  );
                }),
              ),
              if (_score != null) ...[
                const SizedBox(height: 14),
                TextField(
                  controller: _commentController,
                  style: TextStyle(color: palette.textPrimary, fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: 'Algum comentário? (opcional)',
                    hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
                    filled: true,
                    fillColor: palette.surfaceAlt,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: (_score == null || _busy) ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: _busy
                      ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: onAccent))
                      : Text('Enviar', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
