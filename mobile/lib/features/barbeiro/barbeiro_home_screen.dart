import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/bell_sheet.dart';
import '../auth/session_provider.dart';
import '../gestor/brand_controller.dart';
import 'barber_repository.dart';
import 'client_ranking_screen.dart';
import 'finalize_appointment_screen.dart';

const _upcomingStatuses = {'SCHEDULED', 'CONFIRMED'};

class BarbeiroHomeScreen extends StatefulWidget {
  const BarbeiroHomeScreen({super.key});

  @override
  State<BarbeiroHomeScreen> createState() => _BarbeiroHomeScreenState();
}

class _HomeData {
  final List<BarberAppointment> appointments;
  final List<ClientRankingEntry> ranking;
  final BarberStats stats;
  _HomeData(this.appointments, this.ranking, this.stats);
}

class _BarbeiroHomeScreenState extends State<BarbeiroHomeScreen> {
  final _repository = BarberRepository();
  late Future<_HomeData> _future;
  BrandController? _brand;
  List<GestorAnnouncement> _announcements = [];
  int _unreadNotifications = 0;

  @override
  void initState() {
    super.initState();
    _future = _load();
    _loadAnnouncements();
    _loadNotificationCount();
  }

  Future<void> _loadAnnouncements() async {
    try {
      final list = await _repository.activeAnnouncements();
      if (mounted) setState(() => _announcements = list);
    } catch (_) {
      // Non-critical — the bell just stays empty if this fails.
    }
  }

  Future<void> _loadNotificationCount() async {
    try {
      final result = await _repository.notifications();
      if (mounted) setState(() => _unreadNotifications = result.unreadCount);
    } catch (_) {
      // Non-critical — the bell just stays empty if this fails.
    }
  }

  void _refreshBell() {
    _loadAnnouncements();
    _loadNotificationCount();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final brand = context.read<BrandController>();
    if (!identical(brand, _brand)) {
      _brand?.removeListener(_onBrandChanged);
      _brand = brand;
      _brand!.addListener(_onBrandChanged);
    }
  }

  @override
  void dispose() {
    _brand?.removeListener(_onBrandChanged);
    super.dispose();
  }

  void _onBrandChanged() {
    if (mounted) setState(() {});
  }

  Future<_HomeData> _load() async {
    final results = await Future.wait([_repository.myAppointments(), _repository.clientRanking(), _repository.myStats()]);
    return _HomeData(results[0] as List<BarberAppointment>, results[1] as List<ClientRankingEntry>, results[2] as BarberStats);
  }

  void _refresh() {
    setState(() => _future = _load());
    _brand?.refresh();
  }

  Future<void> _setStatus(BarberAppointment apt, String status) async {
    try {
      await _repository.updateStatus(apt.id, status);
      _refresh();
    } on ApiException catch (e) {
      if (mounted) {
        AppToast.error(context, e.message);
      }
    }
  }

