import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/form_sheet.dart';
import 'gestor_repository.dart';

const _categoryPalette = [
  Color(0xFFF59E0B),
  Color(0xFF3B82F6),
  Color(0xFF8B5CF6),
  Color(0xFFEC4899),
  Color(0xFF10B981),
  Color(0xFFEF4444),
  Color(0xFF06B6D4),
  Color(0xFFF97316),
];

class GestorFinanceScreen extends StatefulWidget {
  const GestorFinanceScreen({super.key});

  @override
  State<GestorFinanceScreen> createState() => _GestorFinanceScreenState();
}

class _GestorFinanceScreenState extends State<GestorFinanceScreen> {
  final _repository = GestorRepository();
  late Future<FinanceSummary> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.finance();
  }

  void _refresh() => setState(() => _future = _repository.finance());

  Future<void> _openCreate() async {
    final categoryCtrl = TextEditingController();
    final descriptionCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final paymentCtrl = TextEditingController();
    String type = 'EXPENSE';

    final saved = await FormSheet.show(
      context,
      title: 'Novo lançamento',
      submitLabel: 'Criar lançamento',
      onSubmit: () async {
        if (categoryCtrl.text.trim().isEmpty) throw Exception('Informe a categoria.');
        if (descriptionCtrl.text.trim().isEmpty) throw Exception('Informe a descrição.');
        final amount = double.tryParse(amountCtrl.text.replaceAll(',', '.'));
        if (amount == null || amount <= 0) throw Exception('Informe um valor válido.');
        await _repository.createTransaction(
          type: type,
          category: categoryCtrl.text.trim(),
          description: descriptionCtrl.text.trim(),
          amount: amount,
          paymentMethod: paymentCtrl.text.trim().isEmpty ? null : paymentCtrl.text.trim(),
        );
      },
      children: [
        StatefulBuilder(
          builder: (context, setSheetState) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const FieldLabel('Tipo'),
              CortixChoiceRow(
                value: type,
                options: const [('EXPENSE', 'Despesa'), ('INCOME', 'Receita')],
                onChanged: (v) => setSheetState(() => type = v),
              ),
              const FieldLabel('Categoria'),
              CortixField(controller: categoryCtrl, hint: 'Ex: Aluguel, Produtos, Marketing'),
              const FieldLabel('Descrição'),
              CortixField(controller: descriptionCtrl, hint: 'Ex: Aluguel do espaço'),
              const FieldLabel('Valor (R\$)'),
              CortixField(controller: amountCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
              const FieldLabel('Forma de pagamento'),
              CortixField(controller: paymentCtrl, hint: 'PIX, Cartão, Dinheiro...'),
            ],
          ),
        ),
      ],
    );
    if (saved == true) _refresh();
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Financeiro'), elevation: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        backgroundColor: accent,
        icon: Icon(Icons.add, color: contrastingTextColor(accent)),
        label: Text('Lançamento', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<FinanceSummary>(
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
            final f = snapshot.data!;
            final margin = f.income > 0 ? (f.profit / f.income * 100).round() : 0;

            final categoryTotals = <String, double>{};
            for (final t in f.transactions.where((t) => t.type == 'EXPENSE')) {
              categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + t.amount;
            }
            final categories = categoryTotals.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                RiseIn(
                  child: Row(
                    children: [
                      Expanded(
                        child: _Card(
                          icon: Icons.arrow_upward_rounded,
                          iconColor: Colors.green,
                          label: 'Receitas',
                          value: 'R\$ ${f.income.toStringAsFixed(2)}',
                          palette: palette,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _Card(
                          icon: Icons.arrow_downward_rounded,
                          iconColor: Colors.redAccent,
                          label: 'Despesas',
                          value: 'R\$ ${f.expenses.toStringAsFixed(2)}',
                          palette: palette,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                RiseIn(
                  delay: const Duration(milliseconds: 40),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: f.profit >= 0 ? accent.withValues(alpha: 0.12) : Colors.redAccent.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: f.profit >= 0 ? accent.withValues(alpha: 0.3) : Colors.redAccent.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Lucro líquido', style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                            Text('R\$ ${f.profit.toStringAsFixed(2)}', style: TextStyle(color: f.profit >= 0 ? accent : Colors.redAccent, fontSize: 22, fontWeight: FontWeight.w900)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(20)),
                          child: Text('$margin% margem', style: TextStyle(color: palette.textPrimary, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Receita: R\$ ${f.serviceRevenue.toStringAsFixed(2)} de serviços · R\$ ${f.manualIncome.toStringAsFixed(2)} manual',
                    style: TextStyle(color: palette.textFaint, fontSize: 11.5),
                  ),
                ),
                if (categories.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(18)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Despesas por categoria', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5)),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            SizedBox(
                              width: 110,
                              height: 110,
                              child: PieChart(
                                PieChartData(
                                  sectionsSpace: 2,
                                  centerSpaceRadius: 26,
                                  sections: categories.asMap().entries
                                      .map((e) => PieChartSectionData(
                                            value: e.value.value,
                                            color: _categoryPalette[e.key % _categoryPalette.length],
                                            radius: 20,
                                            showTitle: false,
                                          ))
                                      .toList(),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: categories.asMap().entries
                                    .map((e) => Padding(
                                          padding: const EdgeInsets.only(bottom: 6),
                                          child: Row(
                                            children: [
                                              Container(width: 8, height: 8, decoration: BoxDecoration(color: _categoryPalette[e.key % _categoryPalette.length], shape: BoxShape.circle)),
                                              const SizedBox(width: 8),
                                              Expanded(child: Text(e.value.key, style: TextStyle(color: palette.textSecondary, fontSize: 11.5), overflow: TextOverflow.ellipsis)),
                                              Text('R\$ ${e.value.value.toStringAsFixed(0)}', style: TextStyle(color: palette.textPrimary, fontSize: 11.5, fontWeight: FontWeight.w700)),
                                            ],
                                          ),
                                        ))
                                    .toList(),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                Text('Últimos lançamentos', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 10),
                if (f.transactions.isEmpty)
                  Text('Nenhum lançamento manual registrado ainda.', style: TextStyle(color: palette.textFaint)),
                ...f.transactions.map((t) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(color: (t.type == 'INCOME' ? Colors.green : Colors.redAccent).withValues(alpha: 0.14), shape: BoxShape.circle),
                            child: Icon(t.type == 'INCOME' ? Icons.arrow_upward : Icons.arrow_downward, size: 15, color: t.type == 'INCOME' ? Colors.green : Colors.redAccent),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(t.description, style: TextStyle(color: palette.textPrimary, fontSize: 13, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis),
                                Text('${_formatDate(t.date)}${t.paymentMethod != null ? ' · ${t.paymentMethod}' : ''}', style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
                              ],
                            ),
                          ),
                          Text(
                            '${t.type == 'INCOME' ? '+' : '-'}R\$ ${t.amount.toStringAsFixed(2)}',
                            style: TextStyle(color: t.type == 'INCOME' ? Colors.green : Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 12.5),
                          ),
                        ],
                      ),
                    )),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final AppPalette palette;

  const _Card({required this.icon, required this.iconColor, required this.label, required this.value, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 18),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 11)),
        ],
      ),
    );
  }
}
