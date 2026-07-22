import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'client_repository.dart';

/// A carteira de fidelidade do cliente: cartão de selos, prêmios conquistados
/// e o código de indicação.
///
/// O cartão de selos é o coração disto. Fidelidade só funciona quando o
/// cliente VÊ o quanto falta — um contador escondido num relatório não traz
/// ninguém de volta; a cartela quase cheia traz.
class LoyaltyWalletScreen extends StatefulWidget {
  final String barbershopId;
  final String? barbershopName;
  /// Quando vive dentro de uma aba não há para onde voltar — some o botão de
  /// voltar e o título vira cabeçalho da aba, não de uma tela empilhada.
  final bool embedded;
  const LoyaltyWalletScreen({super.key, required this.barbershopId, this.barbershopName, this.embedded = false});

  @override
  State<LoyaltyWalletScreen> createState() => _LoyaltyWalletScreenState();
}

class _LoyaltyWalletScreenState extends State<LoyaltyWalletScreen> {
  final _repo = ClientRepository();
  LoyaltyStatus? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final d = await _repo.loyaltyStatus(widget.barbershopId);
      if (mounted) setState(() => _data = d);
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não consegui carregar sua carteira');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _useCode() async {
    final ctrl = TextEditingController();
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Tem um código de amigo?', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 18)),
              const SizedBox(height: 4),
              Text('Vocês dois ganham quando você fizer o primeiro corte.', style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
              const SizedBox(height: 16),
              TextField(
                controller: ctrl,
                autofocus: true,
                textCapitalization: TextCapitalization.characters,
                style: TextStyle(color: palette.textPrimary, letterSpacing: 2, fontWeight: FontWeight.w800),
                decoration: InputDecoration(
                  hintText: 'EX: JOAO123',
                  hintStyle: TextStyle(color: palette.textFaint, letterSpacing: 2),
                  filled: true,
                  fillColor: palette.bg,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final code = ctrl.text.trim();
                    if (code.isEmpty) return;
                    Navigator.of(ctx).pop();
                    try {
                      final msg = await _repo.useReferralCode(barbershopId: widget.barbershopId, code: code);
                      if (mounted) AppToast.success(context, msg);
                      _load();
                    } catch (e) {
                      if (mounted) AppToast.error(context, 'Código inválido ou já usado');
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: Text('Aplicar código', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final d = _data;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        elevation: 0,
        automaticallyImplyLeading: !widget.embedded,
        titleSpacing: widget.embedded ? 20 : null,
        title: Text(
          widget.embedded ? 'Minha carteira' : (widget.barbershopName ?? 'Minha carteira'),
          style: widget.embedded
              ? TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 22, letterSpacing: -0.5)
              : null,
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : d == null
              ? _WalletError(palette: palette, accent: accent, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 6, 16, 32),
                    children: [
                      // Prêmio a resgatar vem SEMPRE primeiro. É a única coisa
                      // aqui que exige ação no balcão — enterrar isso embaixo
                      // do saldo seria esconder o que o cliente já ganhou.
                      if (d.rewards.isNotEmpty) ...[
                        _SectionLabel('Para resgatar', palette: palette, count: d.rewards.length, accent: accent),
                        ...d.rewards.map((r) => _RewardTicket(label: r.label, palette: palette)),
                        const SizedBox(height: 24),
                      ],

                      if (d.stampEnabled) ...[
                        _SectionLabel('Cartão de selos', palette: palette),
                        _StampCard(
                          stamps: d.stamps,
                          goal: d.stampGoal,
                          reward: d.stampRewardLabel,
                          completed: d.cardsCompleted,
                          palette: palette,
                          accent: accent,
                        ),
                        const SizedBox(height: 24),
                      ],

                      if (d.pointsEnabled) ...[
                        _SectionLabel('Seus pontos', palette: palette),
                        _PointsCard(
                          points: d.points,
                          tier: d.tier,
                          silverThreshold: d.silverThreshold,
                          goldThreshold: d.goldThreshold,
                          palette: palette,
                          accent: accent,
                        ),
                        const SizedBox(height: 24),
                      ],

                      if (d.referralEnabled) ...[
                        _SectionLabel('Indique um amigo', palette: palette),
                        _ReferralCard(
                          code: d.referralCode,
                          reward: d.referralReward,
                          palette: palette,
                          accent: accent,
                          onUseCode: _useCode,
                        ),
                      ],

                      if (!d.stampEnabled && !d.pointsEnabled && !d.referralEnabled)
                        _NoProgram(palette: palette, accent: accent),
                    ],
                  ),
                ),
    );
  }
}

/// Rótulo de seção com contador opcional. Caixa alta espaçada envelhece rápido;
/// peso e tamanho separam melhor sem gritar.
class _SectionLabel extends StatelessWidget {
  final String text;
  final AppPalette palette;
  final int? count;
  final Color? accent;
  const _SectionLabel(this.text, {required this.palette, this.count, this.accent});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11, top: 2, left: 2),
      child: Row(
        children: [
          Text(text,
              style: TextStyle(
                color: palette.textPrimary,
                fontSize: 15.5,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              )),
          if (count != null && count! > 0) ...[
            const SizedBox(width: 7),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: (accent ?? palette.textFaint).withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text('$count',
                  style: TextStyle(
                      color: accent ?? palette.textFaint, fontSize: 11, fontWeight: FontWeight.w900)),
            ),
          ],
        ],
      ),
    );
  }
}

