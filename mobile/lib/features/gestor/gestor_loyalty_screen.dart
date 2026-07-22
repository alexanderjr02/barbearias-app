import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';

/// Configuração do programa de fidelidade pelo celular do gestor.
///
/// Mesma ideia da web: o gestor não configura às cegas. A prévia do cartão do
/// cliente fica no topo e muda enquanto ele mexe — sem isso, "10 selos" é um
/// número abstrato e ele desiste no meio.
class GestorLoyaltyScreen extends StatefulWidget {
  const GestorLoyaltyScreen({super.key});

  @override
  State<GestorLoyaltyScreen> createState() => _GestorLoyaltyScreenState();
}

class _LoyaltyConfig {
  bool loyaltyEnabled;
  int pointsPerReal;
  int silverThreshold;
  int goldThreshold;
  bool stampEnabled;
  int stampGoal;
  String stampRewardLabel;
  bool referralEnabled;
  String referralReferrerReward;
  String referralFriendReward;

  _LoyaltyConfig({
    required this.loyaltyEnabled,
    required this.pointsPerReal,
    required this.silverThreshold,
    required this.goldThreshold,
    required this.stampEnabled,
    required this.stampGoal,
    required this.stampRewardLabel,
    required this.referralEnabled,
    required this.referralReferrerReward,
    required this.referralFriendReward,
  });

  factory _LoyaltyConfig.fromJson(Map<String, dynamic> j) => _LoyaltyConfig(
        loyaltyEnabled: j['loyaltyEnabled'] == true,
        pointsPerReal: j['pointsPerReal'] as int? ?? 10,
        silverThreshold: j['silverThreshold'] as int? ?? 501,
        goldThreshold: j['goldThreshold'] as int? ?? 1501,
        stampEnabled: j['stampEnabled'] == true,
        stampGoal: j['stampGoal'] as int? ?? 10,
        stampRewardLabel: j['stampRewardLabel'] as String? ?? '',
        referralEnabled: j['referralEnabled'] == true,
        referralReferrerReward: j['referralReferrerReward'] as String? ?? '',
        referralFriendReward: j['referralFriendReward'] as String? ?? '',
      );
}

