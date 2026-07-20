import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/form_sheet.dart';
import '../gestor_repository.dart';

String _brl(double v) => 'R\$ ${v.toStringAsFixed(2)}';
String _brl0(double v) => 'R\$ ${v.toStringAsFixed(0)}';

Color _methodColor(String m) {
  switch (m) {
    case 'Pix':
      return const Color(0xFF10B981);
    case 'Dinheiro':
      return const Color(0xFFF59E0B);
    case 'Cartão':
    case 'Cartão de crédito':
      return const Color(0xFF3B82F6);
    case 'Cartão de débito':
      return const Color(0xFF06B6D4);
    case 'Não informado':
      return const Color(0xFF71717A);
    default:
      return const Color(0xFF8B5CF6);
  }
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  return parts.map((e) => e.isEmpty ? '' : e[0]).take(2).join().toUpperCase();
}

// ===================== META & PONTO DE EQUILÍBRIO =====================

class FinanceCockpitCard extends StatefulWidget {
  const FinanceCockpitCard({super.key});

  @override
  State<FinanceCockpitCard> createState() => _FinanceCockpitCardState();
}

class _FinanceCockpitCardState extends State<FinanceCockpitCard> {
  final _repository = GestorRepository();
  late Future<FinanceOverview> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.financeOverview();
  }

  void _reload() => setState(() => _future = _repository.financeOverview());

  Future<void> _editGoal(double? current, double suggested) async {
    final ctrl = TextEditingController(text: current != null ? current.toStringAsFixed(0) : '');
    final saved = await FormSheet.show(
      context,
      title: 'Meta de faturamento do mês',
      submitLabel: 'Salvar meta',
      onSubmit: () async {
        final value = double.tryParse(ctrl.text.replaceAll(',', '.'));
        await _repository.setMonthlyGoal(value != null && value > 0 ? value : null);
      },
      children: [
        Text(
          'Quanto você quer faturar este mês? Usamos isso pra mostrar o quanto falta, quando cobre os custos e a projeção de fechamento.',
          style: TextStyle(color: AppPalette.of(context).textFaint, fontSize: 12),
        ),
        const FieldLabel('Meta (R\$)'),
        CortixField(controller: ctrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), hint: suggested > 0 ? 'Ex: ${suggested.toStringAsFixed(0)}' : 'Ex: 30000'),
      ],
    );
    if (saved == true) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return FutureBuilder<FinanceOverview>(
      future: _future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return Container(
            height: 150,
            decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18)),
          );
        }
        final o = snapshot.data!;
        final monthName = o.monthLabel.split(' de ').first;

        // Derived metrics (mirrors the web cockpit).
        final pace = o.dayOfMonth > 0 ? o.monthRevenue / o.dayOfMonth : 0.0;
        final projection = pace * o.daysInMonth;
        double cum = 0;
        int? breakEvenDay;
        for (var i = 0; i < o.dayOfMonth && i < o.dailyRevenue.length; i++) {
          cum += o.dailyRevenue[i];
          if (breakEvenDay == null && o.monthExpenses > 0 && cum >= o.monthExpenses) breakEvenDay = i + 1;
        }
        final covered = breakEvenDay != null || (o.monthExpenses == 0 && o.monthRevenue > 0);
        int? projectedDay;
        if (!covered && o.monthExpenses > 0 && pace > 0) projectedDay = (o.monthExpenses / pace).ceil();
        final profit = o.monthRevenue - o.monthExpenses;

        if (o.goal == null) {
          return _GoalPrompt(monthName: monthName, onTap: () => _editGoal(null, projection > 0 ? projection : (o.monthRevenue > 0 ? o.monthRevenue : 5000)));
        }

        final goal = o.goal!;
        final goalPct = goal > 0 ? (o.monthRevenue / goal * 100) : 0.0;
        final projectionPct = goal > 0 ? (projection / goal * 100) : 0.0;
        final breakEvenPct = goal > 0 ? (o.monthExpenses / goal * 100).clamp(0, 100).toDouble() : 0.0;
        final fillPct = goalPct.clamp(0, 100).toDouble();
        final overGoal = goalPct >= 100;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(color: accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                    child: Icon(Icons.track_changes_rounded, color: accent, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Meta de $monthName', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 14.5)),
                        Text('Dia ${o.dayOfMonth} de ${o.daysInMonth} · atualiza sozinho', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _editGoal(goal, projection),
                    child: Icon(Icons.edit_outlined, color: palette.textFaint, size: 18),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Value + %
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(_brl0(o.monthRevenue), style: TextStyle(color: palette.textPrimary, fontSize: 26, fontWeight: FontWeight.w900)),
                  const SizedBox(width: 6),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('de ${_brl0(goal)}', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                  ),
                  const Spacer(),
                  Text('${goalPct.round()}%', style: TextStyle(color: overGoal ? const Color(0xFF10B981) : accent, fontSize: 15, fontWeight: FontWeight.w900)),
                ],
              ),
              const SizedBox(height: 8),

              // Thermometer
              LayoutBuilder(
                builder: (context, c) {
                  final w = c.maxWidth;
                  return SizedBox(
                    height: 18,
                    child: Stack(
                      children: [
                        Container(decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(10))),
                        FractionallySizedBox(
                          widthFactor: (fillPct / 100).clamp(0.02, 1).toDouble(),
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: overGoal ? [const Color(0xFF10B981), const Color(0xFF34D399)] : [accent, const Color(0xFFFBBF24)],
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                        if (breakEvenPct > 2 && breakEvenPct < 100)
                          Positioned(
                            left: (w * breakEvenPct / 100).clamp(0, w - 2).toDouble(),
                            top: 0,
                            bottom: 0,
                            child: Container(width: 2, color: covered ? const Color(0xFF6EE7B7) : Colors.white70),
                          ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (breakEvenPct > 2 && breakEvenPct < 100)
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.local_fire_department_rounded, size: 12, color: Color(0xFFFB923C)),
                      const SizedBox(width: 3),
                      Text('equilíbrio', style: TextStyle(color: palette.textFaint, fontSize: 10)),
                    ])
                  else
                    const SizedBox.shrink(),
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.flag_rounded, size: 12, color: accent),
                    const SizedBox(width: 3),
                    Text('meta', style: TextStyle(color: palette.textFaint, fontSize: 10)),
                  ]),
                ],
              ),
              const SizedBox(height: 14),

              // Insight tiles
              Row(
                children: [
                  Expanded(
                    child: _MiniTile(
                      palette: palette,
                      icon: Icons.trending_up_rounded,
                      iconColor: const Color(0xFF3B82F6),
                      label: 'Projeção',
                      value: _brl0(projection),
                      sub: projectionPct >= 100 ? 'bate a meta 🎯' : '${projectionPct.round()}% da meta',
                      subColor: projectionPct >= 100 ? const Color(0xFF10B981) : palette.textFaint,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MiniTile(
                      palette: palette,
                      icon: Icons.local_fire_department_rounded,
                      iconColor: const Color(0xFFFB923C),
                      label: 'Equilíbrio',
                      value: o.monthExpenses == 0
                          ? '—'
                          : covered
                              ? 'Coberto ✓'
                              : _brl0((o.monthExpenses - o.monthRevenue).clamp(0, double.infinity)),
                      sub: o.monthExpenses == 0
                          ? 'lance despesas'
                          : covered
                              ? (breakEvenDay != null ? 'virada dia $breakEvenDay' : 'tudo é lucro')
                              : (projectedDay != null && projectedDay <= o.daysInMonth ? 'previsto dia $projectedDay' : 'p/ cobrir custos'),
                      subColor: covered ? const Color(0xFF10B981) : palette.textFaint,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MiniTile(
                      palette: palette,
                      icon: Icons.emoji_events_rounded,
                      iconColor: accent,
                      label: 'Lucro/mês',
                      value: _brl0(profit),
                      sub: 'até agora',
                      subColor: palette.textFaint,
                      valueColor: profit >= 0 ? accent : Colors.redAccent,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _GoalPrompt extends StatelessWidget {
  final String monthName;
  final VoidCallback onTap;
  const _GoalPrompt({required this.monthName, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: accent.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)),
              child: Icon(Icons.track_changes_rounded, color: accent, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Defina sua meta de $monthName', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 14.5)),
                  const SizedBox(height: 2),
                  Text('Acompanhe ao vivo quanto falta, quando cobre os custos e a projeção.', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: accent),
          ],
        ),
      ),
    );
  }
}

class _MiniTile extends StatelessWidget {
  final AppPalette palette;
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final String sub;
  final Color subColor;
  final Color? valueColor;

  const _MiniTile({
    required this.palette,
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.sub,
    required this.subColor,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: iconColor),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(color: valueColor ?? palette.textPrimary, fontSize: 14, fontWeight: FontWeight.w900), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(sub, style: TextStyle(color: subColor, fontSize: 9.5), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

// ===================== CAIXA DO DIA =====================

class DailyCashCard extends StatefulWidget {
  const DailyCashCard({super.key});

  @override
  State<DailyCashCard> createState() => _DailyCashCardState();
}

class _DailyCashCardState extends State<DailyCashCard> {
  final _repository = GestorRepository();
  DateTime _date = DateTime.now();
  late Future<DailyCash> _future;

  static String _key(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void initState() {
    super.initState();
    _future = _repository.dailyCash(date: _key(_date));
  }

  void _load() => setState(() => _future = _repository.dailyCash(date: _key(_date)));

  bool get _isToday {
    final n = DateTime.now();
    return _date.year == n.year && _date.month == n.month && _date.day == n.day;
  }

  void _shift(int delta) {
    setState(() => _date = _date.add(Duration(days: delta)));
    _load();
  }

  void _goToday() {
    setState(() => _date = DateTime.now());
    _load();
  }

  static const _weekdays = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  static const _months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  String get _dateLabel => '${_weekdays[_date.weekday - 1]}, ${_date.day} de ${_months[_date.month - 1]}';

  void _openClose(DailyCash d, Color accent, AppPalette palette) {
    showModalBottomSheet(
      context: context,
      backgroundColor: palette.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _CashCloseSheet(data: d, dateLabel: _dateLabel, palette: palette, accent: accent),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Container(
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header + nav
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 10, 8),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF10B981), size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Caixa do Dia', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 14.5)),
                      Text(_dateLabel, style: TextStyle(color: palette.textFaint, fontSize: 11)),
                    ],
                  ),
                ),
                IconButton(onPressed: () => _shift(-1), icon: Icon(Icons.chevron_left_rounded, color: palette.textSecondary), visualDensity: VisualDensity.compact),
                if (!_isToday)
                  GestureDetector(onTap: _goToday, child: Text('Hoje', style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w700))),
                IconButton(
                  onPressed: _isToday ? null : () => _shift(1),
                  icon: Icon(Icons.chevron_right_rounded, color: _isToday ? palette.textFaint.withValues(alpha: 0.4) : palette.textSecondary),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
          FutureBuilder<DailyCash>(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Padding(padding: EdgeInsets.all(28), child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
              }
              final d = snapshot.data!;
              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // KPIs
                    Row(
                      children: [
                        Expanded(child: _Kpi(palette: palette, label: 'Entrou hoje', value: _brl0(d.totalRevenue), sub: d.avgDailyRevenue > 0 ? '${d.vsAveragePct >= 0 ? '+' : ''}${d.vsAveragePct}% vs média' : null, subColor: d.vsAveragePct >= 0 ? const Color(0xFF10B981) : Colors.redAccent, valueColor: const Color(0xFF10B981))),
                        const SizedBox(width: 8),
                        Expanded(child: _Kpi(palette: palette, label: 'Atend.', value: '${d.appointmentCount}', sub: 'concluídos')),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(child: _Kpi(palette: palette, label: 'Ticket médio', value: _brl0(d.avgTicket), sub: 'por atend.')),
                        const SizedBox(width: 8),
                        Expanded(child: _Kpi(palette: palette, label: 'Comissões', value: _brl0(d.totalCommission), sub: 'a pagar', valueColor: accent)),
                      ],
                    ),

                    if (d.byMethod.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text('POR FORMA DE PAGAMENTO', style: TextStyle(color: palette.textFaint, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                      const SizedBox(height: 8),
                      ...d.byMethod.map((m) {
                        final pct = d.totalRevenue > 0 ? m.amount / d.totalRevenue : 0.0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(width: 9, height: 9, decoration: BoxDecoration(color: _methodColor(m.method), shape: BoxShape.circle)),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(m.method, style: TextStyle(color: palette.textSecondary, fontSize: 12.5))),
                                  Text(_brl(m.amount), style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w700)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(3),
                                child: LinearProgressIndicator(value: pct, minHeight: 5, backgroundColor: palette.surfaceAlt, valueColor: AlwaysStoppedAnimation(_methodColor(m.method))),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],

                    if (d.byBarber.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text('POR BARBEIRO', style: TextStyle(color: palette.textFaint, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                      const SizedBox(height: 8),
                      ...d.byBarber.map((b) {
                        final avatar = resolveAssetUrl(b.avatar);
                        return Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 15,
                                backgroundColor: accent.withValues(alpha: 0.2),
                                backgroundImage: avatar != null ? NetworkImage(avatar) : null,
                                child: avatar == null ? Text(_initials(b.name), style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.bold)) : null,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(b.name, style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                                    Text('${b.count} atend. · ${_brl(b.revenue)}', style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('comissão', style: TextStyle(color: palette.textFaint, fontSize: 9.5)),
                                  Text(_brl(b.commission), style: TextStyle(color: accent, fontSize: 12.5, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                        );
                      }),
                    ],

                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _ResultCol(palette: palette, label: 'Entradas', value: _brl0(d.totalRevenue), color: const Color(0xFF10B981))),
                        Expanded(child: _ResultCol(palette: palette, label: 'Saídas', value: _brl0(d.manualExpense), color: Colors.redAccent)),
                        Expanded(child: _ResultCol(palette: palette, label: 'Resultado', value: _brl0(d.net), color: d.net >= 0 ? accent : Colors.redAccent)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _openClose(d, accent, palette),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(vertical: 12)),
                        icon: const Icon(Icons.account_balance_wallet_rounded, color: Colors.black, size: 18),
                        label: const Text('Fechar caixa', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  final AppPalette palette;
  final String label;
  final String value;
  final String? sub;
  final Color? subColor;
  final Color? valueColor;
  const _Kpi({required this.palette, required this.label, required this.value, this.sub, this.subColor, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
          const SizedBox(height: 3),
          Text(value, style: TextStyle(color: valueColor ?? palette.textPrimary, fontSize: 16, fontWeight: FontWeight.w900)),
          if (sub != null) Text(sub!, style: TextStyle(color: subColor ?? palette.textFaint, fontSize: 10, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _ResultCol extends StatelessWidget {
  final AppPalette palette;
  final String label;
  final String value;
  final Color color;
  const _ResultCol({required this.palette, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(color: color, fontSize: 13.5, fontWeight: FontWeight.w900)),
      ],
    );
  }
}

class _CashCloseSheet extends StatelessWidget {
  final DailyCash data;
  final String dateLabel;
  final AppPalette palette;
  final Color accent;
  const _CashCloseSheet({required this.data, required this.dateLabel, required this.palette, required this.accent});

  Widget _line(String label, String value, {bool strong = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: strong ? palette.textPrimary : palette.textSecondary, fontSize: 13, fontWeight: strong ? FontWeight.w800 : FontWeight.w400)),
            Text(value, style: TextStyle(color: strong ? accent : palette.textPrimary, fontSize: 13, fontWeight: strong ? FontWeight.w900 : FontWeight.w600)),
          ],
        ),
      );

  Widget _section(String title, List<Widget> children) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 14),
          Text(title.toUpperCase(), style: TextStyle(color: palette.textFaint, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
          const SizedBox(height: 4),
          ...children,
        ],
      );

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 14),
            Text('Fechamento de Caixa', style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
            Text(dateLabel, style: TextStyle(color: palette.textFaint, fontSize: 12)),
            const SizedBox(height: 14),
            Center(
              child: Column(
                children: [
                  Text(_brl(data.totalRevenue), style: TextStyle(color: palette.textPrimary, fontSize: 30, fontWeight: FontWeight.w900)),
                  Text('total que entrou · ${data.appointmentCount} atendimentos', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    if (data.byMethod.isNotEmpty) _section('Conferência por forma de pagamento', data.byMethod.map((m) => _line(m.method, _brl(m.amount))).toList()),
                    _section('Comissões a pagar', [
                      ...data.byBarber.map((b) => _line('${b.name} (${b.count})', _brl(b.commission))),
                      _line('Total de comissões', _brl(data.totalCommission), strong: true),
                    ]),
                    _section('Resultado do dia', [
                      _line('Entradas', _brl(data.totalRevenue)),
                      _line('Saídas (despesas)', '- ${_brl(data.manualExpense)}'),
                      _line('Resultado', _brl(data.net), strong: true),
                    ]),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(vertical: 13)),
                child: Text('Concluir', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
