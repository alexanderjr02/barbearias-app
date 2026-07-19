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
  const LoyaltyWalletScreen({super.key, required this.barbershopId, this.barbershopName});

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
      appBar: AppBar(backgroundColor: palette.bg, elevation: 0, title: Text(widget.barbershopName ?? 'Minha carteira')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : d == null
              ? Center(child: TextButton(onPressed: _load, child: const Text('Tentar de novo')))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                    children: [
                      if (d.rewards.isNotEmpty) ...[
                        _sectionLabel('SEUS PRÊMIOS', palette),
                        ...d.rewards.map((r) => _RewardCard(label: r.label, palette: palette, accent: accent)),
                        const SizedBox(height: 22),
                      ],

                      if (d.stampEnabled) ...[
                        _sectionLabel('CARTÃO FIDELIDADE', palette),
                        _StampCard(
                          stamps: d.stamps,
                          goal: d.stampGoal,
                          reward: d.stampRewardLabel,
                          completed: d.cardsCompleted,
                          palette: palette,
                          accent: accent,
                        ),
                        const SizedBox(height: 22),
                      ],

                      if (d.pointsEnabled) ...[
                        _sectionLabel('PONTOS', palette),
                        _PointsCard(points: d.points, tier: d.tier, palette: palette, accent: accent),
                        const SizedBox(height: 22),
                      ],

                      if (d.referralEnabled) ...[
                        _sectionLabel('INDIQUE UM AMIGO', palette),
                        _ReferralCard(
                          code: d.referralCode,
                          reward: d.referralReward,
                          palette: palette,
                          accent: accent,
                          onUseCode: _useCode,
                        ),
                      ],

                      if (!d.stampEnabled && !d.pointsEnabled && !d.referralEnabled)
                        Padding(
                          padding: const EdgeInsets.only(top: 60),
                          child: Column(children: [
                            Icon(Icons.card_giftcard_rounded, size: 40, color: palette.textFaint),
                            const SizedBox(height: 12),
                            Text('Esta barbearia ainda não tem\nprograma de fidelidade.', textAlign: TextAlign.center, style: TextStyle(color: palette.textFaint, fontSize: 13, height: 1.5)),
                          ]),
                        ),
                    ],
                  ),
                ),
    );
  }

  Widget _sectionLabel(String text, AppPalette palette) => Padding(
        padding: const EdgeInsets.only(bottom: 10, top: 2),
        child: Text(text, style: TextStyle(color: palette.textFaint, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.8)),
      );
}

/// A cartela. Selos preenchidos em destaque, os que faltam pontilhados — o
/// contraste é o que cria a vontade de fechar.
class _StampCard extends StatelessWidget {
  final int stamps, goal, completed;
  final String reward;
  final AppPalette palette;
  final Color accent;
  const _StampCard({required this.stamps, required this.goal, required this.reward, required this.completed, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    final left = (goal - stamps).clamp(0, goal);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [accent.withValues(alpha: 0.16), accent.withValues(alpha: 0.03)]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent.withValues(alpha: 0.28)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(
              left == 0 ? 'Cartela completa! 🎉' : left == 1 ? 'Falta 1 corte!' : 'Faltam $left cortes',
              style: TextStyle(color: palette.textPrimary, fontSize: 19, fontWeight: FontWeight.w900),
            ),
          ),
          if (completed > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(color: accent.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
              child: Text('$completed ${completed == 1 ? "cartela" : "cartelas"}', style: TextStyle(color: accent, fontSize: 10.5, fontWeight: FontWeight.w900)),
            ),
        ]),
        const SizedBox(height: 4),
        Text('Prêmio: $reward', style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w700)),
        const SizedBox(height: 18),
        Wrap(
          spacing: 9,
          runSpacing: 9,
          children: List.generate(goal, (i) {
            final filled = i < stamps;
            final isLast = i == goal - 1;
            return Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: filled ? accent : Colors.transparent,
                border: Border.all(color: filled ? accent : palette.border, width: 2, style: filled ? BorderStyle.solid : BorderStyle.solid),
              ),
              child: Icon(
                isLast ? Icons.card_giftcard_rounded : Icons.content_cut_rounded,
                size: 17,
                color: filled ? contrastingTextColor(accent) : palette.textFaint.withValues(alpha: 0.5),
              ),
            );
          }),
        ),
      ]),
    );
  }
}

class _RewardCard extends StatelessWidget {
  final String label;
  final AppPalette palette;
  final Color accent;
  const _RewardCard({required this.label, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.greenAccent.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.greenAccent.withValues(alpha: 0.35)),
      ),
      child: Row(children: [
        Container(
          width: 42, height: 42,
          decoration: BoxDecoration(color: Colors.greenAccent.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(12)),
          child: const Icon(Icons.card_giftcard_rounded, color: Colors.greenAccent, size: 21),
        ),
        const SizedBox(width: 13),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 2),
            Text('Mostre esta tela no balcão', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
          ]),
        ),
      ]),
    );
  }
}

class _PointsCard extends StatelessWidget {
  final int points;
  final String tier;
  final AppPalette palette;
  final Color accent;
  const _PointsCard({required this.points, required this.tier, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    const labels = {'BRONZE': 'Bronze', 'SILVER': 'Prata', 'GOLD': 'Ouro'};
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: palette.border)),
      child: Row(children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$points', style: TextStyle(color: palette.textPrimary, fontSize: 30, fontWeight: FontWeight.w900, height: 1)),
          Text('pontos', style: TextStyle(color: palette.textFaint, fontSize: 12)),
        ]),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(color: accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
          child: Text(labels[tier] ?? tier, style: TextStyle(color: accent, fontWeight: FontWeight.w900, fontSize: 12.5)),
        ),
      ]),
    );
  }
}

class _ReferralCard extends StatelessWidget {
  final String? code;
  final String reward;
  final AppPalette palette;
  final Color accent;
  final VoidCallback onUseCode;
  const _ReferralCard({required this.code, required this.reward, required this.palette, required this.accent, required this.onUseCode});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: palette.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Seu amigo ganha $reward — e você também.', style: TextStyle(color: palette.textSecondary, fontSize: 13, height: 1.4)),
        const SizedBox(height: 14),
        if (code != null)
          InkWell(
            onTap: () {
              Clipboard.setData(ClipboardData(text: code!));
              AppToast.success(context, 'Código copiado!');
            },
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 15),
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: accent.withValues(alpha: 0.4), width: 1.5),
              ),
              child: Column(children: [
                Text(code!, textAlign: TextAlign.center, style: TextStyle(color: accent, fontSize: 25, fontWeight: FontWeight.w900, letterSpacing: 3)),
                const SizedBox(height: 3),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.copy_rounded, size: 12, color: palette.textFaint),
                  const SizedBox(width: 4),
                  Text('toque para copiar', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                ]),
              ]),
            ),
          ),
        const SizedBox(height: 10),
        TextButton.icon(
          onPressed: onUseCode,
          icon: Icon(Icons.redeem_rounded, size: 16, color: palette.textSecondary),
          label: Text('Tenho um código de amigo', style: TextStyle(color: palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600)),
          style: TextButton.styleFrom(padding: EdgeInsets.zero, visualDensity: VisualDensity.compact),
        ),
      ]),
    );
  }
}
