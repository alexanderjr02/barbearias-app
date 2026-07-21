import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../gestor_repository.dart';

/// "Receita vs Despesas" area-style line chart with a week/month toggle —
/// the mobile equivalent of the web's `RevenueChart` component, reused on
/// both the Dashboard and the Relatórios screen.
class RevenueChartCard extends StatefulWidget {
  const RevenueChartCard({super.key});

  @override
  State<RevenueChartCard> createState() => _RevenueChartCardState();
}

class _RevenueChartCardState extends State<RevenueChartCard> {
  final _repository = GestorRepository();
  String _range = 'week';
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

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18)),
      child: FutureBuilder<ReportsData>(
        future: _future,
        builder: (context, snapshot) {
          final series = snapshot.data?.series ?? const <ReportSeriesPoint>[];
          final totalReceita = series.fold<double>(0, (a, s) => a + s.receita);
          final totalDespesas = series.fold<double>(0, (a, s) => a + s.despesas);
          final maxY = series.fold<double>(1, (a, s) => [a, s.receita, s.despesas].reduce((x, y) => x > y ? x : y));

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Visão financeira', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5)),
                      Text('Receita vs Despesas', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(10)),
                    child: Row(
                      children: [
                        _RangeButton(label: 'Semana', selected: _range == 'week', onTap: () => _setRange('week'), palette: palette),
                        _RangeButton(label: 'Mês', selected: _range == 'month', onTap: () => _setRange('month'), palette: palette),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (snapshot.connectionState == ConnectionState.waiting)
                const SizedBox(height: 160, child: Center(child: CircularProgressIndicator()))
              else if (snapshot.hasError)
                SizedBox(height: 160, child: Center(child: Text('Erro ao carregar gráfico', style: TextStyle(color: palette.textFaint))))
              else ...[
                Row(
                  children: [
                    Expanded(child: _MiniTotal(label: 'Receita total', value: totalReceita, color: const Color(0xFFF59E0B), palette: palette)),
                    const SizedBox(width: 10),
                    Expanded(child: _MiniTotal(label: 'Despesas', value: totalDespesas, color: Colors.redAccent, palette: palette)),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 160,
                  child: series.isEmpty
                      ? Center(child: Text('Sem dados no período', style: TextStyle(color: palette.textFaint, fontSize: 12)))
                      : LineChart(
                          LineChartData(
                            // Recorta o desenho ao retângulo do gráfico. Sem
                            // isto, um valor absurdo (ex.: uma despesa -9999
                            // lançada por engano) desenha um pico cuja linha e
                            // área vermelha VAZAM pra fora e pintam uma faixa
                            // vermelha na tela inteira. Com o clip, dado ruim
                            // fica contido no gráfico e nunca quebra a tela.
                            clipData: const FlClipData.all(),
                            minY: 0,
                            maxY: maxY * 1.15,
                            gridData: FlGridData(
                              show: true,
                              drawVerticalLine: false,
                              horizontalInterval: maxY / 3 == 0 ? 1 : maxY / 3,
                              getDrawingHorizontalLine: (_) => FlLine(color: palette.border, strokeWidth: 1),
                            ),
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
                                    if (i < 0 || i >= series.length) return const SizedBox.shrink();
                                    return Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Text(series[i].label, style: TextStyle(color: palette.textFaint, fontSize: 10)),
                                    );
                                  },
                                ),
                              ),
                            ),
                            lineTouchData: LineTouchData(
                              touchTooltipData: LineTouchTooltipData(
                                getTooltipColor: (_) => palette.surfaceAlt,
                                getTooltipItems: (spots) => spots
                                    .map((s) => LineTooltipItem(
                                          'R\$ ${s.y.toStringAsFixed(0)}',
                                          TextStyle(color: s.barIndex == 0 ? const Color(0xFFF59E0B) : Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold),
                                        ))
                                    .toList(),
                              ),
                            ),
                            lineBarsData: [
                              _line(series.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.receita)).toList(), const Color(0xFFF59E0B)),
                              _line(series.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.despesas)).toList(), Colors.redAccent),
                            ],
                          ),
                        ),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _Legend(color: const Color(0xFFF59E0B), label: 'Receita'),
                    const SizedBox(width: 16),
                    _Legend(color: Colors.redAccent, label: 'Despesas'),
                  ],
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  LineChartBarData _line(List<FlSpot> spots, Color color) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      color: color,
      barWidth: 2,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(show: true, color: color.withValues(alpha: 0.14)),
    );
  }
}

class _RangeButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final AppPalette palette;

  const _RangeButton({required this.label, required this.selected, required this.onTap, required this.palette});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: selected ? palette.surface : Colors.transparent, borderRadius: BorderRadius.circular(8)),
        child: Text(label, style: TextStyle(color: selected ? palette.textPrimary : palette.textFaint, fontSize: 11.5, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _MiniTotal extends StatelessWidget {
  final String label;
  final double value;
  final Color color;
  final AppPalette palette;

  const _MiniTotal({required this.label, required this.value, required this.color, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
          const SizedBox(height: 2),
          Text('R\$ ${value.toStringAsFixed(2)}', style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.bold)),
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
        Container(width: 10, height: 3, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(color: palette.textFaint, fontSize: 11)),
      ],
    );
  }
}
