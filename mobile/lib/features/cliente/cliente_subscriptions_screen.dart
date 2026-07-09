import 'package:flutter/material.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/form_sheet.dart';
import 'booking_repository.dart';
import 'client_subscription_repository.dart';

const _cycleLabels = {'MONTHLY': 'mês', 'QUARTERLY': 'trimestre', 'ANNUAL': 'ano'};
const _statusLabels = {'ACTIVE': 'Ativa', 'PAST_DUE': 'Pagamento atrasado', 'CANCELLED': 'Cancelada'};

Color _colorFromHex(String hex, [Color fallback = const Color(0xFFD4AF37)]) {
  final cleaned = hex.replaceAll('#', '');
  if (cleaned.length != 6) return fallback;
  final value = int.tryParse(cleaned, radix: 16);
  return value == null ? fallback : Color(0xFF000000 | value);
}

String _formatDate(String iso) {
  try {
    final d = DateTime.parse(iso);
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  } catch (_) {
    return iso;
  }
}

bool _luhnValid(String digits) {
  if (digits.length < 13) return false;
  var sum = 0;
  var isEven = false;
  for (var i = digits.length - 1; i >= 0; i--) {
    var d = int.parse(digits[i]);
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 == 0;
}

/// Entry point: a client may have booked at more than one barbershop, so this
/// resolves which shop(s) to offer subscriptions for — straight to the plans
/// if there's just one, a picker if there's more.
class ClientSubscriptionsScreen extends StatefulWidget {
  const ClientSubscriptionsScreen({super.key});

  @override
  State<ClientSubscriptionsScreen> createState() => _ClientSubscriptionsScreenState();
}

class _ClientSubscriptionsScreenState extends State<ClientSubscriptionsScreen> {
  final _bookingRepository = BookingRepository();
  late Future<List<ClientBarbershop>> _future;

  @override
  void initState() {
    super.initState();
    _future = _bookingRepository.myBarbershops();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Assinaturas'), elevation: 0),
      body: FutureBuilder<List<ClientBarbershop>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent)));
          }
          final shops = snapshot.data ?? [];
          if (shops.isEmpty) {
            return ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 60),
                Icon(Icons.repeat_rounded, size: 40, color: palette.textFaint),
                const SizedBox(height: 12),
                Center(child: Text('Agende uma vez em uma barbearia para ver os planos de assinatura dela aqui.', style: TextStyle(color: palette.textFaint), textAlign: TextAlign.center)),
              ],
            );
          }
          if (shops.length == 1) {
            return _BarbershopPlansBody(shop: shops.first);
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: shops.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final shop = shops[index];
              final color = _colorFromHex(shop.primaryColor);
              return Material(
                color: palette.surface,
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => _BarbershopSubscriptionScreen(shop: shop))),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(width: 44, height: 44, decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)), child: Icon(Icons.storefront_rounded, color: color)),
                        const SizedBox(width: 14),
                        Expanded(child: Text(shop.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5))),
                        Icon(Icons.chevron_right, color: palette.textFaint),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _BarbershopSubscriptionScreen extends StatelessWidget {
  final ClientBarbershop shop;
  const _BarbershopSubscriptionScreen({required this.shop});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: Text(shop.name), elevation: 0),
      body: _BarbershopPlansBody(shop: shop),
    );
  }
}

class _BarbershopPlansBody extends StatefulWidget {
  final ClientBarbershop shop;
  const _BarbershopPlansBody({required this.shop});

  @override
  State<_BarbershopPlansBody> createState() => _BarbershopPlansBodyState();
}