  Future<void> _finalize(BarberAppointment apt) async {
    final done = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => FinalizeAppointmentScreen(
        appointmentId: apt.id,
        clientId: apt.clientId,
        clientName: apt.clientName,
        referencePhoto: apt.referencePhoto,
        existingResultPhoto: apt.resultPhoto,
      ),
    ));
    if (done == true) _refresh();
  }

  Color _statusColor(String status) {
    return appointmentStatusColor(status, AppPalette.of(context));
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    } catch (_) {
      return isoDate;
    }
  }

  void _showClientHistory(BarberAppointment apt) {
    final future = _repository.clientHistory(apt.id);
    final palette = AppPalette.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => FutureBuilder<ClientHistory>(
          future: future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent)));
            }
            final history = snapshot.data!;
            final accent = Theme.of(context).colorScheme.primary;
            return ListView(
              controller: scrollController,
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                Text(history.clientName, style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(
                  '${history.totalVisits} ${history.totalVisits == 1 ? 'visita concluída' : 'visitas concluídas'} · R\$ ${history.totalSpent.toStringAsFixed(2)} gastos',
                  style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 18),
                Text('Histórico', style: TextStyle(color: palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 10),
                ...history.visits.map(
                  (v) => Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${v.serviceName} · com ${v.staffName}', style: TextStyle(color: palette.textPrimary, fontSize: 13)),
                              const SizedBox(height: 2),
                              Text('${_formatDate(v.date)} · ${v.startTime}', style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('R\$ ${v.totalPrice.toStringAsFixed(2)}', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(v.status, style: TextStyle(color: _statusColor(v.status), fontSize: 10, fontWeight: FontWeight.w600)),
                          ],
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

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>();
    final accent = Theme.of(context).colorScheme.primary;
    final palette = AppPalette.of(context);
    final firstName = session.session?.name.split(' ').first ?? '';
    final avatarUrl = resolveAssetUrl(session.session?.avatar);
    final onAccent = contrastingTextColor(accent);
    final brand = _brand?.profile;
    final coverUrl = resolveAssetUrl(brand?.coverImage);

    return Scaffold(
      backgroundColor: palette.bg,
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<_HomeData>(
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
            final appointments = snapshot.data?.appointments ?? [];
            final ranking = snapshot.data?.ranking ?? [];
            final stats = snapshot.data?.stats;
            final upcoming = appointments.where((a) => _upcomingStatuses.contains(a.status)).toList();
            final next = upcoming.isEmpty ? null : upcoming.first;
            final todayKey = DateTime.now();
            final todayStr = '${todayKey.year.toString().padLeft(4, '0')}-${todayKey.month.toString().padLeft(2, '0')}-${todayKey.day.toString().padLeft(2, '0')}';
            final todayCount = appointments.where((a) => a.date.startsWith(todayStr)).length;

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [accent.withValues(alpha: 0.18), palette.bg]),
                      image: coverUrl != null
                          ? DecorationImage(image: NetworkImage(coverUrl), fit: BoxFit.cover, colorFilter: ColorFilter.mode(palette.bg.withValues(alpha: 0.45), BlendMode.darken))
                          : null,
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${_greeting()},', style: TextStyle(color: palette.textSecondary, fontSize: 14)),
                                Text(firstName, style: TextStyle(color: palette.textPrimary, fontSize: 24, fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 2),
                                Text('$todayCount atendimento${todayCount == 1 ? '' : 's'} hoje', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                              ],
                            ),
                          ),
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              IconButton(
                                onPressed: () => BellSheet.show(
                                  context,
                                  announcements: _announcements,
                                  onDismissAnnouncement: _repository.dismissAnnouncement,
                                  onFetchNotifications: _repository.notifications,
                                  onMarkAllRead: _repository.markAllNotificationsRead,
                                  onChanged: _refreshBell,
                                ),
                                icon: Icon(Icons.notifications_outlined, color: palette.textPrimary),
                              ),
                              if (_announcements.isNotEmpty || _unreadNotifications > 0)
                                Positioned(
                                  top: 10,
                                  right: 10,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(color: accent, shape: BoxShape.circle, border: Border.all(color: palette.bg, width: 1.5)),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(width: 4),
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: palette.surfaceAlt,
                            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                            child: avatarUrl == null ? Text(firstName.isNotEmpty ? firstName[0].toUpperCase() : '?', style: TextStyle(color: palette.textSecondary)) : null,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      if (stats != null) ...[
                        RiseIn(
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(gradient: LinearGradient(colors: [accent, accent.withValues(alpha: 0.7)]), borderRadius: BorderRadius.circular(16)),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Sua comissão este mês', style: TextStyle(color: onAccent.withValues(alpha: 0.75), fontWeight: FontWeight.w600, fontSize: 13)),
                                    Text('R\$ ${stats.commission.toStringAsFixed(2)}', style: TextStyle(color: onAccent, fontWeight: FontWeight.w900, fontSize: 22)),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(color: onAccent.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(20)),
                                  child: Text('${(stats.commissionRate * 100).toStringAsFixed(0)}% comissão', style: TextStyle(color: onAccent.withValues(alpha: 0.85), fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        RiseIn(
                          delay: const Duration(milliseconds: 30),
                          child: Row(
                            children: [
                              Expanded(child: _MiniStat(icon: Icons.content_cut, label: 'Concluídos no mês', value: '${stats.completedCount}', palette: palette)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _MiniStat(
                                  icon: Icons.star_rounded,
                                  iconColor: Colors.amber,
                                  label: 'Avaliação média',
                                  value: stats.avgRating != null ? stats.avgRating!.toStringAsFixed(1) : '—',
                                  palette: palette,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 22),
                      ],
                      if (ranking.isNotEmpty) ...[
                        RiseIn(delay: const Duration(milliseconds: 60), child: _RankingTeaser(ranking: ranking, accent: accent, palette: palette)),
                        const SizedBox(height: 22),
                      ],
                      Text('Próximo atendimento', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      if (next == null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8, bottom: 8),
                          child: Center(child: Text('Nenhum agendamento futuro.', style: TextStyle(color: palette.textFaint))),
                        )
                      else
                        RiseIn(
                          delay: const Duration(milliseconds: 90),
                          child: _AgendaCard(
                            apt: next,
                            isNext: true,
                            accent: accent,
                            palette: palette,
                            statusColor: _statusColor(next.status),
                            onTap: () => _showClientHistory(next),
                            onNoShow: () => _setStatus(next, 'NO_SHOW'),
                            onComplete: () => _finalize(next),
                          ),
                        ),
                    ]),
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

class _MiniStat extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String label;
  final String value;
  final AppPalette palette;

  const _MiniStat({required this.icon, this.iconColor, required this.label, required this.value, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: iconColor ?? palette.textSecondary),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _RankingTeaser extends StatelessWidget {
  final List<ClientRankingEntry> ranking;
  final Color accent;
  final AppPalette palette;

  const _RankingTeaser({required this.ranking, required this.accent, required this.palette});

  static const _medalColors = [Color(0xFFF5C518), Color(0xFFC7CDD6), Color(0xFFCD8155)];

  String _initials(String name) => name.trim().isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase();

  @override
  Widget build(BuildContext context) {
    final top = ranking.take(3).toList();
    return GlassPanel(
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.emoji_events_rounded, color: Color(0xFFF5C518), size: 18),
              const SizedBox(width: 6),
              Text('Clientes mais fiéis', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              const Spacer(),
              GestureDetector(
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ClientRankingScreen())),
                child: Row(
                  children: [
                    Text('Ver todos', style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w600)),
                    Icon(Icons.chevron_right, color: accent, size: 16),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: top.asMap().entries.map((entry) {
              final i = entry.key;
              final client = entry.value;
              final avatarUrl = resolveAssetUrl(client.avatar);
              final color = _medalColors[i];
              return Expanded(
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: color, width: 2)),
                          child: CircleAvatar(
                            backgroundColor: palette.surfaceAlt,
                            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                            child: avatarUrl == null ? Text(_initials(client.name), style: TextStyle(color: palette.textSecondary, fontSize: 12, fontWeight: FontWeight.bold)) : null,
                          ),
                        ),
                        Positioned(
                          bottom: -2,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5),
                            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
                            child: Text('${i + 1}°', style: const TextStyle(color: Colors.black, fontSize: 9, fontWeight: FontWeight.w900)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(client.name.split(' ').first, style: TextStyle(color: palette.textPrimary, fontSize: 11.5, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text('${client.visits} visitas', style: TextStyle(color: color, fontSize: 10)),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _AgendaCard extends StatelessWidget {
  final BarberAppointment apt;
  final bool isNext;
  final Color accent;
  final AppPalette palette;
  final Color statusColor;
  final VoidCallback onTap;
  final VoidCallback onNoShow;
  final VoidCallback onComplete;

  const _AgendaCard({
    required this.apt,
    required this.isNext,
    required this.accent,
    required this.palette,
    required this.statusColor,
    required this.onTap,
    required this.onNoShow,
    required this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    final canAct = apt.status == 'SCHEDULED' || apt.status == 'CONFIRMED';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(16),
        border: isNext ? Border.all(color: accent.withValues(alpha: 0.5)) : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          children: [
            Container(width: 4, color: isNext ? accent : statusColor.withValues(alpha: 0.6)),
            Expanded(
              child: InkWell(
                onTap: onTap,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (isNext) ...[
                        Row(
                          children: [
                            Container(width: 6, height: 6, decoration: BoxDecoration(color: accent, shape: BoxShape.circle)),
                            const SizedBox(width: 6),
                            Text('PRÓXIMO ATENDIMENTO', style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.4)),
                          ],
                        ),
                        const SizedBox(height: 6),
                      ],
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Flexible(
                                  child: Text(apt.clientName, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15), overflow: TextOverflow.ellipsis),
                                ),
                                const SizedBox(width: 4),
                                Icon(Icons.chevron_right, size: 16, color: palette.textFaint),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                            child: Text(apt.status, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text('${apt.serviceName} · ${apt.startTime}', style: TextStyle(color: palette.textSecondary, fontSize: 13)),
                      Text('R\$ ${apt.totalPrice.toStringAsFixed(2)}', style: TextStyle(color: accent, fontWeight: FontWeight.bold)),
                      if (canAct) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: onNoShow,
                                style: OutlinedButton.styleFrom(foregroundColor: Colors.redAccent),
                                child: const Text('Não veio'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: onComplete,
                                style: ElevatedButton.styleFrom(backgroundColor: accent),
                                child: Text('Concluir', style: TextStyle(color: contrastingTextColor(accent))),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
