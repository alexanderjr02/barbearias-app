import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'gestor_repository.dart';

/// Painel da rede no celular: o consolidado no topo, a leitura do Copiloto e
/// as unidades comparadas lado a lado — o mesmo conteúdo do web, adaptado.
/// Trocar de unidade aqui reemite o token e recarrega o app inteiro.
class GestorUnitsScreen extends StatefulWidget {
  const GestorUnitsScreen({super.key});

  @override
  State<GestorUnitsScreen> createState() => _GestorUnitsScreenState();
}

class _GestorUnitsScreenState extends State<GestorUnitsScreen> {
  final _repository = GestorRepository();
  NetworkOverview? _data;
  bool _loading = true;
  String? _switching;
  bool _creating = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final d = await _repository.unitsOverview();
      if (mounted) setState(() => _data = d);
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não consegui carregar suas unidades');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _switchTo(NetworkUnit u) async {
    if (u.isCurrent) return;
    setState(() => _switching = u.id);
    try {
      await _repository.switchUnit(u.id);
      if (!mounted) return;
      AppToast.success(context, 'Você está na ${u.name}');
      // Volta pra raiz: todas as telas abertas mostram a unidade antiga.
      Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (_) {
      if (mounted) {
        AppToast.error(context, 'Não consegui entrar nesta unidade');
        setState(() => _switching = null);
      }
    }
  }

  Future<void> _openCreateSheet() async {
    final nameCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: palette.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Nova unidade', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 18)),
                const SizedBox(height: 4),
                Text('Ela nasce com o plano e a identidade visual da matriz.', style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
                const SizedBox(height: 16),
                TextField(
                  controller: nameCtrl,
                  autofocus: true,
                  style: TextStyle(color: palette.textPrimary),
                  decoration: InputDecoration(labelText: 'Nome da unidade', labelStyle: TextStyle(color: palette.textFaint), filled: true, fillColor: palette.bg, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none)),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: cityCtrl,
                  style: TextStyle(color: palette.textPrimary),
                  decoration: InputDecoration(labelText: 'Cidade (opcional)', labelStyle: TextStyle(color: palette.textFaint), filled: true, fillColor: palette.bg, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none)),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _creating
                        ? null
                        : () async {
                            final name = nameCtrl.text.trim();
                            if (name.length < 2) {
                              AppToast.error(ctx, 'Dê um nome para a unidade');
                              return;
                            }
                            setState(() => _creating = true);
                            try {
                              await _repository.createUnit(name: name, city: cityCtrl.text);
                              if (ctx.mounted) Navigator.of(ctx).pop();
                              if (mounted) AppToast.success(context, 'Unidade "$name" criada');
                              _load();
                            } catch (_) {
                              if (ctx.mounted) AppToast.error(ctx, 'Multi-unidade faz parte do plano White Label');
                            } finally {
                              if (mounted) setState(() => _creating = false);
                            }
                          },
                    style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    child: Text('Criar unidade', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _money(double v) => 'R\$ ${v.toStringAsFixed(0)}';

  String? _insight(NetworkOverview d) {
    if (d.units.length < 2) {
      return 'Com mais de uma unidade, o Copiloto passa a comparar suas lojas: quem rende mais por barbeiro, onde a agenda está vazia e em qual agir primeiro.';
    }
    NetworkUnit? byName(String? n) {
      if (n == null) return null;
      for (final u in d.units) {
        if (u.name == n) return u;
      }
      return null;
    }

    final eff = byName(d.mostEfficient);
    final worst = byName(d.leastEfficient);
    if (eff != null && worst != null && eff.name != worst.name && worst.revenuePerBarber > 0) {
      final ratio = ((eff.revenuePerBarber / worst.revenuePerBarber - 1) * 100).round();
      if (ratio >= 15) {
        return '${eff.name} rende ${_money(eff.revenuePerBarber)} por barbeiro — $ratio% a mais que ${worst.name}. Faturamento bruto engana: a loja com mais gente pode ser a menos eficiente.';
      }
    }
    final best = byName(d.best);
    if (best != null) return '${best.name} lidera o mês com ${_money(best.monthRevenue)}. As unidades estão com eficiência parecida por barbeiro.';
    return null;
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
        title: const Text('Unidades'),
        actions: [
          IconButton(icon: const Icon(Icons.add_business_rounded), tooltip: 'Nova unidade', onPressed: _openCreateSheet),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : d == null
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text('Não consegui carregar suas unidades.', style: TextStyle(color: palette.textFaint)),
                    const SizedBox(height: 8),
                    TextButton(onPressed: _load, child: const Text('Tentar de novo')),
                  ]),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    children: [
                      // Consolidado da rede
                      Row(children: [
                        Expanded(child: _Kpi(label: 'Faturamento', value: _money(d.totalRevenue), sub: 'da rede no mês', palette: palette, accent: accent)),
                        const SizedBox(width: 10),
                        Expanded(child: _Kpi(label: 'Atendimentos', value: '${d.totalAppointments}', sub: 'no mês', palette: palette, accent: accent)),
                      ]),
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(child: _Kpi(label: 'Ticket médio', value: _money(d.avgTicket), sub: 'da rede', palette: palette, accent: accent)),
                        const SizedBox(width: 10),
                        Expanded(child: _Kpi(label: 'Unidades', value: '${d.unitCount}', sub: 'ativas', palette: palette, accent: accent)),
                      ]),

                      // Leitura do Copiloto
                      if (_insight(d) != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: accent.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: accent.withValues(alpha: 0.3)),
                          ),
                          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Icon(Icons.auto_awesome_rounded, color: accent, size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('LEITURA DO COPILOTO', style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                                const SizedBox(height: 5),
                                Text(_insight(d)!, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.4)),
                              ]),
                            ),
                          ]),
                        ),
                      ],

                      const SizedBox(height: 18),
                      Text('SUAS UNIDADES', style: TextStyle(color: palette.textFaint, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                      const SizedBox(height: 10),
                      ...d.units.map((u) => _UnitCard(
                            unit: u,
                            palette: palette,
                            accent: accent,
                            isBest: d.units.length > 1 && u.name == d.best,
                            isMostEfficient: d.units.length > 1 && u.name == d.mostEfficient,
                            switching: _switching == u.id,
                            busy: _switching != null,
                            money: _money,
                            onEnter: () => _switchTo(u),
                          )),
                    ],
                  ),
                ),
    );
  }
}

