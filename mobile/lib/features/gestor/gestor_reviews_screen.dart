import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/skeleton.dart';
import 'gestor_repository.dart';

const _amber = Color(0xFFFBBF24);
const _avatarPalette = [Color(0xFFF59E0B), Color(0xFF38BDF8), Color(0xFF8B5CF6), Color(0xFF34D399), Color(0xFFFB7185)];

Color _avatarColor(String name) {
  var h = 0;
  for (final c in name.codeUnits) {
    h = (h * 31 + c) & 0x7fffffff;
  }
  return _avatarPalette[h % _avatarPalette.length];
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  return parts.map((e) => e[0]).take(2).join().toUpperCase();
}

String _timeAgo(String iso) {
  final t = DateTime.tryParse(iso);
  if (t == null) return '';
  final days = DateTime.now().difference(t).inDays;
  if (days <= 0) return 'hoje';
  if (days == 1) return 'ontem';
  if (days < 30) return 'há $days dias';
  final m = days ~/ 30;
  if (m < 12) return 'há $m ${m == 1 ? "mês" : "meses"}';
  return 'há ${m ~/ 12} ano(s)';
}

class _Stars extends StatelessWidget {
  final double value;
  final double size;
  const _Stars({required this.value, this.size = 16});
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final filled = i < value.round();
        return Icon(filled ? Icons.star_rounded : Icons.star_border_rounded, size: size, color: filled ? _amber : Colors.white24);
      }),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String name;
  final double size;
  final String? overrideText;
  const _Avatar(this.name, {this.size = 40, this.overrideText});
  @override
  Widget build(BuildContext context) {
    final c = _avatarColor(name);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: c.withValues(alpha: 0.16), shape: BoxShape.circle, border: Border.all(color: c.withValues(alpha: 0.4))),
      alignment: Alignment.center,
      child: Text(overrideText ?? _initials(name), style: TextStyle(color: c, fontWeight: FontWeight.w900, fontSize: size * 0.32)),
    );
  }
}

class GestorReviewsScreen extends StatefulWidget {
  const GestorReviewsScreen({super.key});

  @override
  State<GestorReviewsScreen> createState() => _GestorReviewsScreenState();
}

class _GestorReviewsScreenState extends State<GestorReviewsScreen> {
  final _repository = GestorRepository();
  late Future<ReviewsData> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.reviews();
  }

  void _refresh() => setState(() => _future = _repository.reviews());

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Avaliações'), elevation: 0),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<ReviewsData>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return ListView(padding: const EdgeInsets.all(16), children: const [SkeletonBox(height: 150, borderRadius: 24), SizedBox(height: 16), SkeletonBox(height: 76, borderRadius: 18), SizedBox(height: 10), SkeletonBox(height: 76, borderRadius: 18)]);
            }
            if (snapshot.hasError) {
              return ListView(children: [const SizedBox(height: 80), Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent)))]);
            }
            final data = snapshot.data!;
            if (data.count == 0) {
              return ListView(children: [
                const SizedBox(height: 100),
                Icon(Icons.reviews_outlined, size: 46, color: palette.textFaint),
                const SizedBox(height: 14),
                Center(child: Text('Ainda sem avaliações', style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.w700, fontSize: 15))),
                const SizedBox(height: 4),
                Center(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 44), child: Text('Quando os clientes avaliarem pelo app, elas aparecem aqui em tempo real.', textAlign: TextAlign.center, style: TextStyle(color: palette.textFaint, fontSize: 12.5)))),
              ]);
            }

            final maxDist = [5, 4, 3, 2, 1].map((s) => data.distribution[s] ?? 0).fold<int>(1, (a, b) => b > a ? b : a);

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                // Hero: average + distribution
                RiseIn(
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [palette.surface, palette.bg]),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: palette.border),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Column(
                          children: [
                            Text(data.average.toStringAsFixed(1), style: TextStyle(color: palette.textPrimary, fontSize: 42, fontWeight: FontWeight.w900, height: 1)),
                            const SizedBox(height: 6),
                            _Stars(value: data.average, size: 16),
                            const SizedBox(height: 6),
                            Text('${data.count} avaliaç${data.count == 1 ? "ão" : "ões"}', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                          ],
                        ),
                        const SizedBox(width: 18),
                        Container(width: 1, height: 96, color: palette.border),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            children: [5, 4, 3, 2, 1].map((star) {
                              final n = data.distribution[star] ?? 0;
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 3),
                                child: Row(
                                  children: [
                                    SizedBox(width: 12, child: Text('$star', style: TextStyle(color: palette.textFaint, fontSize: 11), textAlign: TextAlign.right)),
                                    const SizedBox(width: 2),
                                    Icon(Icons.star_rounded, size: 10, color: palette.textFaint),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(4),
                                        child: LinearProgressIndicator(
                                          value: n / maxDist,
                                          minHeight: 7,
                                          backgroundColor: palette.surfaceAlt,
                                          valueColor: const AlwaysStoppedAnimation(_amber),
                                        ),
                                      ),
                                    ),
                                    SizedBox(width: 22, child: Text('$n', style: TextStyle(color: palette.textFaint, fontSize: 11), textAlign: TextAlign.right)),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                if (data.byBarber.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text('RANKING DA EQUIPE', style: TextStyle(color: palette.textFaint, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                  const SizedBox(height: 10),
                  ...data.byBarber.asMap().entries.map((e) {
                    final b = e.value;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16)),
                      child: Row(
                        children: [
                          _Avatar(b.name, size: 42, overrideText: e.key == 0 ? '🏆' : null),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(b.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 3),
                                Row(children: [_Stars(value: b.average, size: 12), const SizedBox(width: 6), Text('${b.average.toStringAsFixed(1)} · ${b.count}', style: TextStyle(color: palette.textFaint, fontSize: 11))]),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],

                const SizedBox(height: 20),
                Text('COMENTÁRIOS', style: TextStyle(color: palette.textFaint, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: 10),
                ...data.reviews.asMap().entries.map((e) {
                  final r = e.value;
                  return RiseIn(
                    delay: Duration(milliseconds: 20 * e.key),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              _Avatar(r.clientName, size: 38),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(r.clientName, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis),
                                    Text('${r.staffName}${r.serviceName != null ? ' · ${r.serviceName}' : ''}', style: TextStyle(color: palette.textFaint, fontSize: 11), overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                              Text(_timeAgo(r.createdAt), style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          _Stars(value: r.rating.toDouble(), size: 14),
                          if (r.comment != null && r.comment!.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.only(left: 10),
                              decoration: const BoxDecoration(border: Border(left: BorderSide(color: _amber, width: 2))),
                              child: Text(r.comment!, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.45)),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
              ],
            );
          },
        ),
      ),
    );
  }
}
