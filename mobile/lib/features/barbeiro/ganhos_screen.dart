import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import 'barber_repository.dart';

class GanhosScreen extends StatefulWidget {
  const GanhosScreen({super.key});

  @override
  State<GanhosScreen> createState() => _GanhosScreenState();
}

class _GanhosScreenState extends State<GanhosScreen> {
  final _repository = BarberRepository();
  late Future<(BarberStats, BarberTips)> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<(BarberStats, BarberTips)> _load() async {
    final results = await Future.wait([_repository.myStats(), _repository.myTips()]);
    return (results[0] as BarberStats, results[1] as BarberTips);
  }

  void _refresh() => setState(() => _future = _load());

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, elevation: 0, title: const Text('Meus ganhos')),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<(BarberStats, BarberTips)>(
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
            final stats = snapshot.data!.$1;
            final tips = snapshot.data!.$2;
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                RiseIn(
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [accent, accent.withValues(alpha: 0.65)]),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.25), blurRadius: 24, offset: const Offset(0, 12))],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Sua comissão este mês', style: TextStyle(color: onAccent.withValues(alpha: 0.75), fontWeight: FontWeight.w600, fontSize: 13)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: onAccent.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(20)),
                              child: Text('${(stats.commissionRate * 100).toStringAsFixed(0)}%', style: TextStyle(color: onAccent.withValues(alpha: 0.85), fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text('R\$ ${stats.commission.toStringAsFixed(2)}', style: TextStyle(color: onAccent, fontWeight: FontWeight.w900, fontSize: 30)),
                        const SizedBox(height: 4),
                        Text('de R\$ ${stats.monthRevenue.toStringAsFixed(2)} em receita gerada', style: TextStyle(color: onAccent.withValues(alpha: 0.65), fontSize: 12)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                RiseIn(
                  delay: const Duration(milliseconds: 40),
                  child: Row(
                    children: [
                      Expanded(child: _StatCard(icon: Icons.content_cut_rounded, label: 'Atendimentos concluídos', value: '${stats.completedCount}', color: palette.textSecondary, palette: palette)),
                      const SizedBox(width: 12),
                      Expanded(child: _StatCard(icon: Icons.confirmation_number_outlined, label: 'Ticket médio', value: 'R\$ ${stats.avgTicket.toStringAsFixed(2)}', color: palette.textSecondary, palette: palette)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                RiseIn(
                  delay: const Duration(milliseconds: 60),
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: palette.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: accent.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), shape: BoxShape.circle),
                          child: Icon(Icons.volunteer_activism_rounded, color: accent, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Gorjetas este mês', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                              const SizedBox(height: 2),
                              Text('R\$ ${tips.total.toStringAsFixed(2)}', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 20)),
                            ],
                          ),
                        ),
                        Text(
                          tips.count == 0 ? 'nenhuma ainda' : '${tips.count} ${tips.count == 1 ? 'gorjeta' : 'gorjetas'}',
                          style: TextStyle(color: palette.textFaint, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text('Avaliação dos clientes', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 12),
                RiseIn(
                  delay: const Duration(milliseconds: 80),
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16)),
                    child: stats.avgRating == null
                        ? Row(
                            children: [
                              Icon(Icons.star_border_rounded, color: palette.textFaint, size: 28),
                              const SizedBox(width: 12),
                              Expanded(child: Text('Você ainda não recebeu avaliações.', style: TextStyle(color: palette.textFaint))),
                            ],
                          )
                        : Row(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(color: Colors.amber.withValues(alpha: 0.12), shape: BoxShape.circle),
                                alignment: Alignment.center,
                                child: Text(stats.avgRating!.toStringAsFixed(1), style: const TextStyle(color: Colors.amber, fontSize: 18, fontWeight: FontWeight.w900)),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: List.generate(5, (i) {
                                        final filled = i < stats.avgRating!.round();
                                        return Icon(filled ? Icons.star_rounded : Icons.star_border_rounded, color: Colors.amber, size: 18);
                                      }),
                                    ),
                                    const SizedBox(height: 4),
                                    Text('${stats.ratingCount} avaliações', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final AppPalette palette;

  const _StatCard({required this.icon, required this.label, required this.value, required this.color, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 10),
          Text(value, style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 11)),
        ],
      ),
    );
  }
}
