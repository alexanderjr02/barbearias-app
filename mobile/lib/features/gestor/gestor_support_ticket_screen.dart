import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'gestor_repository.dart';

const _statusLabel = {'OPEN': 'Aberto', 'IN_PROGRESS': 'Em andamento', 'RESOLVED': 'Resolvido', 'CLOSED': 'Fechado'};
const _statusColor = {
  'OPEN': Color(0xFF60A5FA),
  'IN_PROGRESS': Color(0xFFFBBF24),
  'RESOLVED': Color(0xFF34D399),
  'CLOSED': Color(0xFF9CA3AF),
};

class GestorSupportTicketScreen extends StatefulWidget {
  final String ticketId;
  const GestorSupportTicketScreen({super.key, required this.ticketId});

  @override
  State<GestorSupportTicketScreen> createState() => _GestorSupportTicketScreenState();
}

class _GestorSupportTicketScreenState extends State<GestorSupportTicketScreen> {
  final _repository = GestorRepository();
  late Future<SupportTicketDetail> _future;
  final _replyController = TextEditingController();
  final _scrollController = ScrollController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _future = _repository.supportTicketDetail(widget.ticketId);
  }

  @override
  void dispose() {
    _replyController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _refresh() => setState(() => _future = _repository.supportTicketDetail(widget.ticketId));

  Future<void> _send() async {
    final body = _replyController.text.trim();
    if (body.isEmpty) return;
    setState(() => _sending = true);
    try {
      await _repository.replySupportTicket(widget.ticketId, body);
      _replyController.clear();
      _refresh();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _close() async {
    await _repository.closeSupportTicket(widget.ticketId);
    _refresh();
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
        title: FutureBuilder<SupportTicketDetail>(
          future: _future,
          builder: (context, snapshot) => Text(snapshot.data?.subject ?? 'Chamado', overflow: TextOverflow.ellipsis, style: TextStyle(color: palette.textPrimary, fontSize: 15)),
        ),
      ),
      body: FutureBuilder<SupportTicketDetail>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || snapshot.data == null) {
            return Center(child: Text('Erro ao carregar chamado', style: TextStyle(color: palette.textFaint)));
          }
          final t = snapshot.data!;
          final closed = t.status == 'CLOSED';

          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_scrollController.hasClients) _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
          });

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(color: (_statusColor[t.status] ?? Colors.grey).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                      child: Text(_statusLabel[t.status] ?? t.status, style: TextStyle(color: _statusColor[t.status] ?? Colors.grey, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                    const Spacer(),
                    if (!closed)
                      TextButton(
                        onPressed: _close,
                        child: Text('Marcar como resolvido', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
                  itemCount: t.messages.length,
                  itemBuilder: (context, i) {
                    final m = t.messages[i];
                    return Align(
                      alignment: m.isAdmin ? Alignment.centerLeft : Alignment.centerRight,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                        decoration: BoxDecoration(
                          color: m.isAdmin ? Colors.purple.withValues(alpha: 0.12) : accent.withValues(alpha: 0.14),
                          border: Border.all(color: m.isAdmin ? Colors.purple.withValues(alpha: 0.25) : accent.withValues(alpha: 0.25)),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                if (m.isAdmin) const Padding(padding: EdgeInsets.only(right: 4), child: Icon(Icons.verified_user_rounded, size: 12, color: Colors.purpleAccent)),
                                Text(m.isAdmin ? 'Suporte CORTIX' : m.authorName, style: TextStyle(color: palette.textSecondary, fontSize: 11, fontWeight: FontWeight.w700)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(m.body, style: TextStyle(color: palette.textPrimary, fontSize: 13.5, height: 1.35)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              if (!closed)
                Padding(
                  padding: EdgeInsets.fromLTRB(14, 8, 14, MediaQuery.of(context).viewInsets.bottom > 0 ? 8 : 20),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _replyController,
                          minLines: 1,
                          maxLines: 3,
                          style: TextStyle(color: palette.textPrimary, fontSize: 13.5),
                          decoration: InputDecoration(
                            hintText: 'Escreva uma resposta...',
                            hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
                            filled: true,
                            fillColor: palette.surfaceAlt,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: _sending ? null : _send,
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
                          child: _sending
                              ? Padding(padding: const EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                              : Icon(Icons.send_rounded, color: contrastingTextColor(accent), size: 18),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Text('Este chamado está fechado.', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                ),
            ],
          );
        },
      ),
    );
  }
}
