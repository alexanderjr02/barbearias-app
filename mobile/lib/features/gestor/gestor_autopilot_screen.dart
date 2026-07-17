import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'gestor_repository.dart';

/// Auto-piloto — the automations that run by themselves (via the daily cron):
/// auto-confirm tomorrow's appointments, birthday messages, and win-back of
/// clients who just went quiet. The gestor flips them on/off here (or by
/// talking to the Copiloto). Pro+ feature.
class GestorAutopilotScreen extends StatefulWidget {
  const GestorAutopilotScreen({super.key});

  @override
  State<GestorAutopilotScreen> createState() => _GestorAutopilotScreenState();
}

class _GestorAutopilotScreenState extends State<GestorAutopilotScreen> {
  final _repository = GestorRepository();
  bool _loading = true;
  bool _autoConfirm = false;
  bool _autoBirthday = false;
  int? _winbackDays;

  static const _winbackOptions = [30, 45, 60];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await _repository.barbershop();
      if (!mounted) return;
      setState(() {
        _autoConfirm = p.autoConfirm;
        _autoBirthday = p.autoBirthday;
        _winbackDays = p.autoWinbackDays;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save({bool? confirm, bool? birthday, int? winback, bool clearWinback = false}) async {
    try {
      await _repository.updateAutomations(autoConfirm: confirm, autoBirthday: birthday, autoWinbackDays: winback, clearWinback: clearWinback);
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível salvar');
      _load(); // revert to server truth
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        elevation: 0,
        title: Row(
          children: [
            const Text('Auto-piloto'),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(color: accent.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(20)),
              child: Text('IA', style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: accent.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: accent.withValues(alpha: 0.2))),
                  child: Row(
                    children: [
                      Icon(Icons.auto_awesome_rounded, color: accent, size: 20),
                      const SizedBox(width: 10),
                      Expanded(child: Text('Ligue e esqueça. Essas automações rodam sozinhas todo dia de manhã — você não precisa lembrar de nada.', style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.4))),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                _AutomationTile(
                  icon: Icons.check_circle_rounded,
                  title: 'Confirmar agendamentos',
                  subtitle: 'Confirma sozinho os agendamentos do dia seguinte. Reduz falta (no-show).',
                  value: _autoConfirm,
                  palette: palette,
                  accent: accent,
                  onChanged: (v) {
                    setState(() => _autoConfirm = v);
                    _save(confirm: v);
                  },
                ),
                _AutomationTile(
                  icon: Icons.cake_rounded,
                  title: 'Mensagem de aniversário',
                  subtitle: 'Parabeniza cada cliente no aniversário e convida pra um corte.',
                  value: _autoBirthday,
                  palette: palette,
                  accent: accent,
                  onChanged: (v) {
                    setState(() => _autoBirthday = v);
                    _save(birthday: v);
                  },
                ),
                _AutomationTile(
                  icon: Icons.person_off_rounded,
                  title: 'Chamar clientes sumidos (win-back)',
                  subtitle: 'Manda uma mensagem carinhosa quando um cliente passa do tempo sem voltar.',
                  value: _winbackDays != null,
                  palette: palette,
                  accent: accent,
                  onChanged: (v) {
                    if (v) {
                      setState(() => _winbackDays = 45);
                      _save(winback: 45);
                    } else {
                      setState(() => _winbackDays = null);
                      _save(clearWinback: true);
                    }
                  },
                ),
                if (_winbackDays != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
                    child: Row(
                      children: [
                        Text('Sumido há', style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                        const SizedBox(width: 10),
                        for (final d in _winbackOptions)
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text('$d dias'),
                              selected: _winbackDays == d,
                              selectedColor: accent.withValues(alpha: 0.2),
                              labelStyle: TextStyle(color: _winbackDays == d ? accent : palette.textSecondary, fontWeight: _winbackDays == d ? FontWeight.w700 : FontWeight.w500, fontSize: 12.5),
                              backgroundColor: palette.surface,
                              side: BorderSide(color: _winbackDays == d ? accent : palette.border),
                              onSelected: (_) {
                                setState(() => _winbackDays = d);
                                _save(winback: d);
                              },
                            ),
                          ),
                      ],
                    ),
                  ),
                const SizedBox(height: 16),
                Text('Você também pode ligar/desligar isso falando com o Copiloto (ex.: "liga a confirmação automática").', style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4)),
              ],
            ),
    );
  }
}

class _AutomationTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final AppPalette palette;
  final Color accent;
  final ValueChanged<bool> onChanged;

  const _AutomationTile({required this.icon, required this.title, required this.subtitle, required this.value, required this.palette, required this.accent, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: value ? accent.withValues(alpha: 0.4) : palette.border)),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: accent.withValues(alpha: value ? 0.15 : 0.08), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: value ? accent : palette.textFaint, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(color: palette.textFaint, fontSize: 12, height: 1.35)),
              ],
            ),
          ),
          Switch(value: value, activeThumbColor: accent, onChanged: onChanged),
        ],
      ),
    );
  }
}
