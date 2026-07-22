import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'gestor_repository.dart';

/// Copiloto de Marketing — espelha a página web 1:1 e com dado REAL: onde tem
/// dinheiro parado agora (horário vago da semana, cliente sumido), quanto vale
/// cada um deles (ticket médio) e um toque pra disparar a campanha. O nível de
/// autonomia é o mesmo do Auto-piloto (off/suggest/auto). Pro+.
class GestorMarketingScreen extends StatefulWidget {
  const GestorMarketingScreen({super.key});

  @override
  State<GestorMarketingScreen> createState() => _GestorMarketingScreenState();
}

const _levels = [
  ('off', 'Pausado', 'Em pausa — o Copiloto não dispara nada.'),
  ('suggest', 'Sugerir', 'Achando oportunidades — você aprova cada envio.'),
  ('auto', 'Automático', 'No comando — dispara na hora certa e te conta depois.'),
];

/// R$ 1.234,50 — sem depender de pacote de i18n.
String _money(double v) {
  final parts = v.abs().toStringAsFixed(2).split('.');
  final int0 = parts[0].replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]}.');
  return '${v < 0 ? '-' : ''}R\$ $int0,${parts[1]}';
}

class _GestorMarketingScreenState extends State<GestorMarketingScreen> {
  final _repository = GestorRepository();
  bool _loading = true;
  bool _sendingFill = false;
  bool _sendingWinback = false;

  String _level = 'suggest';
  String _plan = 'FREE';
  int _freeSlots = 0;
  int _churned = 0;
  double _recovered = 0;
  int _actions = 0;
  double _ticket = 0;
  List<({String action, String detail, String createdAt})> _feed = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await _repository.marketingOpportunities();
      if (!mounted) return;
      setState(() {
        _level = d.autopilotLevel;
        _plan = d.plan;
        _freeSlots = d.freeSlotsWeek;
        _churned = d.churnedCount;
        _recovered = d.recoveredThisMonth;
        _actions = d.actionsThisMonth;
        _ticket = d.avgTicket;
        _feed = d.feed;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setLevel(String level) async {
    final previous = _level;
    setState(() => _level = level);
    try {
      await _repository.updateAutomations(autopilotLevel: level);
    } catch (_) {
      if (!mounted) return;
      setState(() => _level = previous);
      AppToast.error(context, 'Não foi possível salvar');
    }
  }

  Future<void> _fillWeek() async {
    setState(() => _sendingFill = true);
    try {
      final r = await _repository.fillWeek();
      if (!mounted) return;
      if (r.ok) {
        AppToast.success(context, r.message);
      } else {
        AppToast.error(context, r.message);
      }
      await _load();
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não consegui enviar');
    } finally {
      if (mounted) setState(() => _sendingFill = false);
    }
  }

  Future<void> _winback() async {
    setState(() => _sendingWinback = true);
    try {
      final msg = await _repository.copilotAction('winback_churned');
      if (!mounted) return;
      AppToast.success(context, msg);
      await _load();
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não consegui enviar');
    } finally {
      if (mounted) setState(() => _sendingWinback = false);
    }
  }

  String _feedDate(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '';
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    final hh = d.hour.toString().padLeft(2, '0');
    final mi = d.minute.toString().padLeft(2, '0');
    return '$dd/$mm às $hh:$mi';
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, elevation: 0, title: const Text('Marketing')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _plan == 'FREE'
              ? _locked(palette, accent)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                    children: [
                      Text(
                        'O Copiloto acha onde tem dinheiro parado — você aprova, ele traz o cliente.',
                        style: TextStyle(color: palette.textFaint, fontSize: 12.5, height: 1.4),
                      ),
                      const SizedBox(height: 14),
                      _copilotBar(palette, accent),
                      const SizedBox(height: 20),
                      _sectionLabel('ONDE TEM DINHEIRO AGORA', palette),
                      const SizedBox(height: 10),
                      _OpportunityCard(
                        icon: Icons.event_available_rounded,
                        title: 'Encher a semana',
                        value: '$_freeSlots',
                        unit: _freeSlots == 1 ? 'horário livre' : 'horários livres',
                        money: _ticket > 0 ? 'Cada horário vale ~${_money(_ticket)}' : 'Horário parado é dinheiro parado',
                        desc: 'Convida clientes ativos a preencher os próximos dias.',
                        actionLabel: 'Enviar convite',
                        busy: _sendingFill,
                        enabled: _freeSlots > 0,
                        highlight: _freeSlots > 0,
                        autoBadge: _level == 'auto',
                        palette: palette,
                        accent: accent,
                        onAction: _fillWeek,
                      ),
                      const SizedBox(height: 10),
                      _OpportunityCard(
                        icon: Icons.person_off_rounded,
                        title: 'Trazer os sumidos',
                        value: '$_churned',
                        unit: _churned == 1 ? 'cliente sumido' : 'clientes sumidos',
                        money: _ticket > 0 && _churned > 0 ? 'Até ~${_money(_churned * _ticket)} se voltarem' : 'Um empurrãozinho traz parte deles de volta',
                        desc: 'Quem não aparece há um tempo recebe um lembrete pra remarcar.',
                        actionLabel: 'Chamar de volta',
                        busy: _sendingWinback,
                        enabled: _churned > 0,
                        highlight: false,
                        autoBadge: false,
                        palette: palette,
                        accent: accent,
                        onAction: _winback,
                      ),
                      const SizedBox(height: 10),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.card_giftcard_rounded, size: 14, color: palette.textFaint),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Aniversariantes do dia o Copiloto parabeniza sozinho no automático. Tudo só vai pra quem deu consentimento (LGPD).',
                              style: TextStyle(color: palette.textFaint, fontSize: 11, height: 1.4),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(child: _stat('Recuperado no mês', _money(_recovered), palette, accent, accentValue: true)),
                          const SizedBox(width: 8),
                          Expanded(child: _stat('Ações do Copiloto', '$_actions', palette, accent)),
                          const SizedBox(width: 8),
                          Expanded(child: _stat('Ticket médio', _ticket > 0 ? _money(_ticket) : '—', palette, accent)),
                        ],
                      ),
                      const SizedBox(height: 20),
                      _sectionLabel('O QUE O COPILOTO FEZ', palette),
                      const SizedBox(height: 10),
                      if (_feed.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
                          decoration: BoxDecoration(
                            color: palette.surface.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: palette.border),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.auto_awesome_rounded, size: 22, color: palette.textFaint),
                              const SizedBox(height: 10),
                              Text('Ainda sem campanhas', style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.w600, fontSize: 13.5)),
                              const SizedBox(height: 4),
                              Text(
                                'Quando o Copiloto disparar uma campanha, ela aparece aqui com o resultado.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4),
                              ),
                            ],
                          ),
                        )
                      else
                        Container(
                          decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: palette.border)),
                          child: Column(
                            children: [
                              for (var i = 0; i < _feed.length; i++)
                                Container(
                                  padding: const EdgeInsets.all(13),
                                  decoration: BoxDecoration(
                                    border: i > 0 ? Border(top: BorderSide(color: palette.border)) : null,
                                  ),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        width: 28,
                                        height: 28,
                                        decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(9)),
                                        child: Icon(Icons.bolt_rounded, size: 15, color: accent),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(_feed[i].detail, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.35)),
                                            const SizedBox(height: 2),
                                            Text(_feedDate(_feed[i].createdAt), style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
    );
  }

  Widget _sectionLabel(String text, AppPalette palette) {
    return Text(text, style: TextStyle(color: palette.textFaint, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.6));
  }

  /// Identidade do Copiloto + status ao vivo + o interruptor-mestre.
  Widget _copilotBar(AppPalette palette, Color accent) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: palette.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(color: accent.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(13)),
                    child: Icon(Icons.auto_awesome_rounded, color: accent, size: 20),
                  ),
                  if (_level != 'off')
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: kSuccessColor,
                          shape: BoxShape.circle,
                          border: Border.all(color: palette.surface, width: 2),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Copiloto de Marketing', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(
                      _levels.firstWhere((l) => l.$1 == _level, orElse: () => _levels[1]).$3,
                      style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Controle segmentado.
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: palette.bg, borderRadius: BorderRadius.circular(13), border: Border.all(color: palette.border)),
            child: Row(
              children: [
                for (final l in _levels)
                  Expanded(
                    child: GestureDetector(
                      onTap: () => _setLevel(l.$1),
                      behavior: HitTestBehavior.opaque,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 160),
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        decoration: BoxDecoration(
                          color: _level == l.$1 ? accent : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          l.$2,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: _level == l.$1 ? contrastingTextColor(accent) : palette.textSecondary,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, AppPalette palette, Color accent, {bool accentValue = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: palette.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10, height: 1.25)),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value, style: TextStyle(color: accentValue ? accent : palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
          ),
        ],
      ),
    );
  }

  Widget _locked(AppPalette palette, Color accent) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: accent.withValues(alpha: 0.25)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(13)),
                child: Icon(Icons.lock_outline_rounded, color: accent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Copiloto de Marketing é do plano Pro', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(
                      'Ative o Pro para o Copiloto encontrar horário parado, trazer cliente sumido e encher sua semana sozinho.',
                      style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.4),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Uma oportunidade: o número grande (o que está parado), quanto vale em
