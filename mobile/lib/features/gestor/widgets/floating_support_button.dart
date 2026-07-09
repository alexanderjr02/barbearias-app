import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../gestor_repository.dart';
import '../gestor_support_screen.dart';
import '../gestor_support_ticket_screen.dart';

const _statusLabel = {'OPEN': 'Aberto', 'IN_PROGRESS': 'Em andamento', 'RESOLVED': 'Resolvido', 'CLOSED': 'Fechado'};
const _statusColor = {
  'OPEN': Color(0xFF60A5FA),
  'IN_PROGRESS': Color(0xFFFBBF24),
  'RESOLVED': Color(0xFF34D399),
  'CLOSED': Color(0xFF9CA3AF),
};

/// Always-reachable "talk to CORTIX support" bubble, mirroring
/// [FloatingChatbot]'s bubble+panel structure but wired to the real
/// SupportTicket system: sending a message here replies to the gestor's
/// most recent open ticket, or opens a new one — no navigation required to
/// get a message to the team. Meant to be dropped into a Stack above
/// [GestorShell]'s Scaffold, same pattern as the client shell's chatbot.
class FloatingSupportButton extends StatefulWidget {
  const FloatingSupportButton({super.key});

  @override
  State<FloatingSupportButton> createState() => _FloatingSupportButtonState();
}

class _FloatingSupportButtonState extends State<FloatingSupportButton> {
  static const double _navClearance = 92;

  final _repository = GestorRepository();
  bool _open = false;
  bool _sending = false;
  String? _error;
  final _controller = TextEditingController();
  Future<List<SupportTicketSummary>>? _future;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _load() => setState(() => _future = _repository.supportTickets());

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final tickets = await (_future ?? Future.value(<SupportTicketSummary>[]));
      final openTicket = tickets.where((t) => t.status == 'OPEN' || t.status == 'IN_PROGRESS').firstOrNull;
      if (openTicket != null) {
        await _repository.replySupportTicket(openTicket.id, body);
      } else {
        await _repository.createSupportTicket(subject: body.length > 60 ? body.substring(0, 60) : body, body: body);
      }
      _controller.clear();
      _load();
    } catch (e) {
      setState(() => _error = 'Erro ao enviar mensagem');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return Stack(
      children: [
        Positioned(
          right: 16,
          left: 16,
          bottom: _navClearance + 68 + bottomInset,
          child: IgnorePointer(
            ignoring: !_open,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 240),
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: ScaleTransition(alignment: Alignment.bottomLeft, scale: Tween(begin: 0.86, end: 1.0).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutBack)), child: child),
              ),
              child: _open ? _buildPanel(context, accent, key: const ValueKey('panel')) : const SizedBox.shrink(key: ValueKey('empty')),
            ),
          ),
        ),
        Positioned(
          left: 16,
          bottom: _navClearance + bottomInset,
          child: GestureDetector(
            onTap: () {
              setState(() => _open = !_open);
              if (_open && _future == null) _load();
            },
            child: SizedBox(
              width: 56,
              height: 56,
              child: FutureBuilder<List<SupportTicketSummary>>(
                future: _future,
                builder: (context, snapshot) {
                  final pending = (snapshot.data ?? []).where((t) => t.lastMessageIsAdmin && t.status != 'CLOSED' && t.status != 'RESOLVED').length;
                  return Stack(
                    clipBehavior: Clip.none,
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [accent, accent.withValues(alpha: 0.7)]),
                          boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.5), blurRadius: 18, offset: const Offset(0, 8))],
                        ),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          child: Icon(_open ? Icons.close_rounded : Icons.support_agent_rounded, key: ValueKey(_open), color: contrastingTextColor(accent), size: 26),
                        ),
                      ),
                      if (!_open && pending > 0)
                        Positioned(
                          top: -2,
                          right: -2,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                            constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                            child: Text('$pending', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPanel(BuildContext context, Color accent, {required Key key}) {
    final onAccent = contrastingTextColor(accent);
    return Container(
      key: key,
      height: 440,
      decoration: BoxDecoration(
        color: const Color(0xFF141418),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 30, offset: Offset(0, 16))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(gradient: LinearGradient(colors: [accent, accent.withValues(alpha: 0.75)])),
            child: Row(
              children: [
                CircleAvatar(radius: 16, backgroundColor: onAccent.withValues(alpha: 0.16), child: Icon(Icons.support_agent_rounded, color: onAccent, size: 18)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Suporte CORTIX', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold, fontSize: 14)),
                      Text('Normalmente respondemos rápido', style: TextStyle(color: onAccent.withValues(alpha: 0.7), fontSize: 11)),
                    ],
                  ),
                ),
                IconButton(onPressed: () => setState(() => _open = false), icon: Icon(Icons.close, color: onAccent.withValues(alpha: 0.7), size: 20)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _controller,
                  minLines: 2,
                  maxLines: 3,
                  style: const TextStyle(color: Colors.white, fontSize: 13.5),
                  decoration: InputDecoration(
                    hintText: 'Como podemos ajudar?',
                    hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.06),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  ),
                ),
                if (_error != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 11.5))),
                const SizedBox(height: 8),
                SizedBox(
                  height: 38,
                  child: ElevatedButton.icon(
                    onPressed: _sending ? null : _send,
                    style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    icon: _sending ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: onAccent)) : Icon(Icons.send_rounded, size: 15, color: onAccent),
                    label: Text('Enviar', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold, fontSize: 12.5)),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<SupportTicketSummary>>(
              future: _future,
              builder: (context, snapshot) {
                final tickets = snapshot.data ?? [];
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (tickets.isEmpty) {
                  return const Center(child: Padding(padding: EdgeInsets.symmetric(horizontal: 24), child: Text('Sua conversa com o suporte aparece aqui.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white38, fontSize: 12))));
                }
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  itemCount: tickets.length > 5 ? 5 : tickets.length,
                  separatorBuilder: (_, _) => const Divider(color: Colors.white12, height: 1),
                  itemBuilder: (context, i) {
                    final t = tickets[i];
                    return ListTile(
                      dense: true,
                      onTap: () {
                        setState(() => _open = false);
                        Navigator.of(context).push(MaterialPageRoute(builder: (_) => GestorSupportTicketScreen(ticketId: t.id))).then((_) => _load());
                      },
                      title: Row(
                        children: [
                          Expanded(child: Text(t.subject, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600))),
                          if (t.lastMessageIsAdmin && t.status != 'CLOSED' && t.status != 'RESOLVED') Container(width: 6, height: 6, margin: const EdgeInsets.only(left: 6), decoration: const BoxDecoration(color: Colors.amber, shape: BoxShape.circle)),
                        ],
                      ),
                      subtitle: Text(t.lastMessage ?? '—', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white54, fontSize: 11)),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(color: (_statusColor[t.status] ?? Colors.grey).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                        child: Text(_statusLabel[t.status] ?? t.status, style: TextStyle(color: _statusColor[t.status] ?? Colors.grey, fontSize: 9.5, fontWeight: FontWeight.bold)),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () {
                setState(() => _open = false);
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorSupportScreen())).then((_) => _load());
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: const BoxDecoration(border: Border(top: BorderSide(color: Colors.white12))),
                alignment: Alignment.center,
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Ver histórico completo', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
                    Icon(Icons.chevron_right, color: Colors.white70, size: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
