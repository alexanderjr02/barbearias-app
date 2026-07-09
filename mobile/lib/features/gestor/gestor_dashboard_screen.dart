import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/bell_sheet.dart';
import '../../core/widgets/skeleton.dart';
import '../auth/session_provider.dart';
import 'brand_controller.dart';
import 'gestor_repository.dart';
import 'widgets/nps_prompt_sheet.dart';
import 'widgets/onboarding_checklist_card.dart';
import 'widgets/revenue_chart_card.dart';

class GestorDashboardScreen extends StatefulWidget {
  const GestorDashboardScreen({super.key});

  @override
  State<GestorDashboardScreen> createState() => _GestorDashboardScreenState();
}

class _GestorDashboardScreenState extends State<GestorDashboardScreen> {
  final _repository = GestorRepository();
  late Future<DashboardSummary> _future;
  BrandController? _brand;
  List<GestorAnnouncement> _announcements = [];
  int _unreadNotifications = 0;

  @override
  void initState() {
    super.initState();
    _future = _repository.dashboardSummary();
    _loadAnnouncements();
    _loadNotificationCount();
    _maybePromptNps();
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

  Future<void> _maybePromptNps() async {
    try {
      final shouldPrompt = await _repository.npsShouldPrompt();
      if (shouldPrompt && mounted) {
        NpsPromptSheet.show(context, repository: _repository);
      }
    } catch (_) {
      // Non-critical — simply skip the prompt this session.
    }
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

  void _refresh() {
    setState(() => _future = _repository.dashboardSummary());
    context.read<BrandController>().refresh();
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  String _pctChange(double current, double previous) {
    if (previous == 0) return current > 0 ? '+100%' : '0%';
    final pct = ((current - previous) / previous * 100).round();
    return '${pct >= 0 ? '+' : ''}$pct%';
  }

  Color _statusColor(String status) {
    return appointmentStatusColor(status, AppPalette.of(context));
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>().session;
    final brand = _brand?.profile;
    final coverUrl = resolveAssetUrl(brand?.coverImage);
    final logoUrl = resolveAssetUrl(brand?.logo);
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);
    final palette = AppPalette.of(context);
    final firstName = session?.name.split(' ').first ?? '';

    return Scaffold(
      backgroundColor: palette.bg,
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<DashboardSummary>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 90, 16, 20),
                children: [
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.5,
                    children: List.generate(4, (_) => const SkeletonBox(height: 90, borderRadius: 16)),
                  ),
                  const SizedBox(height: 12),
                  const SkeletonBox(height: 64, borderRadius: 16),
                  const SizedBox(height: 20),
                  const SkeletonBox(height: 160, borderRadius: 16),
                ],
              );
            }
            if (snapshot.hasError) {
              return ListView(children: [
                const SizedBox(height: 80),
                Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent))),
              ]);
            }
            final s = snapshot.data!;
            final revenueUp = s.todayRevenue >= s.yesterdayRevenue;

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [accent.withValues(alpha: 0.18), palette.bg]),
                      image: coverUrl != null
                          ? DecorationImage(
                              image: NetworkImage(coverUrl),
                              fit: BoxFit.cover,
                              colorFilter: ColorFilter.mode(palette.bg.withValues(alpha: 0.45), BlendMode.darken),
                            )
                          : null,
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          if (logoUrl != null) ...[
                            CircleAvatar(radius: 22, backgroundColor: palette.surfaceAlt, backgroundImage: NetworkImage(logoUrl)),
                            const SizedBox(width: 12),
                          ],
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${_greeting()},', style: TextStyle(color: palette.textSecondary, fontSize: 14)),
                                Text(firstName, style: TextStyle(color: palette.textPrimary, fontSize: 24, fontWeight: FontWeight.w800)),
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
                        ],
                      ),
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: OnboardingChecklistCard()),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      RiseIn(
                        child: GridView.count(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.5,
                          children: [
                            _StatCard(
                              icon: Icons.attach_money_rounded,
                              iconColor: palette.textSecondary,
                              label: 'Receita hoje',
                              value: 'R\$ ${s.todayRevenue.toStringAsFixed(2)}',
                              trend: _pctChange(s.todayRevenue, s.yesterdayRevenue),
                              trendUp: revenueUp,
                              palette: palette,
                            ),
                            _StatCard(
                              icon: Icons.event_available_rounded,
                              iconColor: palette.textSecondary,
                              label: 'Agendamentos hoje',
                              value: '${s.todayCount}',
                              sub: '${s.unconfirmedToday} não confirmados',
                              palette: palette,
                            ),
                            _StatCard(
                              icon: Icons.groups_rounded,
                              iconColor: palette.textSecondary,
                              label: 'Clientes ativos',
                              value: '${s.activeClients}',
                              sub: 'últimos 90 dias',
                              palette: palette,
                            ),
                            _StatCard(
                              icon: Icons.trending_up_rounded,
                              iconColor: palette.textSecondary,
                              label: 'Ticket médio',
                              value: 'R\$ ${s.avgTicket.toStringAsFixed(2)}',
                              sub: 'este mês',
                              palette: palette,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      RiseIn(
                        delay: const Duration(milliseconds: 60),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(gradient: LinearGradient(colors: [accent, accent.withValues(alpha: 0.7)]), borderRadius: BorderRadius.circular(16)),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Receita mensal', style: TextStyle(color: onAccent.withValues(alpha: 0.75), fontWeight: FontWeight.w600, fontSize: 13)),
                              Text('R\$ ${s.monthRevenue.toStringAsFixed(2)}', style: TextStyle(color: onAccent, fontWeight: FontWeight.w900, fontSize: 20)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const RiseIn(delay: Duration(milliseconds: 80), child: RevenueChartCard()),
                      const SizedBox(height: 24),
                      Text('Top Barbeiros', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      if (s.topBarbers.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text('Nenhum atendimento concluído este mês ainda.', style: TextStyle(color: palette.textFaint)),
                        ),
                      ...s.topBarbers.asMap().entries.map((entry) {
                        final i = entry.key;
                        final b = entry.value;
                        return RiseIn(
                          delay: Duration(milliseconds: 40 * i),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 18,
                                  backgroundColor: i == 0 ? accent : palette.surfaceAlt,
                                  child: Text(
                                    b.name.split(' ').map((n) => n[0]).take(2).join().toUpperCase(),
                                    style: TextStyle(color: i == 0 ? onAccent : palette.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(b.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis),
                                          Text('${b.appointments} cortes', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(4),
                                        child: LinearProgressIndicator(
                                          value: b.share.clamp(0.0, 1.0),
                                          minHeight: 5,
                                          backgroundColor: palette.surfaceAlt,
                                          valueColor: AlwaysStoppedAnimation(accent),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text('R\$ ${b.revenue.toStringAsFixed(0)}', style: TextStyle(color: accent, fontWeight: FontWeight.bold, fontSize: 12.5)),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 24),
                      Text('Agendamentos de hoje', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      if (s.recentAppointments.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text('Nenhum agendamento para hoje.', style: TextStyle(color: palette.textFaint)),
                        ),
                      ...s.recentAppointments.map((a) => Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                            child: Row(
                              children: [
                                Container(width: 4, height: 34, decoration: BoxDecoration(color: _statusColor(a.status), borderRadius: BorderRadius.circular(2))),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(a.client, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5)),
                                      Text('${a.service} · ${a.barber}', style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(a.time, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 12.5)),
                                    Text('R\$ ${a.value.toStringAsFixed(2)}', style: TextStyle(color: accent, fontSize: 11.5, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ],
                            ),
                          )),
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

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final String? trend;
  final bool trendUp;
  final String? sub;
  final AppPalette palette;

  const _StatCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.palette,
    this.trend,
    this.trendUp = true,
    this.sub,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: iconColor, size: 20),
              if (trend != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: (trendUp ? Colors.green : Colors.redAccent).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                  child: Text(trend!, style: TextStyle(color: trendUp ? Colors.green : Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: TextStyle(color: palette.textPrimary, fontSize: 16, fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
              Text(label, style: TextStyle(color: palette.textFaint, fontSize: 11)),
              if (sub != null) Text(sub!, style: TextStyle(color: palette.textFaint, fontSize: 9.5)),
            ],
          ),
        ],
      ),
    );
  }
}