/// dinheiro e um botão que dispara a campanha.
class _OpportunityCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final String unit;
  final String money;
  final String desc;
  final String actionLabel;
  final bool busy;
  final bool enabled;
  final bool highlight;
  final bool autoBadge;
  final AppPalette palette;
  final Color accent;
  final VoidCallback onAction;

  const _OpportunityCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.unit,
    required this.money,
    required this.desc,
    required this.actionLabel,
    required this.busy,
    required this.enabled,
    required this.highlight,
    required this.autoBadge,
    required this.palette,
    required this.accent,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = busy || !enabled;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: highlight ? accent.withValues(alpha: 0.45) : palette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(13)),
                child: Icon(icon, color: accent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(child: Text(title, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14))),
                        if (autoBadge) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(color: kSuccessColor.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(20)),
                            child: Text('no automático', style: TextStyle(color: kSuccessColor, fontSize: 9.5, fontWeight: FontWeight.w800)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(value, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 26)),
                        const SizedBox(width: 5),
                        Flexible(child: Text(unit, style: TextStyle(color: palette.textSecondary, fontSize: 12.5))),
                      ],
                    ),
                    const SizedBox(height: 1),
                    Text(money, style: TextStyle(color: accent, fontWeight: FontWeight.w600, fontSize: 11.5)),
                    const SizedBox(height: 5),
                    Text(desc, style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.35)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: disabled ? null : onAction,
              style: ElevatedButton.styleFrom(
                backgroundColor: accent,
                foregroundColor: contrastingTextColor(accent),
                disabledBackgroundColor: palette.border,
                disabledForegroundColor: palette.textFaint,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
              ),
              child: busy
                  ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(actionLabel, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                        const SizedBox(width: 6),
                        const Icon(Icons.arrow_forward_rounded, size: 16),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
