import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/form_sheet.dart';
import 'gestor_repository.dart';

const _colorSwatches = ['#D4AF37', '#8B5CF6', '#3B82F6', '#10B981', '#EC4899', '#F97316'];
const _cycleLabels = {'MONTHLY': 'mês', 'QUARTERLY': 'trimestre', 'ANNUAL': 'ano'};
const _statusLabels = {'ACTIVE': 'Ativo', 'PAST_DUE': 'Atrasado', 'CANCELLED': 'Cancelado'};

Color _colorFromHex(String hex, [Color fallback = const Color(0xFFD4AF37)]) {
  final cleaned = hex.replaceAll('#', '');
  if (cleaned.length != 6) return fallback;
  final value = int.tryParse(cleaned, radix: 16);
  return value == null ? fallback : Color(0xFF000000 | value);
}

Color _statusColor(String status) {
  switch (status) {
    case 'ACTIVE':
      return const Color(0xFF34D399);
    case 'PAST_DUE':
      return const Color(0xFFFBBF66);
    default:
      return const Color(0xFF9CA3AF);
  }
}

const _avatarPalette = [
  Color(0xFFE07A5F), Color(0xFFD9A05B), Color(0xFF6DA34D), Color(0xFF3D9A94),
  Color(0xFF4A7FBF), Color(0xFF7C6FBF), Color(0xFFBF6FA0), Color(0xFFBF4F4F),
];
Color _avatarColorForName(String name) {
  final hash = name.trim().split('').fold<int>(0, (acc, c) => acc + c.codeUnitAt(0));
  return _avatarPalette[hash % _avatarPalette.length];
}

String _initials(String name) => name.trim().isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase();

String _formatDate(String iso) {
  try {
    final d = DateTime.parse(iso);
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  } catch (_) {
    return iso;
  }
}

/// ROI = how many times the plan already paid for itself in real services
/// delivered — the signal that turns a subscriber list into something the
/// gestor can act on before a quiet client churns.
({String label, Color color, IconData icon}) _roiBadge(GestorSubscriber sub) {
  final ratio = sub.totalPaid > 0 ? sub.valueConsumed / sub.totalPaid : 0.0;
  final daysSinceLastVisit = sub.lastVisitAt != null ? DateTime.now().difference(DateTime.parse(sub.lastVisitAt!)).inDays : 999999;
  if (sub.status != 'CANCELLED' && daysSinceLastVisit > 30) {
    return (label: 'Sem visitas há 30+ dias', color: const Color(0xFFF87171), icon: Icons.warning_amber_rounded);
  }
  if (ratio >= 1.3) {
    return (label: 'Aproveitou ${ratio.toStringAsFixed(1)}x o valor', color: const Color(0xFF34D399), icon: Icons.local_fire_department_rounded);
  }
  if (ratio >= 0.6) {
    return (label: 'Aproveitou ${ratio.toStringAsFixed(1)}x o valor', color: const Color(0xFF9CA3AF), icon: Icons.check_circle_rounded);
  }
  return (label: 'Baixo uso do plano', color: const Color(0xFFFBBF66), icon: Icons.warning_amber_rounded);
}

class GestorSubscriptionsScreen extends StatefulWidget {
  const GestorSubscriptionsScreen({super.key});

  @override
  State<GestorSubscriptionsScreen> createState() => _GestorSubscriptionsScreenState();
}

class _GestorSubscriptionsScreenState extends State<GestorSubscriptionsScreen> {
  final _repository = GestorRepository();
  late Future<List<GestorSubscriptionPlan>> _future;
  bool _locked = false;
  bool _upgrading = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<GestorSubscriptionPlan>> _load() async {
    try {
      final plans = await _repository.subscriptionPlans();
      if (mounted) setState(() => _locked = false);
      return plans;
    } on ApiException catch (e) {
      if (e.statusCode == 403) {
        if (mounted) setState(() => _locked = true);
        return [];
      }
      rethrow;
    }
  }

  void _refresh() => setState(() => _future = _load());

