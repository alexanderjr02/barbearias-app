import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
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
