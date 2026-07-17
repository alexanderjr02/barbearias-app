import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/typewriter_text.dart';
import '../../core/widgets/voice_input_button.dart';
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
  final FlutterTts _tts = FlutterTts();
  bool _speak = false;
  final List<_Msg> _messages = [];
  List<String> _suggestions = const ['🎙️ Briefing do meu próximo cliente', 'Quanto vou receber esse mês?', 'Meus clientes sumidos'];
  bool _sending = false;
  bool _greetingLoading = true;
  String? _conversationId;
  String? _note;

  @override
  void initState() {
    super.initState();
    _loadConversation();
  }

  Future<void> _loadConversation() async {
    try {
      final res = await _repository.copilotHistory();
      if (!mounted) return;
      _conversationId = res.conversationId ?? 'c${DateTime.now().millisecondsSinceEpoch}';
      if (res.messages.isNotEmpty) {
        setState(() {
          _greetingLoading = false;
          _messages.addAll(res.messages.map((h) => _Msg(h.role == 'user' ? 'user' : 'assistant', h.text)));
        });
        _scrollToEnd();
      } else {
        _loadGreeting();
      }
    } catch (_) {
      _conversationId ??= 'c${DateTime.now().millisecondsSinceEpoch}';
      _loadGreeting();
    }
  }

  Future<void> _loadGreeting() async {
    try {
      final res = await _repository.copilotGreeting();
      if (!mounted) return;
      setState(() {
        _greetingLoading = false;
        if (res.greeting.trim().isNotEmpty) _messages.add(_Msg('assistant', res.greeting));
      });
      _scrollToEnd();
    } catch (_) {
      if (mounted) setState(() => _greetingLoading = false);
    }
  }

  @override
  void dispose() {
    _tts.stop();
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
      final res = await _repository.copilotChat(history, conversationId: _conversationId);
      if (mounted) {
        setState(() {
          _messages.add(_Msg('assistant', res.reply));
          if (res.suggestions.isNotEmpty) _suggestions = res.suggestions;
          _note = res.aiPowered ? null : res.note;
        });
        _scrollToEnd();
        if (_speak && res.reply.trim().isNotEmpty) {
          _tts.setLanguage('pt-BR');
          _tts.stop();
          _tts.speak(res.reply);
        }
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

  void _newConversation() {
    setState(() {
      _messages.clear();
      _greetingLoading = true;
      _conversationId = 'c${DateTime.now().millisecondsSinceEpoch}';
    });
    _loadGreeting();
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
        actions: [
          IconButton(
            icon: Icon(_speak ? Icons.volume_up_rounded : Icons.volume_off_rounded, color: _speak ? accent : null),
            tooltip: _speak ? 'Voz ligada' : 'Ler respostas em voz alta',
            onPressed: () {
              setState(() => _speak = !_speak);
              if (!_speak) _tts.stop();
            },
          ),
          if (_messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.add_comment_outlined),
              tooltip: 'Nova conversa',
              onPressed: _newConversation,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              children: [
                if (_messages.isEmpty && !_greetingLoading) ...[
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), shape: BoxShape.circle),
                    child: Icon(Icons.auto_awesome_rounded, color: accent, size: 30),
                  ),
                  const SizedBox(height: 14),
                  Text('Seu copiloto pessoal', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 6),
                  Text('Peça o briefing do seu próximo cliente (avaliação, preferências, receita do último corte, aniversário e dica de venda), veja seus ganhos ou quem sumiu. Ative a voz 🔊 pra ouvir o briefing antes de atender.', style: TextStyle(color: palette.textFaint, fontSize: 13, height: 1.4)),
                ],
                ..._messages.asMap().entries.map((e) => _Bubble(msg: e.value, palette: palette, accent: accent, animate: e.value.role == 'assistant' && e.key == _messages.length - 1)),
                if (_sending || _greetingLoading) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: accent)), const SizedBox(width: 8), Text(_greetingLoading && _messages.isEmpty ? 'preparando seu resumo…' : 'pensando…', style: TextStyle(color: palette.textFaint, fontSize: 12))])),
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
                VoiceInputButton(controller: _input, color: palette.textSecondary),
                const SizedBox(width: 4),
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
  final bool animate;
  const _Bubble({required this.msg, required this.palette, required this.accent, this.animate = false});

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
        child: isUser
            ? Text(msg.text, style: TextStyle(color: contrastingTextColor(accent), fontSize: 13.5, height: 1.4))
            : TypewriterText(text: msg.text, animate: animate, style: TextStyle(color: palette.textPrimary, fontSize: 13.5, height: 1.4)),
      ),
    );
  }
}
