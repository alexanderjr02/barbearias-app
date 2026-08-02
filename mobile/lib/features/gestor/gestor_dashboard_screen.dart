import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/rukz_theme.dart';
import '../../core/widgets/bell_sheet.dart';
import '../../core/widgets/skeleton.dart';
import '../auth/session_provider.dart';
import 'brand_controller.dart';
import 'gestor_repository.dart';
import 'widgets/nps_prompt_sheet.dart';
import 'widgets/onboarding_checklist_card.dart';
import 'widgets/revenue_chart_card.dart';
import '../../core/utils/moeda.dart';

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

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
                    decoration: BoxDecoration(
                      color: palette.bg,
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
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // HOJE — a primeira pergunta de todo dono: como esta o dia?
                      // Ja entrou, ainda entra, e quanto da casa esta vendido.
                      RiseIn(
                        // IntrinsicHeight da altura da lista: sem ele, 'stretch'
                        // num Row dentro de rolagem pede altura ilimitada e o
                        // painel inteiro nao renderiza.
                        child: IntrinsicHeight(
                          child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: _CardDia(
                                rotulo: 'Já entrou hoje',
                                valor: reais(s.todayRevenue),
                                corValor: palette.textPrimary,
                                nota: s.todayRevenue == 0 && s.yesterdayRevenue == 0
                                    ? 'sem movimento ainda'
                                    : '${s.todayRevenue >= s.yesterdayRevenue ? 'acima' : 'abaixo'} de ontem',
                                corNota: s.todayRevenue == 0 && s.yesterdayRevenue == 0
                                    ? palette.textFaint
                                    : (s.todayRevenue >= s.yesterdayRevenue ? const Color(0xFF34D399) : palette.textSecondary),
                                palette: palette,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _CardDia(
                                rotulo: 'Ainda entra hoje',
                                valor: reais(s.todayExpected),
                                corValor: accent,
                                nota: '${s.todayCount} agendamento${s.todayCount == 1 ? '' : 's'}',
                                corNota: palette.textFaint,
                                palette: palette,
                              ),
                            ),
                          ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Cadeira vazia e dinheiro que nao volta — por isso ocupacao
                      // aparece junto do caixa, nao escondida num relatorio.
                      RiseIn(
                        delay: const Duration(milliseconds: 40),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: palette.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: palette.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text('Agenda de hoje', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                                  const Spacer(),
                                  Text(
                                    s.closedToday ? '—' : '${s.todayOccupancy}%',
                                    style: TextStyle(color: palette.textPrimary, fontSize: 14, fontWeight: FontWeight.w900),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: LinearProgressIndicator(
                                  value: s.closedToday ? 0 : (s.todayOccupancy / 100).clamp(0.0, 1.0),
                                  minHeight: 6,
                                  backgroundColor: palette.surfaceAlt,
                                  valueColor: AlwaysStoppedAnimation(accent),
                                ),
                              ),
                              const SizedBox(height: 9),
                              Text(
                                s.closedToday
                                    ? 'Barbearia fechada hoje'
                                    : s.freeMinutesToday > 0
                                        ? '${(s.freeMinutesToday / 60).floor()}h${s.freeMinutesToday % 60 > 0 ? '${s.freeMinutesToday % 60}min' : ''} de cadeira livre'
                                        : 'Agenda cheia',
                                style: TextStyle(color: palette.textFaint, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // O MES — estou no caminho? Projecao pelo ritmo atual, e
                      // comparacao com o MESMO DIA do mes passado: contra o mes
                      // fechado, todo dia 5 diria "caiu 60%".
                      RiseIn(
                        delay: const Duration(milliseconds: 60),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: palette.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: palette.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Faturamento do mês', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                                        const SizedBox(height: 5),
                                        Text(reais(s.monthRevenue),
                                            style: TextStyle(color: palette.textPrimary, fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                                        const SizedBox(height: 4),
                                        Text(
                                          s.lastMonthRevenue > 0
                                              ? '${s.monthRevenue >= s.lastMonthRevenue ? '+' : ''}${(((s.monthRevenue - s.lastMonthRevenue) / s.lastMonthRevenue) * 100).round()}% vs. mesmo dia do mês passado'
                                              : 'primeiro mês com movimento',
                                          style: TextStyle(
                                            color: s.lastMonthRevenue > 0
                                                ? (s.monthRevenue >= s.lastMonthRevenue ? const Color(0xFF34D399) : const Color(0xFFF87171))
                                                : palette.textFaint,
                                            fontSize: 11.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text('Projeção', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                                      const SizedBox(height: 4),
                                      Text(reais(s.projection),
                                          style: TextStyle(color: accent, fontSize: 17, fontWeight: FontWeight.w900)),
                                      Text('no ritmo de hoje', style: TextStyle(color: palette.textFaint, fontSize: 10)),
                                    ],
                                  ),
                                ],
                              ),
                              if (s.monthlyGoal != null && s.monthlyGoal! > 0) ...[
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Text('Meta de ${reais(s.monthlyGoal!)}', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                                    const Spacer(),
                                    Text('${((s.monthRevenue / s.monthlyGoal!) * 100).round()}%',
                                        style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w800)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: LinearProgressIndicator(
                                    value: (s.monthRevenue / s.monthlyGoal!).clamp(0.0, 1.0),
                                    minHeight: 7,
                                    backgroundColor: palette.surfaceAlt,
                                    valueColor: AlwaysStoppedAnimation(
                                        s.monthRevenue >= s.monthlyGoal! ? const Color(0xFF34D399) : accent),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  s.monthRevenue >= s.monthlyGoal!
                                      ? 'Meta batida.'
                                      : s.projection >= s.monthlyGoal!
                                          ? 'No ritmo de bater. Faltam ${reais(s.monthlyGoal! - s.monthRevenue)}.'
                                          : 'Fora do ritmo. Precisa de ${reais(s.monthlyGoal! - s.projection)} acima da projeção.',
                                  style: TextStyle(color: palette.textSecondary, fontSize: 11.5),
                                ),
                              ] else ...[
                                const SizedBox(height: 14),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: palette.bg,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: palette.border),
                                  ),
                                  child: Text(
                                    'Sem meta definida. Com uma meta, esta faixa mostra quanto falta e se o ritmo atual chega lá — defina em Financeiro.',
                                    style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),

                      // PRECISA DE VOCE — o painel so serve se virar decisao. Some
                      // inteiro quando nao ha pendencia: painel que sempre alerta
                      // e painel que ninguem le.
                      if (s.unconfirmedToday > 0 || s.noShowsToday > 0 || s.lowStock.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        RiseIn(
                          delay: const Duration(milliseconds: 80),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: palette.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: palette.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Precisa de você',
                                    style: TextStyle(color: palette.textPrimary, fontSize: 14, fontWeight: FontWeight.w800)),
                                const SizedBox(height: 10),
                                if (s.unconfirmedToday > 0)
                                  _LinhaAtencao(
                                    cor: accent,
                                    texto: '${s.unconfirmedToday} agendamento${s.unconfirmedToday == 1 ? '' : 's'} de hoje sem confirmação',
                                    palette: palette,
                                  ),
                                if (s.noShowsToday > 0)
                                  _LinhaAtencao(
                                    cor: const Color(0xFFF87171),
                                    texto: '${s.noShowsToday} cliente${s.noShowsToday == 1 ? '' : 's'} não compareceu hoje',
                                    palette: palette,
                                  ),
                                if (s.lowStock.isNotEmpty)
                                  _LinhaAtencao(
                                    cor: accent,
                                    texto: 'Estoque baixo: ${s.lowStock.map((p) => p.name).join(', ')}',
                                    palette: palette,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ],

                      // Contexto de fundo: ticket e base de clientes mudam devagar,
                      // entao vem menores, depois do que exige acao hoje.
                      const SizedBox(height: 12),
                      RiseIn(
                        delay: const Duration(milliseconds: 100),
                        child: Container(
                          decoration: BoxDecoration(
                            color: palette.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: palette.border),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: _CelulaContexto(
                                  rotulo: 'Ticket médio',
                                  valor: reais(s.avgTicket),
                                  nota: 'este mês',
                                  palette: palette,
                                ),
                              ),
                              Container(width: 1, height: 46, color: palette.border),
                              Expanded(
                                child: _CelulaContexto(
                                  rotulo: 'Clientes ativos',
                                  valor: '${s.activeClients}',
                                  nota: 'últimos 90 dias',
                                  palette: palette,
                                ),
                              ),
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
                                    Text('${reais(a.value)}', style: TextStyle(color: accent, fontSize: 11.5, fontWeight: FontWeight.bold)),
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

// Cartao do dia: numero grande, rotulo e nota curta. Sem icone — o rotulo ja
// diz o que e, e o icone so competia com o numero.
class _CardDia extends StatelessWidget {
  final String rotulo;
  final String valor;
  final Color corValor;
  final String nota;
  final Color corNota;
  final AppPalette palette;

  const _CardDia({
    required this.rotulo,
    required this.valor,
    required this.corValor,
    required this.nota,
    required this.corNota,
    required this.palette,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: palette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(rotulo, style: TextStyle(color: palette.textFaint, fontSize: 12)),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(valor, style: TextStyle(color: corValor, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
          ),
          const SizedBox(height: 4),
          Text(nota, style: TextStyle(color: corNota, fontSize: 11.5), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

// Pendencia: um ponto colorido e a frase. Sem caixa dentro de caixa.
class _LinhaAtencao extends StatelessWidget {
  final Color cor;
  final String texto;
  final AppPalette palette;

  const _LinhaAtencao({required this.cor, required this.texto, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 5),
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: cor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(texto, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.35))),
        ],
      ),
    );
  }
}

class _CelulaContexto extends StatelessWidget {
  final String rotulo;
  final String valor;
  final String nota;
  final AppPalette palette;

  const _CelulaContexto({required this.rotulo, required this.valor, required this.nota, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(rotulo, style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(valor, style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.w900)),
          ),
          Text(nota, style: TextStyle(color: palette.textFaint, fontSize: 10)),
        ],
      ),
    );
  }
}