class _GestorLoyaltyScreenState extends State<GestorLoyaltyScreen> {
  _LoyaltyConfig? _cfg;
  bool _loading = true;
  bool _saving = false;
  String? _error;
  int _previewStamps = 3;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await ApiClient.instance.get('/loyalty/config') as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _cfg = _LoyaltyConfig.fromJson(d);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Não consegui carregar o programa';
        _loading = false;
      });
    }
  }

  /// Salva só o que mudou. Em caso de falha, recarrega do servidor em vez de
  /// deixar a tela mostrando um valor que não foi gravado.
  Future<void> _save(Map<String, dynamic> patch) async {
    setState(() => _saving = true);
    try {
      final d = await ApiClient.instance.patch('/loyalty/config', data: patch) as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _cfg = _LoyaltyConfig.fromJson(d);
        _saving = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      AppToast.error(context, 'Não consegui salvar');
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        elevation: 0,
        title: const Text('Fidelidade'),
        actions: [
          if (_saving)
            Padding(
              padding: const EdgeInsets.only(right: 18),
              child: Center(
                child: SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: accent),
                ),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load, palette: palette, accent: accent)
              : _buildBody(palette, accent),
    );
  }

  Widget _buildBody(AppPalette palette, Color accent) {
    final cfg = _cfg!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        _WalletPreview(cfg: cfg, stamps: _previewStamps, palette: palette, accent: accent),
        const SizedBox(height: 22),

        _SectionCard(
          icon: Icons.confirmation_number_rounded,
          title: 'Cartão de selos',
          hint: 'A cada N cortes, um prêmio. Sai do papel e vai pro bolso do cliente.',
          enabled: cfg.stampEnabled,
          onToggle: (v) => _save({'stampEnabled': v}),
          palette: palette,
          accent: accent,
          children: [
            _StepperRow(
              label: 'Cortes para fechar',
              value: cfg.stampGoal,
              min: 2,
              max: 30,
              suffix: 'cortes',
              palette: palette,
              accent: accent,
              onChanged: (v) => _save({'stampGoal': v}),
            ),
            const SizedBox(height: 14),
            _TextRow(
              label: 'Prêmio ao completar',
              value: cfg.stampRewardLabel,
              hint: '1 corte grátis',
              palette: palette,
              accent: accent,
              onCommit: (v) => _save({'stampRewardLabel': v}),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Text('Prévia com', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                Expanded(
                  child: Slider(
                    value: _previewStamps.clamp(0, cfg.stampGoal).toDouble(),
                    min: 0,
                    max: cfg.stampGoal.toDouble(),
                    divisions: cfg.stampGoal,
                    activeColor: accent,
                    onChanged: (v) => setState(() => _previewStamps = v.round()),
                  ),
                ),
                Text('${_previewStamps.clamp(0, cfg.stampGoal)} selos',
                    style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w700)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 12),

        _SectionCard(
          icon: Icons.group_add_rounded,
          title: 'Indicação',
          hint: 'Cada cliente vira vendedor. Os dois lados ganham — e o prêmio só cai quando o amigo conclui o 1º corte.',
          enabled: cfg.referralEnabled,
          onToggle: (v) => _save({'referralEnabled': v}),
          palette: palette,
          accent: accent,
          children: [
            _TextRow(
              label: 'Quem indicou ganha',
              value: cfg.referralReferrerReward,
              hint: 'R\$ 10 de desconto',
              palette: palette,
              accent: accent,
              onCommit: (v) => _save({'referralReferrerReward': v}),
            ),
            const SizedBox(height: 14),
            _TextRow(
              label: 'O amigo ganha',
              value: cfg.referralFriendReward,
              hint: 'R\$ 10 no 1º corte',
              palette: palette,
              accent: accent,
              onCommit: (v) => _save({'referralFriendReward': v}),
            ),
          ],
        ),
        const SizedBox(height: 12),

        _SectionCard(
          icon: Icons.workspace_premium_rounded,
          title: 'Pontos e faixas',
          hint: 'Cada real vira ponto. Faixa é status — e status é o que traz o cliente de volta.',
          enabled: cfg.loyaltyEnabled,
          onToggle: (v) => _save({'loyaltyEnabled': v}),
          palette: palette,
          accent: accent,
          children: [
            _StepperRow(
              label: 'Pontos por R\$ 1',
              value: cfg.pointsPerReal,
              min: 1,
              max: 100,
              suffix: 'pts',
              palette: palette,
              accent: accent,
              onChanged: (v) => _save({'pointsPerReal': v}),
            ),
            const SizedBox(height: 16),
            _TierLadder(cfg: cfg, palette: palette),
            const SizedBox(height: 16),
            _StepperRow(
              label: 'Prata começa em',
              value: cfg.silverThreshold,
              min: 1,
              max: 100000,
              step: 50,
              suffix: 'pts',
              palette: palette,
              accent: accent,
              onChanged: (v) => _save({'silverThreshold': v}),
            ),
            const SizedBox(height: 14),
            _StepperRow(
              label: 'Ouro começa em',
              value: cfg.goldThreshold,
              min: cfg.silverThreshold + 1,
              max: 999999,
              step: 50,
              suffix: 'pts',
              palette: palette,
              accent: accent,
              onChanged: (v) => _save({'goldThreshold': v}),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: palette.bg, borderRadius: BorderRadius.circular(12)),
              child: Text(
                'Com ${cfg.pointsPerReal} pts por real, um corte de R\$ 50 rende ${cfg.pointsPerReal * 50} pontos — '
                'a Prata chega em ${(cfg.silverThreshold / (cfg.pointsPerReal * 50)).ceil().clamp(1, 999)} cortes.',
                style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.5),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/* ======================= Prévia ======================= */

class _WalletPreview extends StatelessWidget {
  final _LoyaltyConfig cfg;
  final int stamps;
  final AppPalette palette;
  final Color accent;
  const _WalletPreview({required this.cfg, required this.stamps, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    final nothingOn = !cfg.stampEnabled && !cfg.referralEnabled && !cfg.loyaltyEnabled;
    final filled = stamps.clamp(0, cfg.stampGoal);
    final remaining = (cfg.stampGoal - filled).clamp(0, cfg.stampGoal);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [accent.withValues(alpha: 0.14), palette.surface],
        ),
        border: Border.all(color: accent.withValues(alpha: 0.20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.phone_iphone_rounded, size: 14, color: accent),
              const SizedBox(width: 6),
              Text('O QUE O CLIENTE VÊ',
                  style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.8)),
            ],
          ),
          const SizedBox(height: 14),

          if (nothingOn)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 22),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.card_giftcard_rounded, size: 30, color: palette.textFaint),
                    const SizedBox(height: 10),
                    Text('Carteira vazia', style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text('Com tudo desligado o cliente não vê nada.\nLigue ao menos um mecanismo abaixo.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4)),
                  ],
                ),
              ),
            )
          else ...[
            if (cfg.stampEnabled) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Cartão de selos',
                      style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5)),
                  Text('$filled/${cfg.stampGoal}', style: TextStyle(color: accent, fontSize: 11.5)),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: List.generate(cfg.stampGoal, (i) {
                  final done = i < filled;
                  final isLast = i == cfg.stampGoal - 1;
                  return Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: done
                          ? LinearGradient(colors: [accent, accent.withValues(alpha: 0.75)])
                          : null,
                      border: done
                          ? null
                          : Border.all(
                              color: isLast ? accent.withValues(alpha: 0.5) : palette.textFaint.withValues(alpha: 0.3),
                              width: 1.5,
                            ),
                    ),
                    child: Icon(
                      done
                          ? Icons.content_cut_rounded
                          : isLast
                              ? Icons.card_giftcard_rounded
                              : Icons.circle,
                      size: done || isLast ? 13 : 4,
                      color: done
                          ? Colors.black.withValues(alpha: 0.75)
                          : isLast
                              ? accent.withValues(alpha: 0.7)
                              : palette.textFaint.withValues(alpha: 0.4),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 12),
              Text(
                remaining == 0
                    ? 'Cartela completa! Prêmio liberado'
                    : 'Faltam $remaining ${remaining == 1 ? "corte" : "cortes"} para ganhar '
                        '${cfg.stampRewardLabel.isEmpty ? "seu prêmio" : cfg.stampRewardLabel}',
                style: TextStyle(
                  color: remaining == 0 ? accent : palette.textSecondary,
                  fontSize: 11.5,
                  fontWeight: remaining == 0 ? FontWeight.w700 : FontWeight.normal,
                ),
              ),
            ],

            if (cfg.stampEnabled && (cfg.loyaltyEnabled || cfg.referralEnabled)) ...[
              const SizedBox(height: 14),
              Divider(color: palette.textFaint.withValues(alpha: 0.15), height: 1),
              const SizedBox(height: 14),
            ],

            if (cfg.loyaltyEnabled) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Seus pontos', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                      Text('${cfg.pointsPerReal * 50}',
                          style: TextStyle(color: palette.textPrimary, fontSize: 26, fontWeight: FontWeight.w900, height: 1.1)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: accent.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      cfg.pointsPerReal * 50 >= cfg.goldThreshold
                          ? 'OURO'
                          : cfg.pointsPerReal * 50 >= cfg.silverThreshold
                              ? 'PRATA'
                              : 'BRONZE',
                      style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                    ),
                  ),
                ],
              ),
            ],

            if (cfg.referralEnabled) ...[
              if (cfg.loyaltyEnabled) const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                decoration: BoxDecoration(
                  color: palette.bg.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: palette.textFaint.withValues(alpha: 0.2), style: BorderStyle.solid),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('XAN308',
                        style: TextStyle(
                            color: palette.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 3,
                            fontFamily: 'monospace')),
                    Icon(Icons.copy_rounded, size: 14, color: palette.textFaint),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/* ======================= Peças ======================= */

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String hint;
  final bool enabled;
  final ValueChanged<bool> onToggle;
  final List<Widget> children;
  final AppPalette palette;
  final Color accent;

  const _SectionCard({
    required this.icon,
    required this.title,
    required this.hint,
    required this.enabled,
    required this.onToggle,
    required this.children,
    required this.palette,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: enabled ? accent.withValues(alpha: 0.25) : palette.textFaint.withValues(alpha: 0.12),
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: enabled ? accent.withValues(alpha: 0.14) : palette.bg,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Icon(icon, size: 19, color: enabled ? accent : palette.textFaint),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: TextStyle(
                              color: enabled ? palette.textPrimary : palette.textSecondary,
                              fontWeight: FontWeight.bold,
                              fontSize: 14)),
                      const SizedBox(height: 3),
                      Text(hint, style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Switch(value: enabled, onChanged: onToggle, activeThumbColor: accent),
              ],
            ),
          ),
          // Some quando desligado — campo que não faz nada só polui a tela.
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 220),
            crossFadeState: enabled ? CrossFadeState.showFirst : CrossFadeState.showSecond,
            firstChild: Column(
              children: [
                Divider(height: 1, color: palette.textFaint.withValues(alpha: 0.12)),
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
                ),
              ],
            ),
            secondChild: const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }
}