  Future<void> _tryUpgrade() async {
    setState(() => _upgrading = true);
    try {
      await _repository.updatePlan('ENTERPRISE');
      _refresh();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _upgrading = false);
    }
  }

  Future<void> _openCreateOrEdit([GestorSubscriptionPlan? editing]) async {
    final nameCtrl = TextEditingController(text: editing?.name ?? '');
    final descCtrl = TextEditingController(text: editing?.description ?? '');
    final priceCtrl = TextEditingController(text: editing != null ? editing.price.toStringAsFixed(2) : '');
    final benefitsCtrl = TextEditingController(text: editing?.benefits ?? '');
    String cycle = editing?.billingCycle ?? 'MONTHLY';
    String color = editing?.color ?? _colorSwatches[0];

    final saved = await FormSheet.show(
      context,
      title: editing != null ? 'Editar plano' : 'Novo plano de assinatura',
      submitLabel: editing != null ? 'Salvar alterações' : 'Criar plano',
      onSubmit: () async {
        if (nameCtrl.text.trim().isEmpty) throw Exception('Informe o nome do plano.');
        final price = double.tryParse(priceCtrl.text.replaceAll(',', '.'));
        if (price == null || price <= 0) throw Exception('Informe um preço válido.');
        if (editing != null) {
          await _repository.updateSubscriptionPlan(
            editing.id,
            name: nameCtrl.text.trim(),
            description: descCtrl.text.trim(),
            price: price,
            billingCycle: cycle,
            benefits: benefitsCtrl.text,
            color: color,
          );
        } else {
          await _repository.createSubscriptionPlan(
            name: nameCtrl.text.trim(),
            description: descCtrl.text.trim(),
            price: price,
            billingCycle: cycle,
            benefits: benefitsCtrl.text,
            color: color,
          );
        }
      },
      children: [
        const FieldLabel('Nome do plano'),
        CortixField(controller: nameCtrl, hint: 'Ex: Ilimitado Premium'),
        const FieldLabel('Descrição'),
        CortixField(controller: descCtrl, hint: 'Ex: Cortes ilimitados todo mês'),
        const FieldLabel('Preço (R\$)'),
        CortixField(controller: priceCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
        const FieldLabel('Cobrança'),
        CortixChoiceRow(
          value: cycle,
          options: const [('MONTHLY', 'Mensal'), ('QUARTERLY', 'Trimestral'), ('ANNUAL', 'Anual')],
          onChanged: (v) => cycle = v,
        ),
        const FieldLabel('Benefícios (um por linha)'),
        CortixField(controller: benefitsCtrl, maxLines: 4, hint: 'Cortes ilimitados\nPrioridade no agendamento'),
        const FieldLabel('Cor'),
        StatefulBuilder(
          builder: (context, setSheetState) => Wrap(
            spacing: 10,
            children: _colorSwatches.map((c) {
              final selected = c == color;
              return GestureDetector(
                onTap: () => setSheetState(() => color = c),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: _colorFromHex(c),
                    shape: BoxShape.circle,
                    border: selected ? Border.all(color: Colors.white, width: 2.5) : null,
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
    if (saved == true) _refresh();
  }

  Future<void> _toggleActive(GestorSubscriptionPlan plan) async {
    await _repository.updateSubscriptionPlan(plan.id, isActive: !plan.isActive);
    _refresh();
  }

  Future<void> _deletePlan(GestorSubscriptionPlan plan) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Excluir "${plan.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Excluir')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await _repository.deleteSubscriptionPlan(plan.id);
      _refresh();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _updateSubscriberStatus(GestorSubscriber sub, String status) async {
    await _repository.updateSubscriberStatus(sub.id, status);
    if (mounted) Navigator.of(context).pop();
    _refresh();
  }

  void _openSubscriberDetail(GestorSubscriber sub, GestorSubscriptionPlan plan) {
    final palette = AppPalette.of(context);
    final roi = _roiBadge(sub);
    final ratio = sub.totalPaid > 0 ? (sub.valueConsumed / sub.totalPaid).clamp(0.0, 1.0) : 0.0;
    final url = resolveAssetUrl(sub.clientAvatar);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => DraggableScrollableSheet(
        initialChildSize: 0.86,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(color: palette.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 18),
              Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: _avatarColorForName(sub.clientName),
                    backgroundImage: url != null ? NetworkImage(url) : null,
                    child: url == null ? Text(_initials(sub.clientName), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)) : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(sub.clientName, style: TextStyle(color: palette.textPrimary, fontSize: 17, fontWeight: FontWeight.bold)),
                        Text(sub.clientPhone, style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _Chip(label: _statusLabels[sub.status] ?? sub.status, bg: _statusColor(sub.status).withValues(alpha: 0.15), fg: _statusColor(sub.status)),
                  _Chip(label: plan.name, bg: palette.surfaceAlt, fg: palette.textSecondary, dot: _colorFromHex(plan.color)),
                  _Chip(label: sub.paymentMethod == 'PIX' ? 'Pix' : 'Cartão', bg: palette.surfaceAlt, fg: palette.textSecondary),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: roi.color.withValues(alpha: 0.08),
                  border: Border.all(color: roi.color.withValues(alpha: 0.25)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [Icon(roi.icon, size: 16, color: roi.color), const SizedBox(width: 6), Text(roi.label, style: TextStyle(color: palette.textPrimary, fontSize: 13.5, fontWeight: FontWeight.bold))]),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(child: _StatMini(value: '${sub.visitCount}', label: 'visitas', palette: palette)),
                        Expanded(child: _StatMini(value: 'R\$${sub.valueConsumed.toStringAsFixed(0)}', label: 'consumido', palette: palette)),
                        Expanded(child: _StatMini(value: 'R\$${sub.totalPaid.toStringAsFixed(0)}', label: 'pago', palette: palette)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(value: ratio, minHeight: 6, backgroundColor: palette.border, color: roi.color),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Text('VISITAS RECENTES', style: TextStyle(color: palette.textFaint, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
              const SizedBox(height: 8),
              if (sub.recentVisits.isEmpty)
                Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: Text('Nenhuma visita registrada ainda.', style: TextStyle(color: palette.textFaint, fontSize: 13)))
              else
                ...sub.recentVisits.map((v) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          Container(width: 32, height: 32, decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(8)), child: Icon(Icons.content_cut_rounded, size: 15, color: palette.textFaint)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(v.service, style: TextStyle(color: palette.textPrimary, fontSize: 13)),
                                Text('${v.staff} · ${_formatDate(v.date)}', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                              ],
                            ),
                          ),
                          Text('R\$${v.price.toStringAsFixed(2)}', style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.bold, fontSize: 13)),
                        ],
                      ),
                    )),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(14)),
                child: Column(
                  children: [
                    _KeyValueRow(label: 'Assinante desde', value: _formatDate(sub.startedAt), palette: palette),
                    _KeyValueRow(label: 'Próxima cobrança', value: _formatDate(sub.nextBillingAt), palette: palette),
                    _KeyValueRow(label: 'Mensalidade', value: 'R\$${plan.price.toStringAsFixed(2)}', palette: palette),
                  ],
                ),
              ),
              if (sub.status != 'CANCELLED') ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    if (sub.status == 'PAST_DUE')
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _updateSubscriberStatus(sub, 'ACTIVE'),
                          icon: const Icon(Icons.check_circle_outline, size: 18, color: Color(0xFF34D399)),
                          label: const Text('Marcar como pago', style: TextStyle(color: Color(0xFF34D399))),
                          style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF34D399)), padding: const EdgeInsets.symmetric(vertical: 13)),
                        ),
                      ),
                    if (sub.status == 'PAST_DUE') const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final ok = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: Text('Cancelar a assinatura de ${sub.clientName}?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Voltar')),
                                TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Cancelar assinatura')),
                              ],
                            ),
                          );
                          if (ok == true) _updateSubscriberStatus(sub, 'CANCELLED');
                        },
                        icon: const Icon(Icons.block, size: 18),
                        label: const Text('Cancelar'),
                        style: OutlinedButton.styleFrom(foregroundColor: palette.textSecondary, side: BorderSide(color: palette.border), padding: const EdgeInsets.symmetric(vertical: 13)),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Assinaturas'), elevation: 0),
      floatingActionButton: _locked
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openCreateOrEdit(),
              backgroundColor: accent,
              icon: Icon(Icons.add, color: contrastingTextColor(accent)),
              label: Text('Novo plano', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
            ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<GestorSubscriptionPlan>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (_locked) {
              return _LockedView(palette: palette, upgrading: _upgrading, onUpgrade: _tryUpgrade);
            }
            if (snapshot.hasError) {
              return ListView(children: [
                const SizedBox(height: 80),
                Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent))),
              ]);
            }

            final plans = snapshot.data ?? [];
            final allSubs = plans.expand((p) => p.subscriptions.map((s) => (sub: s, plan: p))).toList();
            final activeSubs = allSubs.where((e) => e.sub.status == 'ACTIVE' || e.sub.status == 'PAST_DUE').toList();
            final mrr = allSubs.where((e) => e.sub.status == 'ACTIVE').fold<double>(0, (acc, e) => acc + e.plan.price);
            final activePlanCount = plans.where((p) => p.isActive).length;
            final avgTicket = activeSubs.where((e) => e.sub.status == 'ACTIVE').isNotEmpty
                ? mrr / activeSubs.where((e) => e.sub.status == 'ACTIVE').length
                : 0.0;

            if (plans.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const SizedBox(height: 60),
                  Icon(Icons.repeat_rounded, size: 40, color: palette.textFaint),
                  const SizedBox(height: 12),
                  Center(child: Text('Nenhum plano de assinatura criado ainda', style: TextStyle(color: palette.textFaint))),
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              children: [
                RiseIn(
                  child: GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.6,
                    children: [
                      _StatCard(icon: Icons.account_balance_wallet_outlined, iconColor: const Color(0xFFFBBF24), label: 'Receita recorrente', value: 'R\$${mrr.toStringAsFixed(2)}', palette: palette),
                      _StatCard(icon: Icons.people_outline_rounded, iconColor: const Color(0xFF60A5FA), label: 'Assinantes ativos', value: '${activeSubs.length}', palette: palette),
                      _StatCard(icon: Icons.trending_up_rounded, iconColor: const Color(0xFF34D399), label: 'Ticket médio', value: 'R\$${avgTicket.toStringAsFixed(2)}', palette: palette),
                      _StatCard(icon: Icons.repeat_rounded, iconColor: const Color(0xFFA78BFA), label: 'Planos ativos', value: '$activePlanCount', palette: palette),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                ...plans.map((plan) {
                  final activePlanSubs = plan.subscriptions.where((s) => s.status == 'ACTIVE').toList();
                  final benefits = plan.benefits.split('\n').map((b) => b.trim()).where((b) => b.isNotEmpty).toList();
                  final color = _colorFromHex(plan.color);
                  return RiseIn(
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: palette.surface,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: palette.border),
                      ),
                      child: Opacity(
                        opacity: plan.isActive ? 1 : 0.5,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(height: 4, decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.vertical(top: Radius.circular(18)))),
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(child: Text(plan.name, style: TextStyle(color: palette.textPrimary, fontSize: 16, fontWeight: FontWeight.bold))),
                                      if (!plan.isActive) _Chip(label: 'Inativo', bg: palette.surfaceAlt, fg: palette.textFaint),
                                    ],
                                  ),
                                  if (plan.description != null && plan.description!.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(plan.description!, style: TextStyle(color: palette.textFaint, fontSize: 12)),
                                  ],
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
                                  const SizedBox(height: 8),
                                  Wrap(spacing: 6, children: [
                                    _Chip(label: 'Pix', bg: palette.surfaceAlt, fg: palette.textFaint),
                                    _Chip(label: 'Cartão', bg: palette.surfaceAlt, fg: palette.textFaint),
                                  ]),
                                  const SizedBox(height: 10),
                                  Divider(color: palette.border, height: 1),
                                  const SizedBox(height: 10),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${activePlanSubs.length} assinante${activePlanSubs.length == 1 ? '' : 's'}${activePlanSubs.isNotEmpty ? ' · R\$${(activePlanSubs.length * plan.price).toStringAsFixed(2)}/mês' : ''}',
                                        style: TextStyle(color: palette.textFaint, fontSize: 11.5),
                                      ),
                                      Row(
                                        children: [
                                          IconButton(
                                            icon: Icon(Icons.power_settings_new_rounded, size: 18, color: plan.isActive ? const Color(0xFF34D399) : palette.textFaint),
                                            onPressed: () => _toggleActive(plan),
                                            visualDensity: VisualDensity.compact,
                                          ),
                                          IconButton(
                                            icon: Icon(Icons.edit_outlined, size: 18, color: palette.textSecondary),
                                            onPressed: () => _openCreateOrEdit(plan),
                                            visualDensity: VisualDensity.compact,
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.redAccent),
                                            onPressed: () => _deletePlan(plan),
                                            visualDensity: VisualDensity.compact,
                                          ),
                                        ],
                                      ),
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
                }),
                if (allSubs.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('ASSINANTES', style: TextStyle(color: palette.textFaint, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  ...allSubs.map((e) {
                    final roi = _roiBadge(e.sub);
                    final url = resolveAssetUrl(e.sub.clientAvatar);
                    return Material(
                      color: palette.surface,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => _openSubscriberDetail(e.sub, e.plan),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(border: Border.all(color: palette.border), borderRadius: BorderRadius.circular(14)),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: _avatarColorForName(e.sub.clientName),
                                backgroundImage: url != null ? NetworkImage(url) : null,
                                child: url == null ? Text(_initials(e.sub.clientName), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)) : null,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(e.sub.clientName, style: TextStyle(color: palette.textPrimary, fontSize: 13.5, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    Row(
                                      children: [
                                        Container(width: 6, height: 6, margin: const EdgeInsets.only(right: 4), decoration: BoxDecoration(color: _colorFromHex(e.plan.color), shape: BoxShape.circle)),
                                        Flexible(child: Text(e.plan.name, style: TextStyle(color: palette.textFaint, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis)),
                                        if (e.sub.status != 'CANCELLED') ...[
                                          const Text(' · ', style: TextStyle(fontSize: 11)),
                                          Icon(roi.icon, size: 11, color: roi.color),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              _Chip(label: _statusLabels[e.sub.status] ?? e.sub.status, bg: _statusColor(e.sub.status).withValues(alpha: 0.15), fg: _statusColor(e.sub.status)),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _LockedView extends StatelessWidget {
  final AppPalette palette;
  final bool upgrading;
  final VoidCallback onUpgrade;
  const _LockedView({required this.palette, required this.upgrading, required this.onUpgrade});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 40),
        Container(
          width: 72,
          height: 72,
          decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFFC084FC), Color(0xFF7C3AED)]), shape: BoxShape.circle),
          child: const Icon(Icons.workspace_premium_rounded, color: Colors.black, size: 34),
        ),
        const SizedBox(height: 18),
        Center(child: Text('Assinaturas recorrentes', style: TextStyle(color: palette.textPrimary, fontSize: 19, fontWeight: FontWeight.w900), textAlign: TextAlign.center)),
        const SizedBox(height: 8),
        Center(
          child: Text(
            'Ofereça planos de assinatura para seus clientes, com cobrança automática todo mês. Exclusivo do plano White Label.',
            style: TextStyle(color: palette.textFaint, fontSize: 13.5),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 20),
        ...['Cobrança automática mensal', 'Pix e cartão de crédito', 'Receita previsível (MRR)', 'Reduza cancelamentos', 'Dashboard completo de assinantes'].map((f) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(children: [const Icon(Icons.circle, size: 6, color: Color(0xFF7C3AED)), const SizedBox(width: 10), Expanded(child: Text(f, style: TextStyle(color: palette.textSecondary, fontSize: 13)))]),
            )),
        const SizedBox(height: 24),
        SizedBox(
          height: 50,
          child: ElevatedButton(
            onPressed: upgrading ? null : onUpgrade,
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C3AED), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: upgrading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Testar plano White Label →', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14.5)),
          ),
        ),
        const SizedBox(height: 8),
        Center(child: Text('Troca o plano da barbearia para fins de demonstração — sem cobrança real.', style: TextStyle(color: palette.textFaint, fontSize: 11), textAlign: TextAlign.center)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final AppPalette palette;
  const _StatCard({required this.icon, required this.iconColor, required this.label, required this.value, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: palette.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(width: 30, height: 30, decoration: BoxDecoration(color: iconColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(9)), child: Icon(icon, size: 15, color: iconColor)),
          const Spacer(),
          Text(value, style: TextStyle(color: palette.textPrimary, fontSize: 16, fontWeight: FontWeight.w900), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _StatMini extends StatelessWidget {
  final String value;
  final String label;
  final AppPalette palette;
  const _StatMini({required this.value, required this.label, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: TextStyle(color: palette.textPrimary, fontSize: 15, fontWeight: FontWeight.w900)),
        Text(label, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
      ],
    );
  }
}

class _KeyValueRow extends StatelessWidget {
  final String label;
  final String value;
  final AppPalette palette;
  const _KeyValueRow({required this.label, required this.value, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 12)),
          Text(value, style: TextStyle(color: palette.textPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final Color bg;
  final Color fg;
  final Color? dot;
  const _Chip({required this.label, required this.bg, required this.fg, this.dot});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot != null) ...[Container(width: 6, height: 6, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)), const SizedBox(width: 5)],
          Text(label, style: TextStyle(color: fg, fontSize: 10.5, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
