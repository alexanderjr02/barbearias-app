import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';
import '../../core/brand/rukz_symbol.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/typewriter_text.dart';
import '../../core/widgets/voice_input_button.dart';
import '../chatbot/chatbot_responses.dart';
import 'booking_repository.dart';
import 'client_repository.dart';

/// O Copiloto do cliente — a MESMA tela cheia do copiloto do barbeiro e do
/// gestor (abre por Navigator.push a partir do botão flutuante), agora com o
/// backend do cliente: marca horário, vê pontos, guarda referência na Carteira
/// de Cortes e roda o "provador de corte" (styleAdvisor). Antes isso vivia num
/// painelzinho flutuante (FloatingChatbot) que abria diferente dos outros
/// papéis — aqui a experiência fica igual para os três.
class ClienteCopilotScreen extends StatefulWidget {
  const ClienteCopilotScreen({super.key});

  @override
  State<ClienteCopilotScreen> createState() => _ClienteCopilotScreenState();
}

class _Msg {
  final String role; // 'user' | 'assistant'
  final String text;
  final String? imageUrl;
  _Msg(this.role, this.text, {this.imageUrl});
}

class _ClienteCopilotScreenState extends State<ClienteCopilotScreen> {
  final _clientRepo = ClientRepository();
  final _bookingRepo = BookingRepository();
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final FlutterTts _tts = FlutterTts();
  bool _speak = false;
  final List<_Msg> _messages = [];
  bool _sending = false;
  bool _greetingLoading = true;
  String? _barbershopId;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  Future<void> _resolve() async {
    try {
      final shops = await _bookingRepo.myBarbershops();
      if (!mounted) return;
      if (shops.isNotEmpty) _barbershopId = shops.first.id;
    } catch (_) {}
    await _loadConversation();
  }