/// Stepper em vez de teclado: no celular, digitar número em campo pequeno é
/// atrito, e aqui todo valor é um ajuste pequeno em torno do atual.
class _StepperRow extends StatelessWidget {
  final String label;
  final int value;
  final int min;
  final int max;
  final int step;
  final String suffix;
  final ValueChanged<int> onChanged;
  final AppPalette palette;
  final Color accent;

  const _StepperRow({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.suffix,
    required this.onChanged,
    required this.palette,
    required this.accent,
    this.step = 1,
  });

  @override
  Widget build(BuildContext context) {
    final canDec = value - step >= min;
    final canInc = value + step <= max;
    return Row(
      children: [
        Expanded(child: Text(label, style: TextStyle(color: palette.textSecondary, fontSize: 13))),
        Container(
          decoration: BoxDecoration(color: palette.bg, borderRadius: BorderRadius.circular(12)),
          child: Row(
            children: [
              _StepBtn(icon: Icons.remove_rounded, enabled: canDec, accent: accent, palette: palette,
                  onTap: () => onChanged(value - step)),
              SizedBox(
                width: 78,
                child: Text('$value $suffix',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 13)),
              ),
              _StepBtn(icon: Icons.add_rounded, enabled: canInc, accent: accent, palette: palette,
                  onTap: () => onChanged(value + step)),
            ],
          ),
        ),
      ],
    );
  }
}

