import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../gestor/gestor_repository.dart';

/// The barber's personal Copiloto — a chat that answers about their own work:
/// earnings/commission, next client (with preferences + last recipe), churned
/// clients. Same role-aware backend as the gestor copilot; the server decides
/// what this barber can see. Simulated now, real AI when the key is set.
class BarbeiroCopilotScreen extends StatefulWidget {
  const BarbeiroCopilotScreen({super.key});

  @override
  State<BarbeiroCopilotScreen> createState() => _BarbeiroCopilotScreenState();
}

class _Msg {
  final String role;
  final String text;
  _Msg(this.role, this.text);
}

class _BarbeiroCopilotScreenState extends State<BarbeiroCopilotScreen> {
  final _repository = GestorRepository();
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_Msg> _messages = [];
  List<String> _suggestions = const ['Quanto vou receber esse mês?', 'Quem é meu próximo cliente?', 'Meus clientes sumidos'];
  bool _sending = false;
  String? _note;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _input.text).trim();
    if (text.isEmpty || _sending) return;
    _input.clear();
    setState(() {
      _messages.add(_Msg('user', text));
      _sending = true;
    });
    _scrollToEnd();
    try {
      final history = _messages.map((m) => {'role': m.role, 'content': m.text}).toList();
      final res = await _repository.copilotChat(history);
      if (mounted) {
        setState(() {
          _messages.add(_Msg('assistant', res.reply));
          if (res.suggestions.isNotEmpty) _suggestions = res.suggestions;
          _note = res.aiPowered ? null : res.note;
        });
        _scrollToEnd();
      }
    } catch (_) {
      if (mounted) setState(() => _messages.add(_Msg('assistant', 'Não consegui responder agora. Tente de novo.')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    });
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
        title: Row(
          children: [
            const Text('Copiloto'),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(color: accent.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(20)),
              child: Text('IA', style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              children: [
                if (_messages.isEmpty) ...[
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), shape: BoxShape.circle),
                    child: Icon(Icons.auto_awesome_rounded, color: accent, size: 30),
                  ),
                  const SizedBox(height: 14),
                  Text('Seu copiloto pessoal', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 6),
                  Text('Pergunte sobre seus ganhos, seu próximo cliente (com preferências e a receita do último corte) ou quem sumiu.', style: TextStyle(color: palette.textFaint, fontSize: 13, height: 1.4)),
                ],
                ..._messages.map((m) => _Bubble(msg: m, palette: palette, accent: accent)),
                if (_sending) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: accent)), const SizedBox(width: 8), Text('pensando…', style: TextStyle(color: palette.textFaint, fontSize: 12))])),
              ],
            ),
          ),
          if (!_sending)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final s in _suggestions)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ActionChip(
                          label: Text(s, style: TextStyle(color: accent, fontSize: 12)),
                          backgroundColor: accent.withValues(alpha: 0.10),
                          side: BorderSide(color: accent.withValues(alpha: 0.3)),
                          onPressed: () => _send(s),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          if (_note != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
              child: Row(children: [Icon(Icons.info_outline_rounded, size: 13, color: palette.textFaint), const SizedBox(width: 5), Expanded(child: Text(_note!, style: TextStyle(color: palette.textFaint, fontSize: 11)))]),
            ),
          Container(
            padding: EdgeInsets.fromLTRB(12, 10, 12, 12 + MediaQuery.of(context).padding.bottom),
            color: palette.bg,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    style: TextStyle(color: palette.textPrimary, fontSize: 14),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                    decoration: InputDecoration(
                      hintText: 'Pergunte algo…',
                      hintStyle: TextStyle(color: palette.textFaint, fontSize: 13.5),
                      filled: true,
                      fillColor: palette.surface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _sending ? null : () => _send(),
                  child: Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
                    child: Icon(Icons.arrow_upward_rounded, color: contrastingTextColor(accent)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final _Msg msg;
  final AppPalette palette;
  final Color accent;
  const _Bubble({required this.msg, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    final isUser = msg.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: isUser ? accent : palette.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
          border: isUser ? null : Border.all(color: palette.border),
        ),
        child: Text(msg.text, style: TextStyle(color: isUser ? contrastingTextColor(accent) : palette.textPrimary, fontSize: 13.5, height: 1.4)),
      ),
    );
  }
}
