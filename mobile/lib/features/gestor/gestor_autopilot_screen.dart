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
  String _level = 'suggest';
  bool _autoConfirm = false;
  bool _autoBirthday = false;
  int? _winbackDays;
  double _recovered = 0;
  int _actions = 0;
  List<({String action, String detail, double? recoveredValue, String createdAt})> _feed = const [];

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
        _level = p.autopilotLevel;
        _autoConfirm = p.autoConfirm;
        _autoBirthday = p.autoBirthday;
        _winbackDays = p.autoWinbackDays;
        _loading = false;
      });
      _loadFeed();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadFeed() async {
    try {
      final f = await _repository.autopilotFeed();
      if (mounted) setState(() {
        _recovered = f.recoveredTotal;
        _actions = f.actionsThisMonth;
        _feed = f.feed;
      });
    } catch (_) {}
  }

  Future<void> _setLevel(String level) async {
    setState(() => _level = level);
    try {
      await _repository.updateAutomations(autopilotLevel: level);
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível salvar');
    }
  }

  IconData _feedIcon(String action) {
    switch (action) {
      case 'slot_filled':
        return Icons.event_available_rounded;
      case 'confirmed':
        return Icons.check_circle_rounded;
      case 'birthday':
        return Icons.cake_rounded;
      case 'winback':
        return Icons.person_off_rounded;
      default:
        return Icons.bolt_rounded;
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
                // ---- Nível de autonomia ----
                Text('O quanto ele age sozinho', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    for (final opt in const [('off', 'Observar', 'só avisa'), ('suggest', 'Sugerir', '1 toque'), ('auto', 'Agir sozinho', 'faz e conta')])
                      Expanded(
                        child: GestureDetector(
                          onTap: () => _setLevel(opt.$1),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
                            decoration: BoxDecoration(
                              color: _level == opt.$1 ? accent.withValues(alpha: 0.15) : palette.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: _level == opt.$1 ? accent : palette.border, width: _level == opt.$1 ? 1.6 : 1),
                            ),
                            child: Column(
                              children: [
                                Text(opt.$2, textAlign: TextAlign.center, style: TextStyle(color: _level == opt.$1 ? accent : palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 12.5)),
                                const SizedBox(height: 2),
                                Text(opt.$3, textAlign: TextAlign.center, style: TextStyle(color: palette.textFaint, fontSize: 10)),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                // ---- Receita recuperada ----
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [accent, accent.withValues(alpha: 0.65)]),
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.25), blurRadius: 22, offset: const Offset(0, 10))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Receita recuperada este mês', style: TextStyle(color: contrastingTextColor(accent).withValues(alpha: 0.8), fontWeight: FontWeight.w600, fontSize: 12.5)),
                      const SizedBox(height: 4),
                      Text('R\$ ${_recovered.toStringAsFixed(2)}', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.w900, fontSize: 28)),
                      const SizedBox(height: 2),
                      Text('$_actions ${_actions == 1 ? 'ação' : 'ações'} do Copiloto por você', style: TextStyle(color: contrastingTextColor(accent).withValues(alpha: 0.7), fontSize: 12)),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: accent.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: accent.withValues(alpha: 0.2))),
                  child: Row(
                    children: [
                      Icon(Icons.auto_awesome_rounded, color: accent, size: 20),
                      const SizedBox(width: 10),
                      Expanded(child: Text('Ligado e trabalhando 24h. Ele reage na hora (ex.: vagou horário → chama a fila) e roda as automações todo dia.', style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.4))),
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
                const SizedBox(height: 22),
                Row(children: [Icon(Icons.history_rounded, size: 16, color: accent), const SizedBox(width: 6), Text('O que o Copiloto fez por você', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15))]),
                const SizedBox(height: 10),
                if (_feed.isEmpty)
                  Text('Assim que ele agir (confirmar, chamar a fila, parabenizar…), aparece aqui.', style: TextStyle(color: palette.textFaint, fontSize: 12))
                else
                  ..._feed.map((e) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: palette.border)),
                        child: Row(
                          children: [
                            Icon(_feedIcon(e.action), size: 18, color: accent),
                            const SizedBox(width: 10),
                            Expanded(child: Text(e.detail, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.35))),
                            if (e.recoveredValue != null && e.recoveredValue! > 0)
                              Text('+R\$${e.recoveredValue!.toStringAsFixed(0)}', style: TextStyle(color: accent, fontWeight: FontWeight.w800, fontSize: 12.5)),
                          ],
                        ),
                      )),
                const SizedBox(height: 16),
                Text('Você também liga/desliga isso falando com o Copiloto (ex.: "liga a confirmação automática" ou "agir sozinho").', style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4)),
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
