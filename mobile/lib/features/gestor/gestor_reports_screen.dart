import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'gestor_repository.dart';
import 'widgets/revenue_chart_card.dart';

/// Mirrors the web "Relatórios" page: KPIs, receita-vs-despesas chart,
/// services-distribution donut, staff performance list and a
/// novos-vs-retornantes bar chart — all from the single
/// GET /dashboard/reports endpoint.
class GestorReportsScreen extends StatefulWidget {
  const GestorReportsScreen({super.key});

  @override
  State<GestorReportsScreen> createState() => _GestorReportsScreenState();
}

class _GestorReportsScreenState extends State<GestorReportsScreen> {
  final _repository = GestorRepository();
  String _range = 'month';
  late Future<ReportsData> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.reports(range: _range);
  }

  void _setRange(String range) {
    if (range == _range) return;
    setState(() {
      _range = range;
      _future = _repository.reports(range: range);
    });
  }

  Color _hex(String hex) {
    final cleaned = hex.replaceAll('#', '');
    return Color(0xFF000000 | (int.tryParse(cleaned, radix: 16) ?? 0xF59E0B));
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Relatórios'), elevation: 0),
      body: RefreshIndicator(
        onRefresh: () async => _setRange(_range),
        child: FutureBuilder<ReportsData>(
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
            final r = snapshot.data!;
            final margin = r.totalRevenue > 0 ? (r.profit / r.totalRevenue * 100).round() : 0;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _RangeChip(label: 'Esta semana', selected: _range == 'week', onTap: () => _setRange('week'), palette: palette, accent: accent),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _RangeChip(label: 'Este mês', selected: _range == 'month', onTap: () => _setRange('month'), palette: palette, accent: accent),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.7,
                  children: [
                    _KpiCard(label: 'Receita', value: 'R\$ ${r.totalRevenue.toStringAsFixed(0)}', icon: Icons.attach_money_rounded, color: palette.textSecondary, palette: palette),
                    _KpiCard(label: 'Agendamentos', value: '${r.totalAppointments}', icon: Icons.event_available_rounded, color: palette.textSecondary, palette: palette),
                    _KpiCard(label: 'Ticket médio', value: 'R\$ ${r.avgTicket.toStringAsFixed(2)}', icon: Icons.trending_up_rounded, color: palette.textSecondary, palette: palette),
                    _KpiCard(label: 'Margem', value: '$margin%', icon: Icons.pie_chart_rounded, color: r.profit >= 0 ? kSuccessColor : kDangerColor, palette: palette),
                  ],
                ),
                const SizedBox(height: 16),
                const RevenueChartCard(),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Serviços mais realizados', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5)),
                      const SizedBox(height: 14),
                      if (r.servicesDistribution.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          child: Center(child: Text('Nenhum serviço concluído no período.', style: TextStyle(color: palette.textFaint, fontSize: 12))),
                        )
                      else
                        Row(
                          children: [
                            SizedBox(
                              width: 120,
                              height: 120,
                              child: PieChart(
                                PieChartData(
                                  sectionsSpace: 2,
                                  centerSpaceRadius: 30,
                                  sections: r.servicesDistribution
                                      .map((s) => PieChartSectionData(
                                            value: s.value <= 0 ? 1 : s.value,
                                            color: _hex(s.color),
                                            radius: 22,
                                            showTitle: false,
                                          ))
                                      .toList(),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: r.servicesDistribution
                                    .map((s) => Padding(
                                          padding: const EdgeInsets.only(bottom: 6),
                                          child: Row(
                                            children: [
                                              Container(width: 8, height: 8, decoration: BoxDecoration(color: _hex(s.color), shape: BoxShape.circle)),
                                              const SizedBox(width: 8),
                                              Expanded(child: Text(s.name, style: TextStyle(color: palette.textSecondary, fontSize: 11.5), overflow: TextOverflow.ellipsis)),
                                              Text('${s.value.toStringAsFixed(0)}%', style: TextStyle(color: palette.textPrimary, fontSize: 11.5, fontWeight: FontWeight.w700)),
                                            ],
                                          ),
                                        ))
                                    .toList(),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Novos vs. clientes recorrentes', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5)),
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 140,
                        child: r.series.isEmpty
                            ? Center(child: Text('Sem dados no período', style: TextStyle(color: palette.textFaint, fontSize: 12)))
                            : BarChart(
                                BarChartData(
                                  gridData: const FlGridData(show: false),
                                  borderData: FlBorderData(show: false),
                                  titlesData: FlTitlesData(
                                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                    bottomTitles: AxisTitles(
                                      sideTitles: SideTitles(
                                        showTitles: true,
                                        reservedSize: 22,
                                        getTitlesWidget: (value, meta) {
                                          final i = value.toInt();
                                          if (i < 0 || i >= r.series.length) return const SizedBox.shrink();
                                          return Padding(
                                            padding: const EdgeInsets.only(top: 6),
                                            child: Text(r.series[i].label, style: TextStyle(color: palette.textFaint, fontSize: 10)),
                                          );
                                        },
                                      ),
                                    ),
                                  ),
                                  barGroups: r.series.asMap().entries.map((e) {
                                    final i = e.key;
                                    final point = e.value;
                                    return BarChartGroupData(x: i, barsSpace: 3, barRods: [
                                      BarChartRodData(toY: point.novos.toDouble(), color: accent, width: 7, borderRadius: BorderRadius.circular(3)),
                                      BarChartRodData(toY: point.retornantes.toDouble(), color: palette.textSecondary.withValues(alpha: 0.4), width: 7, borderRadius: BorderRadius.circular(3)),
                                    ]);
                                  }).toList(),
                                ),
                              ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _Legend(color: accent, label: 'Novos'),
                          const SizedBox(width: 16),
                          _Legend(color: palette.textSecondary.withValues(alpha: 0.4), label: 'Recorrentes'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text('Performance da equipe', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 10),
                if (r.staffPerformance.isEmpty)
                  Text('Nenhum atendimento concluído no período.', style: TextStyle(color: palette.textFaint)),
                ...r.staffPerformance.map((s) => RiseIn(
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(s.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5)),
                                Text('R\$ ${s.revenue.toStringAsFixed(0)}', style: TextStyle(color: accent, fontWeight: FontWeight.bold, fontSize: 13)),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: (s.pct / 100).clamp(0.0, 1.0),
                                minHeight: 5,
                                backgroundColor: palette.surfaceAlt,
                                valueColor: AlwaysStoppedAnimation(accent),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text('${s.appointments} cortes · comissão R\$ ${s.commission.toStringAsFixed(2)}', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                          ],
                        ),
                      ),
                    )),
                const SizedBox(height: 24),
                const _AttributionSection(),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _RangeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final AppPalette palette;
  final Color accent;

  const _RangeChip({required this.label, required this.selected, required this.onTap, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? accent.withValues(alpha: 0.18) : palette.surfaceAlt,
          borderRadius: BorderRadius.circular(12),
          border: selected ? Border.all(color: accent.withValues(alpha: 0.5)) : null,
        ),
        child: Text(label, style: TextStyle(color: selected ? palette.textPrimary : palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w700)),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final AppPalette palette;

  const _KpiCard({required this.label, required this.value, required this.icon, required this.color, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, size: 18, color: color),
          Text(value, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 14), overflow: TextOverflow.ellipsis),
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  final Color color;
  final String label;
  const _Legend({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(color: palette.textFaint, fontSize: 11)),
      ],
    );
  }
}

const _monthNamesFull = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/// Origem dos clientes (atribuição) — espelha a seção do web. Por mês: funil,
/// clientes novos, faturamento, custo por cliente novo e retorno, contatos por
/// canal, por campanha, e o rodapé honesto de "origem não identificada".
class _AttributionSection extends StatefulWidget {
  const _AttributionSection();

  @override
  State<_AttributionSection> createState() => _AttributionSectionState();
}

class _AttributionSectionState extends State<_AttributionSection> {
  final _repo = GestorRepository();
  late String _month;
  late Future<AttributionData> _future;
  final _spendCtrl = TextEditingController();
  bool _saving = false;

  List<MapEntry<String, String>> get _months {
    final now = DateTime.now();
    return List.generate(12, (i) {
      final d = DateTime(now.year, now.month - i, 1);
      final value = '${d.year}-${d.month.toString().padLeft(2, '0')}';
      return MapEntry(value, '${_monthNamesFull[d.month - 1]} ${d.year}');
    });
  }

  String _labelOf(String period) {
    final parts = period.split('-');
    final m = int.tryParse(parts.length > 1 ? parts[1] : '') ?? 1;
    return '${_monthNamesFull[(m - 1).clamp(0, 11)]} ${parts.first}';
  }

  Color _channelColor(String channel, Color accent) {
    switch (channel) {
      case 'CTWA':
        return const Color(0xFF25D366);
      case 'GOOGLE':
        return const Color(0xFF3B82F6);
      case 'GBP':
        return const Color(0xFF8B5CF6);
      case 'INSTAGRAM':
        return const Color(0xFFE1306C);
      case 'REFERRAL':
        return accent;
      case 'ORGANIC':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF71717A);
    }
  }

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    _future = _repo.attribution(month: _month);
  }

  @override
  void dispose() {
    _spendCtrl.dispose();
    super.dispose();
  }

  void _load() => setState(() => _future = _repo.attribution(month: _month));

  Future<void> _saveSpend() async {
    final v = double.tryParse(_spendCtrl.text.trim().replaceAll(',', '.'));
    if (v == null || v < 0) return;
    setState(() => _saving = true);
    try {
      await _repo.saveSpend(period: _month, amount: v);
      if (!mounted) return;
      _spendCtrl.clear();
      AppToast.success(context, 'Investimento salvo');
      _load();
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não consegui salvar');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text('Origem dos clientes', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(10)),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _month,
                  isDense: true,
                  dropdownColor: palette.surface,
                  style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600),
                  icon: Icon(Icons.expand_more_rounded, color: palette.textSecondary, size: 18),
                  items: _months.map((m) => DropdownMenuItem(value: m.key, child: Text(m.value))).toList(),
                  onChanged: (v) {
                    if (v == null || v == _month) return;
                    setState(() => _month = v);
                    _load();
                  },
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        FutureBuilder<AttributionData>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator()));
            }
            if (snap.hasError) {
              return Text('Não consegui carregar a origem dos clientes.', style: TextStyle(color: palette.textFaint, fontSize: 12));
            }
            final a = snap.data!;
            final maxContacts = a.byChannel.fold<int>(0, (m, c) => c.contacts > m ? c.contacts : m);

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: _FunnelTile(label: 'Chegaram', value: '${a.funnelContacts}', sub: null, palette: palette, accent: accent)),
                    const SizedBox(width: 8),
                    Expanded(child: _FunnelTile(label: 'Agendaram', value: '${a.funnelScheduled}', sub: '${a.schedRate}%', palette: palette, accent: accent)),
                    const SizedBox(width: 8),
                    Expanded(child: _FunnelTile(label: 'Compareceram', value: '${a.funnelShowed}', sub: '${a.showRate}%', palette: palette, accent: accent)),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(child: _MiniStat(label: 'Clientes novos', value: '${a.novos}', palette: palette)),
                    const SizedBox(width: 8),
                    Expanded(child: _MiniStat(label: 'Faturamento', value: 'R\$ ${a.attributedRevenue.toStringAsFixed(0)}', valueColor: accent, palette: palette)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: _MiniStat(label: 'Custo/cliente novo', value: a.perNewClient > 0 ? 'R\$ ${a.perNewClient.toStringAsFixed(2)}' : '—', palette: palette)),
                    const SizedBox(width: 8),
                    Expanded(child: _MiniStat(label: 'Retorno (ROAS)', value: a.roas > 0 ? '${a.roas.toStringAsFixed(2)}x' : '—', palette: palette)),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Quanto foi investido em ${_labelOf(_month)}?', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _spendCtrl,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              style: TextStyle(color: palette.textPrimary, fontSize: 14),
                              decoration: InputDecoration(
                                hintText: a.spend > 0 ? a.spend.toStringAsFixed(2) : '0,00',
                                hintStyle: TextStyle(color: palette.textFaint),
                                isDense: true,
                                filled: true,
                                fillColor: palette.surfaceAlt,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _saving ? null : _saveSpend,
                            style: ElevatedButton.styleFrom(backgroundColor: accent.withValues(alpha: 0.18), foregroundColor: accent, elevation: 0),
                            child: Text(_saving ? 'Salvando…' : 'Salvar'),
                          ),
                        ],
                      ),
                      if (a.spend > 0)
                        Padding(padding: const EdgeInsets.only(top: 6), child: Text('Atual: R\$ ${a.spend.toStringAsFixed(2)}', style: TextStyle(color: palette.textFaint, fontSize: 11))),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                if (a.byChannel.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Text('Ainda sem contatos rastreados neste mês. Assim que chegar mensagem de anúncio ou link rastreado, a origem aparece aqui.', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                  )
                else
                  ...a.byChannel.map((c) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(c.label, style: TextStyle(color: palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                                Text('${c.contacts} · ${c.showed} vieram · R\$ ${c.revenue.toStringAsFixed(0)}', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                              ],
                            ),
                            const SizedBox(height: 5),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: maxContacts > 0 ? (c.contacts / maxContacts).clamp(0.0, 1.0) : 0,
                                minHeight: 5,
                                backgroundColor: palette.surfaceAlt,
                                valueColor: AlwaysStoppedAnimation(_channelColor(c.channel, accent)),
                              ),
                            ),
                          ],
                        ),
                      )),
                if (a.byCampaign.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('POR CAMPANHA', style: TextStyle(color: palette.textFaint, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                  const SizedBox(height: 8),
                  ...a.byCampaign.map((c) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(11),
                        decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(child: Text(c.campaign, style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
                                Text('R\$ ${c.revenue.toStringAsFixed(0)}', style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text('${c.label} · ${c.contacts} contatos · ${c.novos} novos · ${c.showed} vieram', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                          ],
                        ),
                      )),
                ],
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(11),
                  decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline_rounded, size: 15, color: accent),
                      const SizedBox(width: 8),
                      Expanded(child: Text('${a.unidentifiedPct}% dos contatos estão com origem não identificada — e nunca os distribuímos entre as campanhas por estimativa.', style: TextStyle(color: palette.textFaint, fontSize: 11, height: 1.35))),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _FunnelTile extends StatelessWidget {
  final String label;
  final String value;
  final String? sub;
  final AppPalette palette;
  final Color accent;

  const _FunnelTile({required this.label, required this.value, required this.sub, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
      child: Column(
        children: [
          Text(value, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5), textAlign: TextAlign.center),
          if (sub != null) Padding(padding: const EdgeInsets.only(top: 3), child: Text(sub!, style: TextStyle(color: accent, fontSize: 10))),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final AppPalette palette;

  const _MiniStat({required this.label, required this.value, this.valueColor, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
          const SizedBox(height: 3),
          Text(value, style: TextStyle(color: valueColor ?? palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15), overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
