import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/form_sheet.dart';
import 'client_repository.dart';

class ClientPreferencesScreen extends StatefulWidget {
  const ClientPreferencesScreen({super.key});

  @override
  State<ClientPreferencesScreen> createState() => _ClientPreferencesScreenState();
}

class _ClientPreferencesScreenState extends State<ClientPreferencesScreen> {
  final _repo = ClientRepository();
  final _machine = TextEditingController();
  final _products = TextEditingController();
  final _allergies = TextEditingController();
  final _drink = TextEditingController();
  final _notes = TextEditingController();
  String _chat = '';
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await _repo.preferences();
      _machine.text = p.machine ?? '';
      _products.text = p.products ?? '';
      _allergies.text = p.allergies ?? '';
      _drink.text = p.drink ?? '';
      _notes.text = p.notes ?? '';
      _chat = p.chat ?? '';
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _machine.dispose();
    _products.dispose();
    _allergies.dispose();
    _drink.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await _repo.savePreferences({
        'machine': _machine.text.trim(),
        'products': _products.text.trim(),
        'allergies': _allergies.text.trim(),
        'drink': _drink.text.trim(),
        'chat': _chat,
        'notes': _notes.text.trim(),
      });
      if (mounted) {
        AppToast.success(context, 'Preferências salvas — seu barbeiro vai saber!');
        Navigator.of(context).pop();
      }
    } catch (_) {
      if (mounted) AppToast.error(context, 'Falha ao salvar');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Minhas preferências'), elevation: 0),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: accent.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(14), border: Border.all(color: accent.withValues(alpha: 0.25))),
                  child: Row(
                    children: [
                      Icon(Icons.auto_awesome_rounded, color: accent, size: 20),
                      const SizedBox(width: 10),
                      Expanded(child: Text('Preencha uma vez e o barbeiro te atende do seu jeito em toda visita.', style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.4))),
                    ],
                  ),
                ),
                const FieldLabel('Laterais / máquina'),
                CortixField(controller: _machine, hint: 'Ex: máquina 2 nas laterais, tesoura em cima'),
                const FieldLabel('Produtos'),
                CortixField(controller: _products, hint: 'Ex: sem produto / pomada matte'),
                const FieldLabel('Alergias'),
                CortixField(controller: _allergies, hint: 'Ex: alérgico a talco'),
                const FieldLabel('Bebida favorita'),
                CortixField(controller: _drink, hint: 'Ex: café, água com gás'),
                const FieldLabel('Conversa'),
                const SizedBox(height: 2),
                CortixChoiceRow(
                  options: const [('conversar', 'Adoro conversar'), ('tanto_faz', 'Tanto faz'), ('silencio', 'Prefiro silêncio')],
                  value: _chat,
                  onChanged: (v) => setState(() => _chat = v),
                ),
                const FieldLabel('Observações'),
                CortixField(controller: _notes, hint: 'Qualquer detalhe que ajude o barbeiro', maxLines: 3),
                const SizedBox(height: 24),
                PulseButton(
                  onPressed: _saving ? null : _save,
                  gradient: LinearGradient(colors: [Color.lerp(accent, Colors.white, 0.22)!, accent]),
                  child: _saving
                      ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                      : Text('Salvar preferências', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ],
            ),
    );
  }
}
