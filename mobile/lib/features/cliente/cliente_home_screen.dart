import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../auth/session_provider.dart';
import 'client_repository.dart';
import 'new_appointment_screen.dart';
import 'tip_screen.dart';
import 'widgets/client_notifications_sheet.dart';

const _activeStatuses = {'SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'};

class ClienteHomeScreen extends StatefulWidget {
  const ClienteHomeScreen({super.key});

  @override
  State<ClienteHomeScreen> createState() => _ClienteHomeScreenState();
}

class _HomeData {
  final List<ClientAppointment> appointments;
  final List<LoyaltyBalance> loyalty;
  _HomeData(this.appointments, this.loyalty);
}

class _ClienteHomeScreenState extends State<ClienteHomeScreen> {
  final _repository = ClientRepository();
  late Future<_HomeData> _future;
  bool _busy = false;
  int _unreadNotifications = 0;

  @override
  void initState() {
    super.initState();
    _future = _load();
    _loadNotificationCount();
  }

  Future<void> _loadNotificationCount() async {
    try {
      final result = await _repository.notifications();
      if (mounted) setState(() => _unreadNotifications = result.unreadCount);
    } catch (_) {
      // Non-critical — the bell just stays empty if this fails.
    }
  }

  Future<_HomeData> _load() async {
    final results = await Future.wait([_repository.myAppointments(), _repository.myLoyalty()]);
    return _HomeData(results[0] as List<ClientAppointment>, results[1] as List<LoyaltyBalance>);
  }

  void _refresh() => setState(() => _future = _load());

  Color _tierColor(String tier) {
    switch (tier) {
      case 'GOLD':
        return const Color(0xFFF5C518);
      case 'SILVER':
        return const Color(0xFFC7CDD6);
      default:
        return const Color(0xFFCD8155);
    }
  }

  String _tierLabel(String tier) {
    switch (tier) {
      case 'GOLD':
        return 'Ouro';
      case 'SILVER':
        return 'Prata';
      default:
        return 'Bronze';
    }
  }

  /// (floor, ceiling, next-tier label) for the loyalty progress ring —
  /// mirrors the thresholds documented for the web dashboard's program.
  (int, int?, String?) _tierRange(String tier) {
    switch (tier) {
      case 'GOLD':
        return (1501, null, null);
      case 'SILVER':
        return (501, 1500, 'Ouro');
      default:
        return (0, 500, 'Prata');
    }
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  DateTime? _dateTimeOf(ClientAppointment apt) {
    try {
      final date = DateTime.parse(apt.date);
      final parts = apt.startTime.split(':');
      return DateTime(date.year, date.month, date.day, int.parse(parts[0]), int.parse(parts[1]));
    } catch (_) {
      return null;
    }
  }

  ClientAppointment? _nextAppointment(List<ClientAppointment> appointments) {
    final active = appointments.where((a) => _activeStatuses.contains(a.status)).toList();
    active.sort((a, b) {
      final da = _dateTimeOf(a) ?? DateTime.now();
      final db = _dateTimeOf(b) ?? DateTime.now();
      return da.compareTo(db);
    });
    return active.isEmpty ? null : active.first;
  }

  // Auto-agenda: learns the client's haircut cadence from their history and
  // suggests booking again when they're due. Returns null when there isn't
  // enough history or it's not time yet.
  ({int cadenceDays, int daysSince})? _autoSchedule(List<ClientAppointment> appointments) {
    final now = DateTime.now();
    final past = appointments.map(_dateTimeOf).whereType<DateTime>().where((d) => d.isBefore(now)).toList()..sort();
    if (past.length < 2) return null;
    final intervals = <int>[];
    for (var i = 1; i < past.length; i++) {
      intervals.add(past[i].difference(past[i - 1]).inDays);
    }
    final avg = intervals.reduce((a, b) => a + b) ~/ intervals.length;
    if (avg < 5 || avg > 120) return null; // ignore noise / one-offs
    final daysSince = now.difference(past.last).inDays;
    if (daysSince < avg - 7) return null; // not due yet
    return (cadenceDays: avg, daysSince: daysSince);
  }

  String _countdownLabel(ClientAppointment apt) {
    final dt = _dateTimeOf(apt);
    if (dt == null) return '';
    final diff = dt.difference(DateTime.now());
    if (diff.isNegative) return 'agora';
    if (diff.inDays >= 1) return 'em ${diff.inDays} dia${diff.inDays > 1 ? 's' : ''}';
    if (diff.inHours >= 1) return 'em ${diff.inHours}h';
    return 'em ${diff.inMinutes} min';
  }

  Future<void> _cancel(ClientAppointment apt) async {
    final palette = AppPalette.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: palette.surface,
        title: Text('Cancelar agendamento', style: TextStyle(color: palette.textPrimary)),
        content: Text(
          'Deseja cancelar seu horário de ${apt.serviceName} em ${_formatDate(apt)} às ${apt.startTime}?',
          style: TextStyle(color: palette.textSecondary),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Voltar')),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancelar horário', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _busy = true);
    try {
      await _repository.cancelAppointment(apt.id);
      _refresh();
    } on ApiException catch (e) {
      if (mounted) AppToast.error(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reschedule(ClientAppointment apt) async {
    final palette = AppPalette.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: palette.surface,
        title: Text('Remarcar', style: TextStyle(color: palette.textPrimary)),
        content: Text(
          'Vamos cancelar este horário e você escolhe um novo em seguida.',
          style: TextStyle(color: palette.textSecondary),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Voltar')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Continuar')),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _busy = true);
    try {
      await _repository.cancelAppointment(apt.id);
      if (!mounted) return;
      setState(() => _busy = false);
      final booked = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const NewAppointmentScreen()),
      );
      _refresh();
      if (booked != true) return;
    } on ApiException catch (e) {
      if (mounted) AppToast.error(context, e.message);
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _tip(ClientAppointment apt) async {
    final sent = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => TipScreen(appointmentId: apt.id, barberName: apt.staffName)),
    );
    if (sent == true) _refresh();
  }

