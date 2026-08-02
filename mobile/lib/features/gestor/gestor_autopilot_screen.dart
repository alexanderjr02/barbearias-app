import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'gestor_repository.dart';
import '../../core/utils/moeda.dart';

/// Auto-piloto, the automations that run by themselves (via the daily cron):
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
                // A prova primeiro: e a resposta pra "isso vale a pena?".
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: palette.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: palette.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Receita recuperada este mês', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                      const SizedBox(height: 6),
                      Text(reais(_recovered),
                          style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 30, letterSpacing: -0.8)),
                      const SizedBox(height: 3),
                      Text(
                        _actions == 0
                            ? 'nenhuma ação ainda'
                            : '$_actions ${_actions == 1 ? 'ação executada' : 'ações executadas'} pelo Auto-piloto',
                        style: TextStyle(color: palette.textFaint, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // O que cada nivel significa vive DENTRO do proprio cartao, em
                // vez de repetir a explicacao do escolhido num bloco abaixo.
                Text('Quanta autonomia ele tem',
                    style: TextStyle(color: palette.textFaint, fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: 10),
                for (final opt in const [
                  ('off', 'Desligado', 'Pausado', 'Ele observa, mas não envia nada nem age por conta própria.'),
                  ('suggest', 'Sugerir', 'Você aprova', 'Ele acha as oportunidades e te avisa. Nada sai sem o seu toque.'),
                  ('auto', 'Agir sozinho', 'Autônomo', 'Ele resolve na hora e depois te conta o que fez.'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: GestureDetector(
                      onTap: () => _setLevel(opt.$1),
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _level == opt.$1 ? accent.withValues(alpha: 0.07) : palette.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: _level == opt.$1 ? accent : palette.border),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 2),
                              width: 15,
                              height: 15,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _level == opt.$1 ? accent : Colors.transparent,
                                border: Border.all(color: _level == opt.$1 ? accent : palette.textFaint, width: 2),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(opt.$2,
                                          style: TextStyle(
                                            color: _level == opt.$1 ? accent : palette.textPrimary,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13.5,
                                          )),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                        decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(20)),
                                        child: Text(opt.$3, style: TextStyle(color: palette.textFaint, fontSize: 9.5, fontWeight: FontWeight.w700)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(opt.$4, style: TextStyle(color: palette.textFaint, fontSize: 12, height: 1.35)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 14),

                Text('O que ele faz por você',
                    style: TextStyle(color: palette.textFaint, fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: 10),
                _AutomationTile(
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
                  title: 'Chamar clientes sumidos',
                  subtitle: 'Manda uma mensagem quando um cliente passa do tempo sem voltar.',
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
                    padding: const EdgeInsets.fromLTRB(12, 2, 12, 6),
                    child: Row(
                      children: [
                        Text('Sumido há', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                        const SizedBox(width: 10),
                        for (final d in _winbackOptions)
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: GestureDetector(
                              onTap: () {
                                setState(() => _winbackDays = d);
                                _save(winback: d);
                              },
                              behavior: HitTestBehavior.opaque,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                                decoration: BoxDecoration(
                                  color: _winbackDays == d ? accent.withValues(alpha: 0.12) : palette.surface,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: _winbackDays == d ? accent : palette.border),
                                ),
                                child: Text('$d dias',
                                    style: TextStyle(
                                      color: _winbackDays == d ? accent : palette.textSecondary,
                                      fontSize: 12,
                                      fontWeight: _winbackDays == d ? FontWeight.w800 : FontWeight.w600,
                                    )),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                const SizedBox(height: 18),

                Text('Atividade recente',
                    style: TextStyle(color: palette.textFaint, fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: 10),
                if (_feed.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: palette.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: palette.border),
                    ),
                    child: Column(
                      children: [
                        Text('Ainda sem ações este mês', style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text('Quando ele agir, preencher um horário, confirmar, reativar um cliente, aparece aqui.',
                            textAlign: TextAlign.center, style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.35)),
                      ],
                    ),
                  )
                else
                  Container(
                    decoration: BoxDecoration(
                      color: palette.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: palette.border),
                    ),
                    child: Column(
                      children: [
                        for (var i = 0; i < _feed.length; i++) ...[
                          if (i > 0) Divider(height: 1, color: palette.border),
                          Padding(
                            padding: const EdgeInsets.all(13),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  margin: const EdgeInsets.only(top: 5),
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
                                ),
                                const SizedBox(width: 11),
                                Expanded(child: Text(_feed[i].detail, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.35))),
                                if (_feed[i].recoveredValue != null && _feed[i].recoveredValue! > 0) ...[
                                  const SizedBox(width: 8),
                                  Text('+${reais(_feed[i].recoveredValue!)}',
                                      style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.w800, fontSize: 12)),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                const SizedBox(height: 16),

                Text('Você também liga/desliga isso falando com o Copiloto (ex.: "liga a confirmação automática" ou "agir sozinho").', style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4)),
              ],
            ),
    );
  }
}

class _AutomationTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool value;
  final AppPalette palette;
  final Color accent;
  final ValueChanged<bool> onChanged;

  const _AutomationTile({required this.title, required this.subtitle, required this.value, required this.palette, required this.accent, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: value ? accent.withValues(alpha: 0.4) : palette.border)),
      child: Row(
        children: [

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