class _Kpi extends StatelessWidget {
  final String label, value, sub;
  final AppPalette palette;
  final Color accent;
  const _Kpi({required this.label, required this.value, required this.sub, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: palette.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label.toUpperCase(), style: TextStyle(color: palette.textFaint, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.4)),
        const SizedBox(height: 6),
        Text(value, style: TextStyle(color: palette.textPrimary, fontSize: 19, fontWeight: FontWeight.w900)),
        Text(sub, style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
      ]),
    );
  }
}

class _UnitCard extends StatelessWidget {
  final NetworkUnit unit;
  final AppPalette palette;
  final Color accent;
  final bool isBest, isMostEfficient, switching, busy;
  final String Function(double) money;
  final VoidCallback onEnter;

  const _UnitCard({
    required this.unit,
    required this.palette,
    required this.accent,
    required this.isBest,
    required this.isMostEfficient,
    required this.switching,
    required this.busy,
    required this.money,
    required this.onEnter,
  });

  @override
  Widget build(BuildContext context) {
    final u = unit;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: u.isCurrent ? accent.withValues(alpha: 0.5) : palette.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(u.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15), overflow: TextOverflow.ellipsis)),
                if (isBest) ...[const SizedBox(width: 6), Icon(Icons.emoji_events_rounded, color: accent, size: 15)],
              ]),
              const SizedBox(height: 2),
              Row(children: [
                if (u.isPrimary) _tag('Matriz', palette.textFaint, palette),
                if (u.isCurrent) ...[const SizedBox(width: 5), _tag('Você está aqui', accent, palette)],
              ]),
            ]),
          ),
        ]),
        const SizedBox(height: 10),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(money(u.monthRevenue), style: TextStyle(color: palette.textPrimary, fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(width: 8),
          if (u.weekDeltaPercent != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: Row(children: [
                Icon(u.weekDeltaPercent! >= 0 ? Icons.trending_up_rounded : Icons.trending_down_rounded,
                    color: u.weekDeltaPercent! >= 0 ? Colors.greenAccent : Colors.redAccent, size: 14),
                Text('${u.weekDeltaPercent!.abs().toStringAsFixed(0)}%',
                    style: TextStyle(color: u.weekDeltaPercent! >= 0 ? Colors.greenAccent : Colors.redAccent, fontSize: 11.5, fontWeight: FontWeight.w700)),
              ]),
            ),
        ]),
        Text('no mês · ${u.appointments} atendimentos', style: TextStyle(color: palette.textFaint, fontSize: 11)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _metric('Ticket médio', money(u.avgTicket), false)),
          const SizedBox(width: 8),
          Expanded(child: _metric('Por barbeiro', money(u.revenuePerBarber), isMostEfficient)),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: _metric('Equipe', '${u.staffCount}', false)),
          const SizedBox(width: 8),
          Expanded(child: _metric('Vagas hoje', '${u.emptySlotsToday}', false)),
        ]),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: u.isCurrent || busy ? null : onEnter,
            style: ElevatedButton.styleFrom(
              backgroundColor: u.isCurrent ? palette.bg : accent,
              padding: const EdgeInsets.symmetric(vertical: 11),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: switching
                ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                : Text(
                    u.isCurrent ? 'Unidade atual' : 'Entrar nesta unidade',
                    style: TextStyle(color: u.isCurrent ? palette.textFaint : contrastingTextColor(accent), fontWeight: FontWeight.bold, fontSize: 13),
                  ),
          ),
        ),
      ]),
    );
  }

  Widget _tag(String text, Color color, AppPalette palette) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(6)),
        child: Text(text, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w900)),
      );

  Widget _metric(String label, String value, bool highlight) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: highlight ? Colors.greenAccent.withValues(alpha: 0.10) : palette.bg,
          borderRadius: BorderRadius.circular(10),
          border: highlight ? Border.all(color: Colors.greenAccent.withValues(alpha: 0.35)) : null,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 9.5)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(color: highlight ? Colors.greenAccent : palette.textPrimary, fontSize: 13.5, fontWeight: FontWeight.w800)),
          if (highlight) Text('mais eficiente', style: const TextStyle(color: Colors.greenAccent, fontSize: 8.5)),
        ]),
      );
}
