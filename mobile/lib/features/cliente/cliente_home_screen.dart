import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../auth/session_provider.dart';
import 'client_repository.dart';
import 'cliente_subscriptions_screen.dart';
import 'new_appointment_screen.dart';

const _activeStatuses = {'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'};

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

  @override
  void initState() {
    super.initState();
    _future = _load();
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      if (mounted) setState(() => _busy = false);
    }
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
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

              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [accent.withValues(alpha: 0.18), palette.bg],
                        ),
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
                                  Text(
                                    firstName,
                                    style: TextStyle(color: palette.textPrimary, fontSize: 24, fontWeight: FontWeight.w800),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
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
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        if (next != null) ...[
                          RiseIn(child: _NextAppointmentCard(
                            apt: next,
                            accent: accent,
                            palette: palette,
                            countdown: _countdownLabel(next),
                            dateLabel: _formatDate(next),
                            onCancel: () => _cancel(next),
                            onReschedule: () => _reschedule(next),
                          )),
                          const SizedBox(height: 22),
                        ],
                        RiseIn(
                          child: Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(18),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(18),
                              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ClientSubscriptionsScreen())),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [accent.withValues(alpha: 0.18), accent.withValues(alpha: 0.04)],
                                  ),
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(color: accent.withValues(alpha: 0.28)),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 46,
                                      height: 46,
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(colors: [accent, Color.lerp(accent, Colors.black, 0.35)!]),
                                        borderRadius: BorderRadius.circular(14),
                                        boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.35), blurRadius: 10, offset: const Offset(0, 4))],
                                      ),
                                      child: Icon(Icons.workspace_premium_rounded, color: contrastingTextColor(accent), size: 22),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text('Assinaturas', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                                              const SizedBox(width: 5),
                                              Icon(Icons.auto_awesome_rounded, size: 13, color: accent),
                                            ],
                                          ),
                                          Text('Planos recorrentes com benefícios exclusivos', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
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

  const _NextAppointmentCard({
    required this.apt,
    required this.accent,
    required this.palette,
    required this.countdown,
    required this.dateLabel,
    required this.onCancel,
    required this.onReschedule,
  });

  @override
  State<_NextAppointmentCard> createState() => _NextAppointmentCardState();
}

class _NextAppointmentCardState extends State<_NextAppointmentCard> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = widget.palette;
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
                  decoration: BoxDecoration(color: widget.accent.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20)),
                  child: Text('PRÓXIMO · ${widget.countdown.toUpperCase()}', style: TextStyle(color: widget.accent, fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.4)),
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
            const SizedBox(height: 16),
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

  const _HistoryTile({required this.apt, required this.accent, required this.palette, required this.dateLabel, required this.onRate});

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
                  child: const Row(
                    children: [
                      Icon(Icons.star_border, size: 14, color: Colors.amber),
                      SizedBox(width: 2),
                      Text('Avaliar', style: TextStyle(color: Colors.amber, fontSize: 11)),
                    ],
                  ),
                )
              else if (apt.hasReview)
                const Row(
                  children: [
                    Icon(Icons.star, size: 13, color: Colors.amber),
                    SizedBox(width: 2),
                    Text('Avaliado', style: TextStyle(color: Colors.amber, fontSize: 11)),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}