class _BarbershopPlansBodyState extends State<_BarbershopPlansBody> {
  final _repository = ClientSubscriptionRepository();
  late Future<BarbershopSubscriptions> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.plansFor(widget.shop.id);
  }

  void _refresh() => setState(() => _future = _repository.plansFor(widget.shop.id));

  Future<void> _cancel(MySubscription sub) async {
    final palette = AppPalette.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: palette.surface,
        title: Text('Cancelar assinatura?', style: TextStyle(color: palette.textPrimary)),
        content: Text('Você perde os benefícios do plano ${sub.planName} imediatamente.', style: TextStyle(color: palette.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Voltar')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Cancelar assinatura', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await _repository.cancelMySubscription(sub.id);
      _refresh();
    } on ApiException catch (e) {
      if (mounted) AppToast.error(context, e.message);
    }
  }

  Future<void> _openSubscribeFlow(ClientSubscriptionPlan plan) async {
    final subscribed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SubscribeSheet(plan: plan, repository: _repository),
    );
    if (subscribed == true) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    return RefreshIndicator(
      onRefresh: () async => _refresh(),
      child: FutureBuilder<BarbershopSubscriptions>(
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
          final data = snapshot.data!;
          final active = data.mySubscription != null && data.mySubscription!.status != 'CANCELLED' ? data.mySubscription : null;

          if (data.plans.isEmpty && active == null) {
            return ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 60),
                Icon(Icons.repeat_rounded, size: 40, color: palette.textFaint),
                const SizedBox(height: 12),
                Center(child: Text('Esta barbearia ainda não tem planos de assinatura.', style: TextStyle(color: palette.textFaint), textAlign: TextAlign.center)),
              ],
            );
          }

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            children: [
              if (active != null) ...[
                RiseIn(child: _MembershipCard(shopName: widget.shop.name, sub: active)),
                const SizedBox(height: 14),
                RiseIn(delay: const Duration(milliseconds: 40), child: _UsageCard(sub: active)),
                const SizedBox(height: 10),
                RiseIn(
                  delay: const Duration(milliseconds: 70),
                  child: SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: () => _cancel(active),
                      style: TextButton.styleFrom(foregroundColor: palette.textFaint, padding: const EdgeInsets.symmetric(vertical: 10)),
                      child: const Text('Cancelar assinatura', style: TextStyle(fontSize: 12.5)),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              if (data.plans.isNotEmpty) ...[
                Text(active != null ? 'Outros planos' : 'Planos disponíveis', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 12),
                ...data.plans.map((plan) {
                  final color = _colorFromHex(plan.color);
                  final benefits = plan.benefits.split('\n').map((b) => b.trim()).where((b) => b.isNotEmpty).toList();
                  final isCurrentPlan = active?.planId == plan.id;
                  return RiseIn(
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: palette.border)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(height: 4, decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.vertical(top: Radius.circular(18)))),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(plan.name, style: TextStyle(color: palette.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                                if (plan.description != null && plan.description!.isNotEmpty) Text(plan.description!, style: TextStyle(color: palette.textFaint, fontSize: 12)),
                                const SizedBox(height: 10),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.baseline,
                                  textBaseline: TextBaseline.alphabetic,
                                  children: [
                                    Text('R\$${plan.price.toStringAsFixed(2)}', style: TextStyle(color: palette.textPrimary, fontSize: 22, fontWeight: FontWeight.w900)),
                                    Text(' /${_cycleLabels[plan.billingCycle]}', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                ...benefits.map((b) => Padding(
                                      padding: const EdgeInsets.only(bottom: 3),
                                      child: Row(children: [Icon(Icons.check, size: 14, color: color), const SizedBox(width: 6), Expanded(child: Text(b, style: TextStyle(color: palette.textSecondary, fontSize: 12.5)))]),
                                    )),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    onPressed: (active != null) ? null : () => _openSubscribeFlow(plan),
                                    style: ElevatedButton.styleFrom(backgroundColor: color, padding: const EdgeInsets.symmetric(vertical: 13), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                                    child: Text(
                                      isCurrentPlan ? 'Seu plano atual' : (active != null ? 'Cancele o plano atual primeiro' : 'Assinar'),
                                      style: TextStyle(color: contrastingTextColor(color), fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// Payment step: Pix (decorative QR, matches the "no real gateway" pattern
/// used everywhere else in the app) or credit card (Luhn-validated, same
/// spirit as the web's plan-upgrade checkout) — then a success state.
class _SubscribeSheet extends StatefulWidget {
  final ClientSubscriptionPlan plan;
  final ClientSubscriptionRepository repository;
  const _SubscribeSheet({required this.plan, required this.repository});

  @override
  State<_SubscribeSheet> createState() => _SubscribeSheetState();
}

class _SubscribeSheetState extends State<_SubscribeSheet> {
  String _method = 'PIX';
  String _step = 'method'; // method | card | success
  bool _busy = false;
  String? _error;

  final _nameCtrl = TextEditingController();
  final _numberCtrl = TextEditingController();
  final _expiryCtrl = TextEditingController();
  final _cvvCtrl = TextEditingController();

  Future<void> _confirm() async {
    if (_method == 'CREDIT_CARD') {
      final digits = _numberCtrl.text.replaceAll(RegExp(r'\D'), '');
      if (_nameCtrl.text.trim().isEmpty || !_luhnValid(digits) || _expiryCtrl.text.length < 5 || _cvvCtrl.text.length < 3) {
        setState(() => _error = 'Confira os dados do cartão.');
        return;
      }
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.repository.subscribe(planId: widget.plan.id, paymentMethod: _method);
      if (mounted) setState(() => _step = 'success');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final color = _colorFromHex(widget.plan.color);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(color: palette.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            if (_step != 'success') ...[
              Text(_step == 'method' ? 'Assinar ${widget.plan.name}' : 'Dados do cartão', style: TextStyle(color: palette.textPrimary, fontSize: 17, fontWeight: FontWeight.bold)),
              Text('R\$${widget.plan.price.toStringAsFixed(2)}/${_cycleLabels[widget.plan.billingCycle]} · pagamento simulado', style: TextStyle(color: palette.textFaint, fontSize: 12)),
              const SizedBox(height: 18),
            ],
            if (_step == 'method') ...[
              Row(
                children: [
                  Expanded(child: _PaymentOptionTile(icon: Icons.qr_code_rounded, label: 'Pix', selected: _method == 'PIX', color: color, onTap: () => setState(() => _method = 'PIX'))),
                  const SizedBox(width: 10),
                  Expanded(child: _PaymentOptionTile(icon: Icons.credit_card_rounded, label: 'Cartão', selected: _method == 'CREDIT_CARD', color: color, onTap: () => setState(() => _method = 'CREDIT_CARD'))),
                ],
              ),
              if (_method == 'PIX') ...[
                const SizedBox(height: 20),
                Center(
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                    child: Icon(Icons.qr_code_2_rounded, size: 120, color: Colors.black.withValues(alpha: 0.85)),
                  ),
                ),
                const SizedBox(height: 10),
                Center(child: Text('QR code ilustrativo — sem cobrança real', style: TextStyle(color: palette.textFaint, fontSize: 11.5))),
              ],
              const SizedBox(height: 20),
              if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12.5))),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _busy
                      ? null
                      : () {
                          if (_method == 'CREDIT_CARD') {
                            setState(() => _step = 'card');
                          } else {
                            _confirm();
                          }
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: _busy
                      ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                      : Text(_method == 'PIX' ? 'Confirmar assinatura' : 'Continuar', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                ),
              ),
            ] else if (_step == 'card') ...[
              const FieldLabel('Nome no cartão'),
              CortixField(controller: _nameCtrl, hint: 'NOME COMPLETO'),
              const FieldLabel('Número do cartão'),
              CortixField(controller: _numberCtrl, hint: '0000 0000 0000 0000', keyboardType: TextInputType.number),
              Row(
                children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const FieldLabel('Validade'), CortixField(controller: _expiryCtrl, hint: 'MM/AA')])),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const FieldLabel('CVV'), CortixField(controller: _cvvCtrl, hint: '•••', keyboardType: TextInputType.number)])),
                ],
              ),
              const SizedBox(height: 14),
              if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12.5))),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _busy ? null : _confirm,
                  style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: _busy
                      ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                      : Text('Assinar por R\$${widget.plan.price.toStringAsFixed(2)}', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                ),
              ),
            ] else ...[
              const SizedBox(height: 20),
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: const BoxDecoration(color: Color(0xFF34D399), shape: BoxShape.circle),
                  child: const Icon(Icons.check_rounded, color: Colors.black, size: 36),
                ),
              ),
              const SizedBox(height: 16),
              Center(child: Text('Assinatura ativada!', style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.w900))),
              const SizedBox(height: 6),
              Center(child: Text('Você já pode aproveitar o plano ${widget.plan.name}.', style: TextStyle(color: palette.textFaint, fontSize: 13), textAlign: TextAlign.center)),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: Text('Concluir', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// A real "membership card" instead of a settings-row box — gradient in the
/// plan's own color, a card-chip decoration, and a watermark, so having a
/// subscription feels like carrying a premium card, not a line in a list.
class _MembershipCard extends StatelessWidget {
  final String shopName;
  final MySubscription sub;
  const _MembershipCard({required this.shopName, required this.sub});

  @override
  Widget build(BuildContext context) {
    final planColor = _colorFromHex(sub.color);
    final dark = Color.lerp(planColor, Colors.black, 0.55)!;
    final isActive = sub.status == 'ACTIVE';
    final statusColor = isActive ? const Color(0xFF34D399) : const Color(0xFFFBBF66);
    final monthsActive = DateTime.now().difference(DateTime.tryParse(sub.startedAt) ?? DateTime.now()).inDays ~/ 30;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [planColor, dark]),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [BoxShadow(color: planColor.withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, 12))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          children: [
            Positioned(
              right: -24,
              top: -30,
              child: Opacity(opacity: 0.12, child: Icon(Icons.content_cut_rounded, size: 150, color: Colors.white)),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(shopName.toUpperCase(), style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(20)),
                      child: Text(_statusLabels[sub.status] ?? sub.status, style: TextStyle(color: statusColor, fontSize: 10.5, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(sub.planName, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                Text('R\$${sub.price.toStringAsFixed(2)}/${_cycleLabels[sub.billingCycle]}', style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
                const SizedBox(height: 22),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const _CardChip(),
                    const SizedBox(width: 12),
                    if (monthsActive >= 1)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.local_fire_department_rounded, size: 12, color: Colors.white),
                            const SizedBox(width: 3),
                            Text('$monthsActive mês${monthsActive == 1 ? '' : 'es'} de membro', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    const Spacer(),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Próxima cobrança', style: TextStyle(color: Colors.white60, fontSize: 9.5)),
                        Text(_formatDate(sub.nextBillingAt), style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CardChip extends StatelessWidget {
  const _CardChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 34,
      height: 24,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFFDE68A), Color(0xFFD4AF37)]),
        borderRadius: BorderRadius.circular(5),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(3, (_) => Container(height: 1.2, color: Colors.black.withValues(alpha: 0.35))),
      ),
    );
  }
}

/// What most subscription products never show: not "your billing status" but
/// "what you actually got for your money" — visits taken, value received,
/// and the running savings versus paying per visit, so the client sees the
/// membership paying for itself instead of just being charged every month.
class _UsageCard extends StatelessWidget {
  final MySubscription sub;
  const _UsageCard({required this.sub});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final ratio = sub.totalPaid > 0 ? (sub.valueConsumed / sub.totalPaid).clamp(0.0, 1.0) : 0.0;
    final savings = (sub.valueConsumed - sub.totalPaid) > 0 ? (sub.valueConsumed - sub.totalPaid) : 0.0;

    final String headline;
    final IconData headlineIcon;
    final Color headlineColor;
    if (sub.visitCount == 0) {
      headline = 'Aproveite seu plano no próximo corte';
      headlineIcon = Icons.event_available_rounded;
      headlineColor = palette.textSecondary;
    } else if (savings > 0) {
      headline = 'Você já economizou R\$${savings.toStringAsFixed(0)}!';
      headlineIcon = Icons.local_fire_department_rounded;
      headlineColor = const Color(0xFF34D399);
    } else {
      headline = 'Aproveitando seu plano';
      headlineIcon = Icons.check_circle_rounded;
      headlineColor = palette.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: palette.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(headlineIcon, size: 16, color: headlineColor),
            const SizedBox(width: 7),
            Expanded(child: Text(headline, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5))),
          ]),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _StatBlock(value: '${sub.visitCount}', label: 'visita${sub.visitCount == 1 ? '' : 's'}', palette: palette)),
              Expanded(child: _StatBlock(value: 'R\$${sub.valueConsumed.toStringAsFixed(0)}', label: 'em serviços', palette: palette)),
              Expanded(child: _StatBlock(value: 'R\$${savings.toStringAsFixed(0)}', label: 'de economia', palette: palette, highlight: savings > 0)),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(value: ratio, minHeight: 6, backgroundColor: palette.border, color: const Color(0xFF34D399)),
          ),
        ],
      ),
    );
  }
}

class _StatBlock extends StatelessWidget {
  final String value;
  final String label;
  final AppPalette palette;
  final bool highlight;
  const _StatBlock({required this.value, required this.label, required this.palette, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: TextStyle(color: highlight ? const Color(0xFF34D399) : palette.textPrimary, fontSize: 16, fontWeight: FontWeight.w900)),
        Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
      ],
    );
  }
}

class _PaymentOptionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;
  const _PaymentOptionTile({required this.icon, required this.label, required this.selected, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.12) : palette.surfaceAlt,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? color : Colors.transparent, width: 1.5),
        ),
        child: Column(
          children: [
            Icon(icon, color: selected ? color : palette.textSecondary),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(color: selected ? color : palette.textSecondary, fontWeight: FontWeight.w700, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