  Future<void> _loadConversation() async {
    final id = _barbershopId;
    if (id == null) {
      if (mounted) setState(() => _greetingLoading = false);
      return;
    }
    // Continua a conversa de onde parou (persistida por cliente).
    try {
      final hist = await _clientRepo.clientChatHistory(id);
      if (!mounted) return;
      if (hist.isNotEmpty) {
        setState(() {
          _greetingLoading = false;
          _messages.addAll(hist.map((h) => _Msg(h.role == 'user' ? 'user' : 'assistant', h.text)));
        });
        _scrollToEnd();
        return;
      }
    } catch (_) {}
    // Sem histórico → a abertura proativa (se está na hora do corte, já propõe).
    try {
      final opener = await _clientRepo.clientChatGreeting(id);
      if (!mounted) return;
      setState(() {
        _greetingLoading = false;
        if (opener.greeting.trim().isNotEmpty) _messages.add(_Msg('assistant', opener.greeting));
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

    String reply;
    final id = _barbershopId;
    try {
      if (id != null) {
        reply = await _clientRepo.clientChatSend(message: text, barbershopId: id);
        if (reply.trim().isEmpty) reply = matchChatbotResponse(text) ?? chatbotDefaultResponse;
      } else {
        reply = matchChatbotResponse(text) ?? chatbotDefaultResponse;
      }
    } catch (_) {
      reply = matchChatbotResponse(text) ?? chatbotDefaultResponse;
    }

    if (!mounted) return;
    setState(() {
      _messages.add(_Msg('assistant', reply));
      _sending = false;
    });
    _scrollToEnd();
    if (_speak && reply.trim().isNotEmpty) {
      _tts.setLanguage('pt-BR');
      _tts.stop();
      _tts.speak(reply);
    }
  }

  /// Envia uma foto de referência: fica salva na Carteira de Cortes, virando a
  /// referência que o barbeiro vê ao agendar.
  Future<void> _sendPhoto() async {
    if (_sending) return;
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1400, imageQuality: 88);
    if (file == null || !mounted) return;
    setState(() => _sending = true);
    _scrollToEnd();
    try {
      final url = await _clientRepo.uploadImage(file);
      await _clientRepo.addCut(imageUrl: url, note: 'Referência enviada no chat');
      if (!mounted) return;
      setState(() {
        _messages.add(_Msg('user', '', imageUrl: url));
        _messages.add(_Msg('assistant',
            'Guardei sua referência na Carteira de Cortes! Na hora de agendar, é só escolher essa foto que o barbeiro vê exatamente o corte que você quer. Quer marcar um horário?'));
        _sending = false;
      });
      _scrollToEnd();
    } catch (_) {
      if (mounted) {
        setState(() {
          _sending = false;
          _messages.add(_Msg('assistant', 'Não consegui enviar a foto agora. Tenta de novo?'));
        });
      }
    }
  }

  /// Provador de corte: o cliente manda uma selfie e a IA recomenda os cortes
  /// que combinam, escolhendo do cardápio real da barbearia.
  Future<void> _styleAdvisor() async {
    final id = _barbershopId;
    if (id == null || _sending) return;
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1200, imageQuality: 88);
    if (file == null || !mounted) return;
    setState(() => _sending = true);
    _scrollToEnd();
    try {
      final url = await _clientRepo.uploadImage(file);
      if (!mounted) return;
      setState(() => _messages.add(_Msg('user', '', imageUrl: url)));
      _scrollToEnd();
      final rec = await _clientRepo.styleAdvisor(imageUrl: url, barbershopId: id);
      if (!mounted) return;
      setState(() {
        _sending = false;
        _messages.add(_Msg('assistant', rec.trim().isEmpty ? 'Não consegui analisar agora. Tenta outra foto?' : rec));
      });
      _scrollToEnd();
      if (_speak && rec.trim().isNotEmpty) {
        _tts.setLanguage('pt-BR');
        _tts.stop();
        _tts.speak(rec);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _sending = false;
          _messages.add(_Msg('assistant', 'Não consegui analisar seu corte agora. Tenta de novo?'));
        });
      }
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
        actions: [
          IconButton(
            icon: Icon(_speak ? Icons.volume_up_rounded : Icons.volume_off_rounded, color: _speak ? accent : null),
            tooltip: _speak ? 'Voz ligada' : 'Ler respostas em voz alta',
            onPressed: () {
              setState(() => _speak = !_speak);
              if (!_speak) _tts.stop();
            },
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
                    child: RukzR(size: 34, color: accent),
                  ),
                  const SizedBox(height: 14),
                  Text('Seu assistente pessoal', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 6),
                  Text('Marque um horário, veja seus pontos de fidelidade, guarde a foto do corte que você quer ou peça o "provador de corte" pra IA sugerir o que combina com você. Ative a voz pra ouvir as respostas.', style: TextStyle(color: palette.textFaint, fontSize: 13, height: 1.4)),
                ],
                ..._messages.asMap().entries.map((e) => _Bubble(msg: e.value, palette: palette, accent: accent, animate: e.value.role == 'assistant' && e.key == _messages.length - 1)),
                if (_sending || _greetingLoading) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: accent)), const SizedBox(width: 8), Text(_greetingLoading && _messages.isEmpty ? 'preparando…' : 'pensando…', style: TextStyle(color: palette.textFaint, fontSize: 12))])),
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
                    // O provador de corte primeiro — é o que mais encanta.
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        label: Text('Meu corte ideal', style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w700)),
                        backgroundColor: accent.withValues(alpha: 0.14),
                        side: BorderSide(color: accent.withValues(alpha: 0.4)),
                        onPressed: _barbershopId == null ? null : _styleAdvisor,
                      ),
                    ),
                    for (final s in chatbotQuickReplies)
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
          Container(
            padding: EdgeInsets.fromLTRB(12, 10, 12, 12 + MediaQuery.of(context).padding.bottom),
            color: palette.bg,
            child: Row(
              children: [
                GestureDetector(
                  onTap: _sending ? null : _sendPhoto,
                  child: Container(
                    width: 46,
                    height: 46,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(color: palette.surface, shape: BoxShape.circle, border: Border.all(color: palette.border)),
                    child: Icon(Icons.add_photo_alternate_rounded, color: palette.textSecondary, size: 22),
                  ),
                ),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (msg.imageUrl != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(resolveAssetUrl(msg.imageUrl) ?? msg.imageUrl!, width: 190, height: 190, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox()),
              ),
              if (msg.text.isNotEmpty) const SizedBox(height: 6),
            ],
            if (msg.text.isNotEmpty)
              isUser
                  ? Text(msg.text, style: TextStyle(color: contrastingTextColor(accent), fontSize: 13.5, height: 1.4))
                  : TypewriterText(text: msg.text, animate: animate, style: TextStyle(color: palette.textPrimary, fontSize: 13.5, height: 1.4)),
          ],
        ),
      ),
    );
  }
}
