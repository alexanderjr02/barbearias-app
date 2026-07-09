import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/form_sheet.dart';
import 'gestor_repository.dart';
import 'gestor_support_ticket_screen.dart';

const _statusLabel = {'OPEN': 'Aberto', 'IN_PROGRESS': 'Em andamento', 'RESOLVED': 'Resolvido', 'CLOSED': 'Fechado'};
const _statusColor = {
  'OPEN': Color(0xFF60A5FA),
  'IN_PROGRESS': Color(0xFFFBBF24),
  'RESOLVED': Color(0xFF34D399),
  'CLOSED': Color(0xFF9CA3AF),
};

/// Full ticket history — the destination behind "Ver histórico completo" in
/// [FloatingSupportButton] and behind the "Suporte" tile in "Mais", mirroring
/// the web's /dashboard/support list page.
class GestorSupportScreen extends StatefulWidget {
  const GestorSupportScreen({super.key});

  @override
  State<GestorSupportScreen> createState() => _GestorSupportScreenState();
}

class _GestorSupportScreenState extends State<GestorSupportScreen> {
  final _repository = GestorRepository();
  late Future<List<SupportTicketSummary>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.supportTickets();
  }

  void _refresh() => setState(() => _future = _repository.supportTickets());

  Future<void> _openCreate() async {
    final subjectCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();
    String priority = 'NORMAL';

    final saved = await FormSheet.show(
      context,
      title: 'Abrir chamado',
      submitLabel: 'Abrir chamado',
      onSubmit: () async {
        if (subjectCtrl.text.trim().isEmpty) throw Exception('Informe o assunto.');
        if (bodyCtrl.text.trim().isEmpty) throw Exception('Descreva o que está acontecendo.');
        await _repository.createSupportTicket(subject: subjectCtrl.text.trim(), body: bodyCtrl.text.trim(), priority: priority);
      },
      children: [
        const FieldLabel('Assunto'),
        CortixField(controller: subjectCtrl, hint: 'Ex: Erro ao gerar relatório'),
        const FieldLabel('Prioridade'),
        StatefulBuilder(
          builder: (context, setLocal) => CortixChoiceRow(
            options: const [('LOW', 'Baixa'), ('NORMAL', 'Normal'), ('HIGH', 'Alta')],
            value: priority,
            onChanged: (v) => setLocal(() => priority = v),
          ),
        ),
        const FieldLabel('Mensagem'),
        CortixField(controller: bodyCtrl, maxLines: 5, hint: 'Descreva o que está acontecendo...'),
      ],
    );
    if (saved == true) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Suporte'), elevation: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        backgroundColor: accent,
        icon: Icon(Icons.add, color: contrastingTextColor(accent)),
        label: Text('Novo chamado', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<SupportTicketSummary>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            final tickets = snapshot.data ?? [];
            if (tickets.isEmpty) {
              return ListView(
                children: [
                  const SizedBox(height: 100),
                  Icon(Icons.support_agent_rounded, size: 40, color: palette.textFaint),
                  const SizedBox(height: 10),
                  Center(child: Text('Nenhum chamado aberto ainda', style: TextStyle(color: palette.textFaint))),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
              itemCount: tickets.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final t = tickets[i];
                return Material(
                  color: palette.surface,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => GestorSupportTicketScreen(ticketId: t.id))).then((_) => _refresh()),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Icon(Icons.chat_bubble_outline_rounded, size: 16, color: palette.textFaint),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(child: Text(t.subject, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 13.5))),
                                    if (t.lastMessageIsAdmin && t.status != 'CLOSED' && t.status != 'RESOLVED') Container(width: 6, height: 6, margin: const EdgeInsets.only(left: 6), decoration: const BoxDecoration(color: Colors.amber, shape: BoxShape.circle)),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(t.lastMessage ?? '—', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: (_statusColor[t.status] ?? Colors.grey).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                            child: Text(_statusLabel[t.status] ?? t.status, style: TextStyle(color: _statusColor[t.status] ?? Colors.grey, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