/// A cartela.
///
/// O que faz alguém querer fechar não é o número de selos: é ver o espaço
/// vazio ao lado dos preenchidos. Por isso os que faltam são pontilhados (têm
/// presença, mas nítida ausência), o último traz o presente à mostra desde o
/// começo — o cliente sabe o que está perseguindo — e os preenchidos entram
/// com escala animada, um após o outro, como carimbo batendo.
class _StampCard extends StatelessWidget {
  final int stamps, goal, completed;
  final String reward;
  final AppPalette palette;
  final Color accent;
  const _StampCard({
    required this.stamps,
    required this.goal,
    required this.reward,
    required this.completed,
    required this.palette,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final left = (goal - stamps).clamp(0, goal);
    final done = left == 0;
    final progress = goal == 0 ? 0.0 : (stamps / goal).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [accent.withValues(alpha: done ? 0.28 : 0.16), accent.withValues(alpha: 0.03)],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: accent.withValues(alpha: done ? 0.55 : 0.26), width: done ? 1.6 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      done
                          ? 'Cartela completa!'
                          : left == 1
                              ? 'Falta 1 corte'
                              : 'Faltam $left cortes',
                      style: TextStyle(
                        color: palette.textPrimary,
                        fontSize: 21,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.6,
                        height: 1.15,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      done ? 'Peça seu prêmio no balcão' : 'para ganhar $reward',
                      style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              if (completed > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: accent.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.emoji_events_rounded, size: 11, color: accent),
                      const SizedBox(width: 3),
                      Text('$completed',
                          style: TextStyle(color: accent, fontSize: 11, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),

          // Barra fina acima dos selos: leitura instantânea do quanto já andou,
          // antes de contar bolinha por bolinha.
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
                Container(height: 5, color: palette.textFaint.withValues(alpha: 0.15)),
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: progress),
                  duration: const Duration(milliseconds: 700),
                  curve: Curves.easeOutCubic,
                  builder: (context, v, _) => FractionallySizedBox(
                    widthFactor: v.clamp(0.0, 1.0),
                    child: Container(height: 5, color: accent),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Wrap(
            spacing: 9,
            runSpacing: 9,
            children: List.generate(goal, (i) {
              final filled = i < stamps;
              final isLast = i == goal - 1;
              return _Stamp(
                filled: filled,
                isLast: isLast,
                index: i,
                accent: accent,
                palette: palette,
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _Stamp extends StatelessWidget {
  final bool filled, isLast;
  final int index;
  final Color accent;
  final AppPalette palette;
  const _Stamp({
    required this.filled,
    required this.isLast,
    required this.index,
    required this.accent,
    required this.palette,
  });

  @override
  Widget build(BuildContext context) {
    final circle = Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: filled
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [accent, accent.withValues(alpha: 0.72)],
              )
            : null,
        border: filled
            ? null
            : Border.all(
                color: isLast ? accent.withValues(alpha: 0.55) : palette.textFaint.withValues(alpha: 0.28),
                width: 1.6,
              ),
        boxShadow: filled
            ? [BoxShadow(color: accent.withValues(alpha: 0.35), blurRadius: 10, spreadRadius: -2)]
            : null,
      ),
      child: Icon(
        isLast ? Icons.card_giftcard_rounded : Icons.content_cut_rounded,
        size: 18,
        color: filled
            ? contrastingTextColor(accent)
            : isLast
                ? accent.withValues(alpha: 0.75)
                : palette.textFaint.withValues(alpha: 0.45),
      ),
    );

    if (!filled) return circle;

    // Carimbo batendo: escala com overshoot, escalonada pelo índice.
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.5, end: 1),
      duration: Duration(milliseconds: 260 + index * 55),
      curve: Curves.elasticOut,
      builder: (context, v, child) => Transform.scale(scale: v, child: child),
      child: circle,
    );
  }
}

/// Prêmio disponível, em forma de bilhete — com os recortes laterais que todo
/// cupom tem. É o que separa "mais um card" de algo que parece destacável.
class _RewardTicket extends StatelessWidget {
  final String label;
  final AppPalette palette;
  const _RewardTicket({required this.label, required this.palette});

  static const _green = Color(0xFF34D399);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: ClipPath(
        clipper: _TicketClipper(),
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [_green.withValues(alpha: 0.20), _green.withValues(alpha: 0.07)],
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _green.withValues(alpha: 0.22),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(Icons.redeem_rounded, color: _green, size: 22),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: TextStyle(
                            color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15.5, letterSpacing: -0.2)),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(Icons.storefront_rounded, size: 11, color: _green),
                        const SizedBox(width: 4),
                        Text('Mostre esta tela no balcão',
                            style: TextStyle(color: palette.textSecondary, fontSize: 11.5)),
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
}

/// Recortes semicirculares nas laterais, como um cupom picotado.
class _TicketClipper extends CustomClipper<Path> {
  static const _radius = 9.0;
  static const _corner = 18.0;

  @override
  Path getClip(Size size) {
    final body = Path()
      ..addRRect(RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(_corner)));
    final notches = Path()
      ..addOval(Rect.fromCircle(center: Offset(0, size.height / 2), radius: _radius))
      ..addOval(Rect.fromCircle(center: Offset(size.width, size.height / 2), radius: _radius));
    return Path.combine(PathOperation.difference, body, notches);
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// Pontos com a distância até a próxima faixa. A cor sai da faixa atual, então
/// subir de nível muda o cartão — a recompensa fica visível, não só numérica.
class _PointsCard extends StatelessWidget {
  final int points;
  final String tier;
  final int silverThreshold, goldThreshold;
  final AppPalette palette;
  final Color accent;

  const _PointsCard({
    required this.points,
    required this.tier,
    required this.silverThreshold,
    required this.goldThreshold,
    required this.palette,
    required this.accent,
  });

  static const _labels = {'BRONZE': 'Bronze', 'SILVER': 'Prata', 'GOLD': 'Ouro'};
  static const _colors = {
    'BRONZE': Color(0xFFCD8155),
    'SILVER': Color(0xFFC7CDD6),
    'GOLD': Color(0xFFF5C518),
  };

  @override
  Widget build(BuildContext context) {
    final tierColor = _colors[tier] ?? accent;

    // Faixas em 0 = servidor antigo ou programa sem faixas: mostra só o saldo
    // em vez de inventar uma meta que não existe.
    final hasTiers = goldThreshold > 0 && silverThreshold > 0;
    final isMax = !hasTiers || points >= goldThreshold;
    final target = points >= silverThreshold ? goldThreshold : silverThreshold;
    final floor = points >= silverThreshold ? silverThreshold : 0;
    final nextLabel = points >= silverThreshold ? 'Ouro' : 'Prata';
    final progress = isMax ? 1.0 : ((points - floor) / (target - floor).clamp(1, 1 << 30)).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [tierColor.withValues(alpha: 0.20), tierColor.withValues(alpha: 0.05), palette.surface],
          stops: const [0, 0.5, 1],
        ),
        border: Border.all(color: tierColor.withValues(alpha: 0.26)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      _grouped(points),
                      style: TextStyle(
                        color: palette.textPrimary,
                        fontSize: 38,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1.6,
                        height: 1,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: Text('pontos',
                          style: TextStyle(color: palette.textFaint, fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: tierColor.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: tierColor.withValues(alpha: 0.45)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.workspace_premium_rounded, size: 12, color: tierColor),
                    const SizedBox(width: 4),
                    Text((_labels[tier] ?? tier).toUpperCase(),
                        style: TextStyle(
                            color: tierColor, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.6)),
                  ],
                ),
              ),
            ],
          ),
          if (hasTiers) ...[
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Stack(
                children: [
                  Container(height: 6, color: palette.textFaint.withValues(alpha: 0.14)),
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: progress),
                    duration: const Duration(milliseconds: 750),
                    curve: Curves.easeOutCubic,
                    builder: (context, v, _) => FractionallySizedBox(
                      widthFactor: v.clamp(0.0, 1.0),
                      child: Container(
                        height: 6,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [tierColor.withValues(alpha: 0.7), tierColor]),
                          boxShadow: [
                            BoxShadow(color: tierColor.withValues(alpha: 0.4), blurRadius: 8, spreadRadius: -1),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 9),
            Text(
              isMax
                  ? 'Você chegou ao topo. Aproveite os benefícios.'
                  : 'Faltam ${_grouped(target - points)} pts para $nextLabel',
              style: TextStyle(
                color: isMax ? tierColor : palette.textSecondary,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }

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

class _ReferralCard extends StatelessWidget {
  final String? code;
  final String reward;
  final AppPalette palette;
  final Color accent;
  final VoidCallback onUseCode;
  const _ReferralCard({
    required this.code,
    required this.reward,
    required this.palette,
    required this.accent,
    required this.onUseCode,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: palette.textFaint.withValues(alpha: 0.14)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.13), borderRadius: BorderRadius.circular(11)),
                child: Icon(Icons.group_add_rounded, color: accent, size: 19),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Seu amigo ganha $reward — e você também.',
                  style: TextStyle(color: palette.textSecondary, fontSize: 13, height: 1.35),
                ),
              ),
            ],
          ),
          if (code != null) ...[
            const SizedBox(height: 16),
            InkWell(
              onTap: () {
                Clipboard.setData(ClipboardData(text: code!));
                AppToast.success(context, 'Código copiado!');
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 17),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [accent.withValues(alpha: 0.16), accent.withValues(alpha: 0.05)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: accent.withValues(alpha: 0.4), width: 1.4),
                ),
                child: Column(
                  children: [
                    Text(
                      code!,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: accent,
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 5,
                        height: 1,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.copy_rounded, size: 12, color: palette.textFaint),
                        const SizedBox(width: 5),
                        Text('toque para copiar',
                            style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: TextButton.icon(
              onPressed: onUseCode,
              icon: Icon(Icons.redeem_rounded, size: 16, color: palette.textSecondary),
              label: Text('Tenho um código de amigo',
                  style: TextStyle(color: palette.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 11),
                backgroundColor: palette.bg.withValues(alpha: 0.6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NoProgram extends StatelessWidget {
  final AppPalette palette;
  final Color accent;
  const _NoProgram({required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 70),
      child: Column(
        children: [
          Container(
            width: 66,
            height: 66,
            decoration: BoxDecoration(shape: BoxShape.circle, color: accent.withValues(alpha: 0.09)),
            child: Icon(Icons.card_giftcard_rounded, size: 30, color: accent.withValues(alpha: 0.7)),
          ),
          const SizedBox(height: 16),
          Text('Ainda sem programa de fidelidade',
              style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 15.5)),
          const SizedBox(height: 6),
          Text('Esta barbearia ainda não ativou selos, pontos\nou indicação. Volte outra hora.',
              textAlign: TextAlign.center,
              style: TextStyle(color: palette.textFaint, fontSize: 13, height: 1.5)),
        ],
      ),
    );
  }
}

class _WalletError extends StatelessWidget {
  final AppPalette palette;
  final Color accent;
  final Future<void> Function() onRetry;
  const _WalletError({required this.palette, required this.accent, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off_rounded, size: 34, color: palette.textFaint),
            const SizedBox(height: 13),
            Text('Não consegui carregar sua carteira',
                textAlign: TextAlign.center,
                style: TextStyle(color: palette.textSecondary, fontSize: 14)),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onRetry,
              style: FilledButton.styleFrom(backgroundColor: accent),
              child: const Text('Tentar de novo'),
            ),
          ],
        ),
      ),
    );
  }
}