  Future<void> _rate(ClientAppointment apt) async {
    final palette = AppPalette.of(context);
    var rating = 5;
    final commentController = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: palette.surface,
          title: Text('Avaliar atendimento', style: TextStyle(color: palette.textPrimary)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${apt.serviceName} com ${apt.staffName}', style: TextStyle(color: palette.textSecondary)),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) {
                  final starIndex = i + 1;
                  return IconButton(
                    onPressed: () => setDialogState(() => rating = starIndex),
                    icon: Icon(
                      starIndex <= rating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 30,
                    ),
                  );
                }),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: commentController,
                style: TextStyle(color: palette.textPrimary),
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'Comentário (opcional)',
                  hintStyle: TextStyle(color: palette.textFaint),
                  filled: true,
                  fillColor: palette.surfaceAlt,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
            TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Enviar')),
          ],
        ),
      ),
    );
    if (submitted != true) return;
    try {
      await _repository.submitReview(appointmentId: apt.id, rating: rating, comment: commentController.text);
      _refresh();
    } on ApiException catch (e) {
      if (mounted) AppToast.error(context, e.message);
    }
  }

  String _formatDate(ClientAppointment apt) {
    try {
      final date = DateTime.parse(apt.date);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}';
    } catch (_) {
      return apt.date;
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>();
    final accent = Theme.of(context).colorScheme.primary;
    final palette = AppPalette.of(context);
    final firstName = session.session?.name.split(' ').first ?? '';
    final avatarUrl = resolveAssetUrl(session.session?.avatar);

    return Scaffold(
      backgroundColor: palette.bg,
      body: AbsorbPointer(
        absorbing: _busy,
        child: RefreshIndicator(
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
              final loyalty = snapshot.data?.loyalty ?? [];
              final next = _nextAppointment(appointments);
              final others = appointments.where((a) => a.id != next?.id).toList();
              final suggestion = next == null ? _autoSchedule(appointments) : null;

              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: session.brandCover != null
                              ? Stack(
                                  fit: StackFit.expand,
                                  children: [
                                    Image.network(session.brandCover!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink()),
                                    DecoratedBox(
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.black.withValues(alpha: 0.38), palette.bg]),
                                      ),
                                    ),
                                  ],
                                )
                              : DecoratedBox(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [accent.withValues(alpha: 0.18), palette.bg]),
                                  ),
                                ),
                        ),
                        Container(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                      child: SafeArea(
                        bottom: false,
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${_greeting()},', style: TextStyle(color: palette.textSecondary, fontSize: 14)),
                                  Text(
                                    firstName,
                                    style: TextStyle(color: palette.textPrimary, fontSize: 24, fontWeight: FontWeight.w800),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            Stack(
                              clipBehavior: Clip.none,
                              children: [
                                IconButton(
                                  onPressed: () => ClientNotificationsSheet.show(
                                    context,
                                    onFetch: _repository.notifications,
                                    onMarkAllRead: _repository.markAllNotificationsRead,
                                    onChanged: _loadNotificationCount,
                                  ),
                                  icon: Icon(Icons.notifications_outlined, color: palette.textPrimary),
                                ),
                                if (_unreadNotifications > 0)
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
                      ],
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        if (suggestion != null) ...[
                          RiseIn(
                            child: Material(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(18),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(18),
                                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NewAppointmentScreen())),
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [accent.withValues(alpha: 0.22), accent.withValues(alpha: 0.06)]),
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(color: accent.withValues(alpha: 0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(width: 46, height: 46, decoration: BoxDecoration(color: accent.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14)), child: Icon(Icons.event_repeat_rounded, color: accent)),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('Hora do corte? ✂️', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                                            const SizedBox(height: 2),
                                            Text('Você costuma cortar a cada ${(suggestion.cadenceDays / 7).round()} semana(s) — já faz ${suggestion.daysSince} dias.', style: TextStyle(color: palette.textSecondary, fontSize: 11.5)),
                                          ],
                                        ),
                                      ),
                                      Icon(Icons.chevron_right_rounded, color: accent),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 22),
                        ],
                        if (next != null) ...[
                          RiseIn(child: _NextAppointmentCard(
                            apt: next,
                            accent: accent,
                            palette: palette,
                            countdown: _countdownLabel(next),
                            dateLabel: _formatDate(next),
                            onCancel: () => _cancel(next),
                            onReschedule: () => _reschedule(next),
                            onStatusChanged: _refresh,
                          )),
                          const SizedBox(height: 22),
                        ],
                        if (loyalty.isNotEmpty) ...[
                          Text('Meus pontos', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 148,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: loyalty.length,
                              separatorBuilder: (_, _) => const SizedBox(width: 12),
                              itemBuilder: (context, index) {
                                final l = loyalty[index];
                                final range = _tierRange(l.tier);
                                final progress = range.$2 == null ? 1.0 : ((l.points - range.$1) / (range.$2! - range.$1)).clamp(0.0, 1.0);
                                return RiseIn(
                                  delay: Duration(milliseconds: 60 * index),
                                  child: _LoyaltyRing(
                                    barbershopName: l.barbershopName,
                                    points: l.points,
                                    tierLabel: _tierLabel(l.tier),
                                    color: _tierColor(l.tier),
                                    progress: progress,
                                    nextTier: range.$3,
                                    palette: palette,
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 22),
                        ],
                        Text(next != null ? 'Outros agendamentos' : 'Meus agendamentos',
                            style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 12),
                        if (others.isEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 24),
                            child: Center(
                              child: Text(
                                next != null ? 'Nenhum outro agendamento.' : 'Você ainda não tem agendamentos.',
                                style: TextStyle(color: palette.textFaint),
                              ),
                            ),
                          ),
                        ...others.asMap().entries.map((entry) => RiseIn(
                              delay: Duration(milliseconds: 40 * entry.key),
                              child: _HistoryTile(
                                apt: entry.value,
                                accent: accent,
                                palette: palette,
                                dateLabel: _formatDate(entry.value),
                                onRate: () => _rate(entry.value),
                                onTip: () => _tip(entry.value),
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
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: accent,
        foregroundColor: contrastingTextColor(accent),
        icon: const Icon(Icons.add),
        label: const Text('Agendar', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () async {
          final booked = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const NewAppointmentScreen()),
          );
          if (booked == true) _refresh();
        },
      ),
    );
  }
}

class _NextAppointmentCard extends StatefulWidget {
  final ClientAppointment apt;
  final Color accent;
  final AppPalette palette;
  final String countdown;
  final String dateLabel;
  final VoidCallback onCancel;
  final VoidCallback onReschedule;
  final VoidCallback onStatusChanged;

  const _NextAppointmentCard({
    required this.apt,
    required this.accent,
    required this.palette,
    required this.countdown,
    required this.dateLabel,
    required this.onCancel,
    required this.onReschedule,
    required this.onStatusChanged,
  });

  @override
  State<_NextAppointmentCard> createState() => _NextAppointmentCardState();
}

class _NextAppointmentCardState extends State<_NextAppointmentCard> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  final _repo = ClientRepository();
  Timer? _pollTimer;
  QueueInfo? _queue;

  static const _pollable = {'SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'};

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    if (_pollable.contains(widget.apt.status)) {
      _poll();
      _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) => _poll());
    }
  }

  Future<void> _poll() async {
    try {
      final q = await _repo.queue(widget.apt.id);
      if (!mounted) return;
      setState(() => _queue = q);
      // The barber moved us along (e.g. ARRIVED → IN_PROGRESS): pull the whole
      // home again so every card reflects the new reality, live.
      if (q.status != widget.apt.status) widget.onStatusChanged();
      // Left the line (finished/cancelled) or it's no longer today → stop.
      if (!q.active || !q.isToday) _pollTimer?.cancel();
    } catch (_) {
      // Transient; the next tick tries again.
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = widget.palette;
    final status = widget.apt.status;
    final inProgress = status == 'IN_PROGRESS';
    final arrived = status == 'ARRIVED';
    final live = inProgress || arrived;
    final badgeLabel = inProgress
        ? '✂️ EM ATENDIMENTO AGORA'
        : arrived
            ? '✅ CHECK-IN FEITO · JÁ É SUA VEZ'
            : 'PRÓXIMO · ${widget.countdown.toUpperCase()}';
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final glow = 0.25 + _controller.value * 0.25;
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            boxShadow: [BoxShadow(color: widget.accent.withValues(alpha: glow), blurRadius: 26, spreadRadius: 1)],
          ),
          child: child,
        );
      },
      child: GlassPanel(
        padding: const EdgeInsets.all(20),
        borderRadius: BorderRadius.circular(24),
        tint: widget.accent,
        borderOpacity: 0.24,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: widget.accent.withValues(alpha: live ? 0.28 : 0.18), borderRadius: BorderRadius.circular(20)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (live) ...[
                        Container(width: 6, height: 6, decoration: BoxDecoration(color: widget.accent, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                      ],
                      Text(badgeLabel, style: TextStyle(color: widget.accent, fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.4)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(widget.apt.barbershopName, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
            const SizedBox(height: 4),
            Text('${widget.apt.serviceName} · com ${widget.apt.staffName}', style: TextStyle(color: palette.textSecondary, fontSize: 13.5)),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.calendar_today_rounded, size: 14, color: widget.accent),
                const SizedBox(width: 6),
                Text('${widget.dateLabel} · ${widget.apt.startTime}', style: TextStyle(color: widget.accent, fontWeight: FontWeight.bold, fontSize: 13.5)),
                const Spacer(),
                Text('R\$ ${widget.apt.totalPrice.toStringAsFixed(2)}', style: TextStyle(color: palette.textFaint, fontSize: 13)),
              ],
            ),
            if (_queue != null && _queue!.isToday && _queue!.active && !inProgress) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(color: widget.accent.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(12), border: Border.all(color: widget.accent.withValues(alpha: 0.25))),
                child: Row(
                  children: [
                    Container(width: 7, height: 7, decoration: BoxDecoration(color: widget.accent, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Icon(Icons.groups_rounded, size: 15, color: widget.accent),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _queue!.ahead == 0
                            ? 'Você é o próximo! 🔥'
                            : '${_queue!.position}º na fila · ~${_queue!.etaMinutes} min de espera',
                        style: TextStyle(color: widget.accent, fontWeight: FontWeight.w700, fontSize: 12.5),
                      ),
                    ),
                    Text('ao vivo', style: TextStyle(color: widget.accent.withValues(alpha: 0.6), fontSize: 10, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (live)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(color: widget.accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                child: Text(
                  inProgress ? 'Aproveite o corte! ✂️' : 'Você já fez check-in. Aguarde ser chamado.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: widget.accent, fontWeight: FontWeight.w700, fontSize: 13),
                ),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: widget.onCancel,
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.redAccent, side: const BorderSide(color: Colors.redAccent)),
                      child: const Text('Cancelar'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: PulseButton(
                      onPressed: widget.onReschedule,
                      color: widget.accent,
                      height: 40,
                      child: Text('Remarcar', style: TextStyle(color: contrastingTextColor(widget.accent), fontWeight: FontWeight.bold, fontSize: 13.5)),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _LoyaltyRing extends StatelessWidget {
  final String barbershopName;
  final int points;
  final String tierLabel;
  final Color color;
  final double progress;
  final String? nextTier;
  final AppPalette palette;

  const _LoyaltyRing({
    required this.barbershopName,
    required this.points,
    required this.tierLabel,
    required this.color,
    required this.progress,
    required this.nextTier,
    required this.palette,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 168,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(barbershopName, style: TextStyle(color: palette.textSecondary, fontSize: 11.5), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 8),
          Expanded(
            child: Center(
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: progress),
                duration: const Duration(milliseconds: 900),
                curve: Curves.easeOutCubic,
                builder: (context, value, _) => SizedBox(
                  width: 74,
                  height: 74,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 74,
                        height: 74,
                        child: CircularProgressIndicator(
                          value: value,
                          strokeWidth: 6,
                          backgroundColor: palette.surfaceAlt,
                          valueColor: AlwaysStoppedAnimation(color),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('$points', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16)),
                          Text('pts', style: TextStyle(color: color.withValues(alpha: 0.7), fontSize: 9)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            nextTier != null ? '$tierLabel · rumo a $nextTier' : '$tierLabel · nível máximo',
            style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  final ClientAppointment apt;
  final Color accent;
  final AppPalette palette;
  final String dateLabel;
  final VoidCallback onRate;
  final VoidCallback onTip;

  const _HistoryTile({required this.apt, required this.accent, required this.palette, required this.dateLabel, required this.onRate, required this.onTip});

  IconData _statusIcon(String status) {
    switch (status) {
      case 'COMPLETED':
        return Icons.check_circle_rounded;
      case 'CANCELLED':
        return Icons.cancel_rounded;
      case 'NO_SHOW':
        return Icons.error_rounded;
      default:
        return Icons.schedule_rounded;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'COMPLETED':
        return Colors.green;
      case 'CANCELLED':
      case 'NO_SHOW':
        return Colors.redAccent;
      default:
        return Colors.blueAccent;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: _statusColor(apt.status).withValues(alpha: 0.14), shape: BoxShape.circle),
            child: Icon(_statusIcon(apt.status), color: _statusColor(apt.status), size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(apt.barbershopName, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                Text('${apt.serviceName} · com ${apt.staffName}', style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                Text('$dateLabel · ${apt.startTime}', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('R\$ ${apt.totalPrice.toStringAsFixed(2)}', style: TextStyle(color: accent, fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 4),
              if (apt.status == 'COMPLETED' && !apt.hasReview)
                GestureDetector(
                  onTap: onRate,
                  child: Row(
                    children: [
                      Icon(Icons.star_border, size: 14, color: accent),
                      const SizedBox(width: 2),
                      Text('Avaliar', style: TextStyle(color: accent, fontSize: 11)),
                    ],
                  ),
                )
              else if (apt.hasReview)
                Row(
                  children: [
                    Icon(Icons.star, size: 13, color: accent),
                    const SizedBox(width: 2),
                    Text('Avaliado', style: TextStyle(color: accent, fontSize: 11)),
                  ],
                ),
              if (apt.status == 'COMPLETED') ...[
                const SizedBox(height: 4),
                if (apt.hasTip)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.favorite_rounded, size: 12, color: accent),
                      const SizedBox(width: 2),
                      Text('Gorjeta enviada', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                    ],
                  )
                else
                  GestureDetector(
                    onTap: onTip,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.volunteer_activism_rounded, size: 14, color: accent),
                        const SizedBox(width: 2),
                        Text('Gorjeta', style: TextStyle(color: accent, fontSize: 11)),
                      ],
                    ),
                  ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
