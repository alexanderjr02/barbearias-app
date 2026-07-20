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
import 'loyalty_wallet_screen.dart';
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
                                  Text('${_greeting()},',
                                      style: TextStyle(color: palette.textSecondary, fontSize: 13, letterSpacing: 0.2)),
                                  const SizedBox(height: 1),
                                  Text(
                                    firstName,
                                    style: TextStyle(
                                      color: palette.textPrimary,
                                      fontSize: 27,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.6,
                                      height: 1.1,
                                    ),
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
                          _SectionTitle(
                            label: 'Minha fidelidade',
                            palette: palette,
                            accent: accent,
                            trailing: loyalty.length > 1 ? 'ver todas' : 'ver carteira',
                          ),
                          const SizedBox(height: 12),
                          for (var i = 0; i < loyalty.length; i++) ...[
                            if (i > 0) const SizedBox(height: 10),
                            RiseIn(
                              delay: Duration(milliseconds: 60 * i),
                              child: _PointsHeroCard(
                                balance: loyalty[i],
                                tierLabel: _tierLabel(loyalty[i].tier),
                                tierColor: _tierColor(loyalty[i].tier),
                                range: _tierRange(loyalty[i].tier),
                                palette: palette,
                                accent: accent,
                              ),
                            ),
                          ],
                          const SizedBox(height: 22),
                        ],
                        _SectionTitle(
                          label: next != null ? 'Outros agendamentos' : 'Meus agendamentos',
                          count: others.length,
                          palette: palette,
                          accent: accent,
                        ),
                        const SizedBox(height: 12),
                        if (others.isEmpty)
                          _EmptyAppointments(
                            palette: palette,
                            accent: accent,
                            hasNext: next != null,
                            onBook: () async {
                              final booked = await Navigator.of(context).push<bool>(
                                MaterialPageRoute(builder: (_) => const NewAppointmentScreen()),
                              );
                              if (booked == true) _refresh();
                            },
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

/// O cartão de pontos.
///
/// Antes era um anel pequeno num carrossel horizontal — o número que deveria
/// ser o troféu do cliente aparecia menor que o nome da barbearia. Aqui ele é
/// o assunto: ocupa a largura toda, o número domina, e o progresso até a
/// próxima faixa vira uma barra com meta explícita ("faltam 150 pts"), que é
/// o que faz alguém querer voltar. A cor sai da faixa, então subir de nível
/// muda o visual do cartão — a recompensa é visível, não só numérica.
class _PointsHeroCard extends StatelessWidget {
  final LoyaltyBalance balance;
  final String tierLabel;
  final Color tierColor;
  final (int, int?, String?) range;
  final AppPalette palette;
  final Color accent;

  const _PointsHeroCard({
    required this.balance,
    required this.tierLabel,
    required this.tierColor,
    required this.range,
    required this.palette,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final floor = range.$1;
    final ceiling = range.$2;
    final nextTier = range.$3;
    final isMax = ceiling == null;
    final progress = isMax ? 1.0 : ((balance.points - floor) / (ceiling - floor)).clamp(0.0, 1.0);
    final missing = isMax ? 0 : (ceiling - balance.points).clamp(0, 1 << 30);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: balance.barbershopId.isEmpty
            ? null
            : () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => LoyaltyWalletScreen(
                    barbershopId: balance.barbershopId,
                    barbershopName: balance.barbershopName,
                  ),
                )),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                tierColor.withValues(alpha: 0.22),
                tierColor.withValues(alpha: 0.06),
                palette.surface,
              ],
              stops: const [0, 0.55, 1],
            ),
            border: Border.all(color: tierColor.withValues(alpha: 0.28)),
          ),
          child: Stack(
            children: [
              // Halo da faixa — dá profundidade sem pesar a leitura.
              Positioned(
                top: -46,
                right: -26,
                child: Container(
                  width: 132,
                  height: 132,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: tierColor.withValues(alpha: 0.13),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            balance.barbershopName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: palette.textSecondary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.1,
                            ),
                          ),
                        ),
                        _TierBadge(label: tierLabel, color: tierColor),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          _grouped(balance.points),
                          style: TextStyle(
                            color: palette.textPrimary,
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1.8,
                            height: 1,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text('pontos',
                              style: TextStyle(
                                color: palette.textFaint,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              )),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Barra de progresso da faixa
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Stack(
                        children: [
                          Container(height: 7, color: palette.textFaint.withValues(alpha: 0.14)),
                          TweenAnimationBuilder<double>(
                            tween: Tween(begin: 0, end: progress),
                            duration: const Duration(milliseconds: 750),
                            curve: Curves.easeOutCubic,
                            builder: (context, v, _) => FractionallySizedBox(
                              widthFactor: v.clamp(0.0, 1.0),
                              child: Container(
                                height: 7,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [tierColor.withValues(alpha: 0.75), tierColor],
                                  ),
                                  boxShadow: [
                                    BoxShadow(color: tierColor.withValues(alpha: 0.45), blurRadius: 8, spreadRadius: -1),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            isMax
                                ? 'Você chegou ao topo. Aproveite os benefícios.'
                                : 'Faltam ${_grouped(missing)} pts para $nextTier',
                            style: TextStyle(
                              color: isMax ? tierColor : palette.textSecondary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Text('ver carteira',
                            style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w700)),
                        Icon(Icons.chevron_right_rounded, size: 16, color: accent),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 1500 -> "1.500". Número grande sem separador vira borrão.
  static String _grouped(int n) {
    final s = n.toString();
    final b = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write('.');
      b.write(s[i]);
    }
    return b.toString();
  }
}

class _TierBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _TierBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.workspace_premium_rounded, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label.toUpperCase(),
            style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.6),
          ),
        ],
      ),
    );
  }
}