class _StepBtn extends StatelessWidget {
  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;
  final Color accent;
  final AppPalette palette;
  const _StepBtn({required this.icon, required this.enabled, required this.onTap, required this.accent, required this.palette});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.all(9),
        child: Icon(icon, size: 17, color: enabled ? accent : palette.textFaint.withValues(alpha: 0.35)),
      ),
    );
  }
}

/// Commita no fim da edição, não a cada tecla: por tecla seria um PATCH por
/// caractere e o prêmio ficaria gravado como "1 c", "1 co", "1 cor"...
class _TextRow extends StatefulWidget {
  final String label;
  final String value;
  final String hint;
  final ValueChanged<String> onCommit;
  final AppPalette palette;
  final Color accent;
  const _TextRow({
    required this.label,
    required this.value,
    required this.hint,
    required this.onCommit,
    required this.palette,
    required this.accent,
  });

  @override
  State<_TextRow> createState() => _TextRowState();
}

class _TextRowState extends State<_TextRow> {
  late final TextEditingController _c = TextEditingController(text: widget.value);
  late final FocusNode _f = FocusNode();

  @override
  void initState() {
    super.initState();
    _f.addListener(() {
      if (!_f.hasFocus && _c.text != widget.value) widget.onCommit(_c.text);
    });
  }

  @override
  void didUpdateWidget(covariant _TextRow old) {
    super.didUpdateWidget(old);
    if (widget.value != old.value && !_f.hasFocus) _c.text = widget.value;
  }

  @override
  void dispose() {
    _c.dispose();
    _f.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: TextStyle(color: p.textFaint, fontSize: 11, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: _c,
          focusNode: _f,
          textInputAction: TextInputAction.done,
          onSubmitted: (v) { if (v != widget.value) widget.onCommit(v); },
          style: TextStyle(color: p.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: widget.hint,
            hintStyle: TextStyle(color: p.textFaint.withValues(alpha: 0.6), fontSize: 14),
            filled: true,
            fillColor: p.bg,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: widget.accent.withValues(alpha: 0.5)),
            ),
          ),
        ),
      ],
    );
  }
}

class _TierLadder extends StatelessWidget {
  final _LoyaltyConfig cfg;
  final AppPalette palette;
  const _TierLadder({required this.cfg, required this.palette});

  @override
  Widget build(BuildContext context) {
    final tiers = [
      ('Bronze', const Color(0xFFCD8155), '0–${cfg.silverThreshold - 1}'),
      ('Prata', const Color(0xFFC7CDD6), '${cfg.silverThreshold}–${cfg.goldThreshold - 1}'),
      ('Ouro', const Color(0xFFF5C518), '${cfg.goldThreshold}+'),
    ];
    return Row(
      children: [
        for (var i = 0; i < tiers.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: tiers[i].$2.withValues(alpha: 0.10),
                border: Border.all(color: tiers[i].$2.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tiers[i].$1,
                      style: TextStyle(color: tiers[i].$2, fontSize: 11.5, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 3),
                  Text(tiers[i].$3,
                      style: TextStyle(color: palette.textFaint, fontSize: 10)),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  final AppPalette palette;
  final Color accent;
  const _ErrorState({required this.message, required this.onRetry, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.cloud_off_rounded, size: 34, color: palette.textFaint),
          const SizedBox(height: 12),
          Text(message, style: TextStyle(color: palette.textSecondary, fontSize: 14)),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: onRetry,
            style: FilledButton.styleFrom(backgroundColor: accent),
            child: const Text('Tentar de novo'),
          ),
        ],
      ),
    );
  }
}