/// Cabeçalho de seção padronizado — antes cada um era um Text solto com estilo
/// próprio, o que fazia a página parecer montada em pedaços.
class _SectionTitle extends StatelessWidget {
  final String label;
  final int? count;
  final String? trailing;
  final AppPalette palette;
  final Color accent;

  const _SectionTitle({
    required this.label,
    required this.palette,
    required this.accent,
    this.count,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(label,
            style: TextStyle(
              color: palette.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 16.5,
              letterSpacing: -0.3,
            )),
        if (count != null && count! > 0) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: palette.surface,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text('$count',
                style: TextStyle(color: palette.textSecondary, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ],
        const Spacer(),
        if (trailing != null)
          Row(
            children: [
              Text(trailing!, style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(width: 2),
              Icon(Icons.chevron_right_rounded, size: 16, color: accent),
            ],
          ),
      ],
    );
  }
}

/// Estado vazio de verdade, com saída. Antes era uma frase cinza centralizada —
/// que informa, mas deixa a pessoa parada sem saber o que fazer.
class _EmptyAppointments extends StatelessWidget {
  final AppPalette palette;
  final Color accent;
  final bool hasNext;
  final VoidCallback onBook;

  const _EmptyAppointments({required this.palette, required this.accent, required this.hasNext, required this.onBook});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 34, horizontal: 22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: palette.surface.withValues(alpha: 0.45),
        border: Border.all(color: palette.textFaint.withValues(alpha: 0.12)),
      ),
      child: Column(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: accent.withValues(alpha: 0.10),
            ),
            child: Icon(hasNext ? Icons.event_available_rounded : Icons.content_cut_rounded,
                color: accent.withValues(alpha: 0.8), size: 25),
          ),
          const SizedBox(height: 14),
          Text(
            hasNext ? 'Só esse por enquanto' : 'Seu primeiro corte começa aqui',
            style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14.5),
          ),
          const SizedBox(height: 5),
          Text(
            hasNext
                ? 'Quando marcar mais horários, eles aparecem nesta lista.'
                : 'Escolha o serviço, o barbeiro e o horário — leva menos de um minuto.',
            textAlign: TextAlign.center,
            style: TextStyle(color: palette.textFaint, fontSize: 12.5, height: 1.45),
          ),
          if (!hasNext) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onBook,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Agendar agora'),
              style: FilledButton.styleFrom(
                backgroundColor: accent,
                foregroundColor: contrastingTextColor(accent),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ],
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

  /// "2026-07-20" -> (20, "JUL"). Bloco de calendário lê mais rápido que
  /// "20/07" corrido — é o mesmo motivo de todo app de viagem usar isso.
  (String, String) _dayMonth() {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    try {
      final d = DateTime.parse(widget.apt.date);
      return (d.day.toString().padLeft(2, '0'), months[d.month - 1]);
    } catch (_) {
      return (widget.dateLabel, '');
    }
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final palette = widget.palette;
    final accent = widget.accent;
    final status = widget.apt.status;
    final inProgress = status == 'IN_PROGRESS';
    final arrived = status == 'ARRIVED';
    final live = inProgress || arrived;
    final (day, month) = _dayMonth();

    final badgeLabel = inProgress
        ? 'EM ATENDIMENTO AGORA'
        : arrived
            ? 'CHECK-IN FEITO · JÁ É SUA VEZ'
            : widget.countdown.toUpperCase();

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        // O brilho só pulsa quando algo está acontecendo de verdade. Card
        // parado piscando é ruído — vira aquele banner que a pessoa aprende
        // a ignorar.
        final glow = live ? 0.22 + _controller.value * 0.26 : 0.16;
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(26),
            boxShadow: [BoxShadow(color: accent.withValues(alpha: glow), blurRadius: 28, spreadRadius: -2)],
          ),
          child: child,
        );
      },
      child: GlassPanel(
        padding: EdgeInsets.zero,
        borderRadius: BorderRadius.circular(26),
        tint: accent,
        borderOpacity: 0.24,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ---------- Topo: data + o que/com quem ----------
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Bloco de calendário
                  Container(
                    width: 60,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [accent.withValues(alpha: 0.26), accent.withValues(alpha: 0.10)],
                      ),
                      border: Border.all(color: accent.withValues(alpha: 0.32)),
                    ),
                    child: Column(
                      children: [
                        Text(day,
                            style: TextStyle(
                              color: palette.textPrimary,
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              height: 1,
                              letterSpacing: -1,
                            )),
                        const SizedBox(height: 2),
                        Text(month,
                            style: TextStyle(
                              color: accent,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1,
                            )),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Selo de estado: ponto pulsante só quando ao vivo.
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: accent.withValues(alpha: live ? 0.26 : 0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (live) ...[
                                _LiveDot(color: accent, controller: _controller),
                                const SizedBox(width: 6),
                              ] else ...[
                                Icon(Icons.schedule_rounded, size: 11, color: accent),
                                const SizedBox(width: 4),
                              ],
                              Text(badgeLabel,
                                  style: TextStyle(
                                    color: accent,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.4,
                                  )),
                            ],
                          ),
                        ),
                        const SizedBox(height: 9),
                        Text(
                          widget.apt.serviceName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: palette.textPrimary,
                            fontWeight: FontWeight.w900,
                            fontSize: 19,
                            letterSpacing: -0.5,
                            height: 1.15,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.apt.barbershopName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: palette.textFaint, fontSize: 12.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ---------- Faixa: horário, barbeiro e preço ----------
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: palette.bg.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    // Barbeiro com avatar: o cliente volta pela PESSOA, então
                    // ela merece rosto e não só um nome no meio de uma frase.
                    Container(
                      width: 34,
                      height: 34,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [accent.withValues(alpha: 0.35), accent.withValues(alpha: 0.15)],
                        ),
                        border: Border.all(color: accent.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        _initials(widget.apt.staffName),
                        style: TextStyle(color: accent, fontWeight: FontWeight.w900, fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('com ${widget.apt.staffName}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  color: palette.textPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 1),
                          Row(
                            children: [
                              Icon(Icons.access_time_rounded, size: 11, color: palette.textFaint),
                              const SizedBox(width: 3),
                              Text(widget.apt.startTime,
                                  style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Text(
                      'R\$ ${widget.apt.totalPrice.toStringAsFixed(2).replaceAll('.', ',')}',
                      style: TextStyle(
                        color: palette.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ---------- Fila ao vivo ----------
            if (_queue != null && _queue!.isToday && _queue!.active && !inProgress) ...[
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: accent.withValues(alpha: 0.25)),
                  ),
                  child: Row(
                    children: [
                      _LiveDot(color: accent, controller: _controller),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          _queue!.ahead == 0
                              ? 'Você é o próximo! 🔥'
                              : '${_queue!.position}º na fila · ~${_queue!.etaMinutes} min de espera',
                          style: TextStyle(color: accent, fontWeight: FontWeight.w700, fontSize: 12.5),
                        ),
                      ),
                      Text('ao vivo',
                          style: TextStyle(
                              color: accent.withValues(alpha: 0.6), fontSize: 10, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 16),

            // ---------- Picote + ações ----------
            if (live)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    inProgress ? 'Aproveite o corte! ✂️' : 'Você já fez check-in. Aguarde ser chamado.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: accent, fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                ),
              )
            else ...[
              _DashedLine(color: palette.textFaint.withValues(alpha: 0.22)),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
                child: Row(
                  children: [
                    // Cancelar deixou de ter o mesmo peso de Remarcar. Ação
                    // destrutiva com botão vermelho grande do lado do primário
                    // é convite a errar; quem quer cancelar acha mesmo discreto.
                    TextButton(
                      onPressed: widget.onCancel,
                      style: TextButton.styleFrom(
                        foregroundColor: palette.textFaint,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        visualDensity: VisualDensity.compact,
                      ),
                      child: const Text('Cancelar', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
                    const Spacer(),
                    PulseButton(
                      onPressed: widget.onReschedule,
                      color: accent,
                      height: 42,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 22),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.event_repeat_rounded, size: 16, color: contrastingTextColor(accent)),
                            const SizedBox(width: 7),
                            Text('Remarcar',
                                style: TextStyle(
                                    color: contrastingTextColor(accent),
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13.5)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Ponto "ao vivo" com halo pulsante — o mesmo sinal que apps de entrega usam
/// para dizer "isto está acontecendo agora", sem precisar escrever.
class _LiveDot extends StatelessWidget {
  final Color color;
  final AnimationController controller;
  const _LiveDot({required this.color, required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final t = controller.value;
        return SizedBox(
          width: 8,
          height: 8,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 8 + t * 7,
                height: 8 + t * 7,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withValues(alpha: (1 - t) * 0.35),
                ),
              ),
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(shape: BoxShape.circle, color: color),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Picote do bilhete. Separa a informação da ação, que é o que faz o card
/// parecer um ticket destacável em vez de mais uma caixa arredondada.
class _DashedLine extends StatelessWidget {
  final Color color;
  const _DashedLine({required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: LayoutBuilder(
        builder: (context, constraints) {
          const dash = 5.0, gap = 4.0;
          final count = (constraints.maxWidth / (dash + gap)).floor();
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(
              count,
              (_) => Container(width: dash, height: 1, color: color),
            ),
          );
        },
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
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: palette.textFaint.withValues(alpha: 0.10)),
      ),
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
                // O serviço passa a ser o título. O nome da barbearia liderava
                // uma lista onde quase tudo é da mesma barbearia — repetia sem
                // distinguir nada.
                Text(apt.serviceName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 14.5, letterSpacing: -0.2)),
                const SizedBox(height: 2),
                Text('com ${apt.staffName}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                const SizedBox(height: 1),
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
