import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'gestor_repository.dart';

/// The Copiloto — a business assistant for the gestor. Top: a proactive
/// briefing (sumidos, horários vazios, confirmar amanhã, estoque) with one-tap
/// actions. Bottom: a chat to ask about the business in plain Portuguese.
/// Works today in "simulated" mode; the same screen lights up with real AI the
/// moment an Anthropic key is configured on the server.
class GestorCopilotScreen extends StatefulWidget {
  const GestorCopilotScreen({super.key});

  @override
  State<GestorCopilotScreen> createState() => _GestorCopilotScreenState();
}

class _Msg {
  final String role; // 'user' | 'assistant'
  final String text;
  _Msg(this.role, this.text);
}

class _GestorCopilotScreenState extends State<GestorCopilotScreen> {
  final _repository = GestorRepository();
  final _input = TextEditingController();
  final _scroll = ScrollController();

  List<BriefingCard> _cards = [];
  bool _locked = false;
  bool _loadingBriefing = true;
  final Set<String> _busyActions = {};
  final List<_Msg> _messages = [];
  List<String> _suggestions = const [];
  bool _sending = false;
  String? _note;

  @override
  void initState() {
    super.initState();
    _loadBriefing();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadBriefing() async {
    setState(() => _loadingBriefing = true);
    try {
      final res = await _repository.copilotBriefing();
      if (mounted) setState(() {
        _cards = res.cards;
        _locked = res.locked;
      });
    } catch (_) {
      // Non-critical.
    } finally {
      if (mounted) setState(() => _loadingBriefing = false);
    }
  }

  Future<void> _runAction(BriefingCard card) async {
    if (card.actionId == null) return;
    setState(() => _busyActions.add(card.id));
    try {
      final msg = await _repository.copilotAction(card.actionId!);
      if (mounted) {
        AppToast.success(context, msg);
        _loadBriefing();
      }
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível executar');
    } finally {
      if (mounted) setState(() => _busyActions.remove(card.id));
    }
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
          _suggestions = res.suggestions;
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

  IconData _iconFor(String key) {
    switch (key) {
      case 'trending':
        return Icons.trending_up_rounded;
      case 'ghost':
        return Icons.person_off_rounded;
      case 'calendar':
        return Icons.event_available_rounded;
      case 'check':
        return Icons.check_circle_rounded;
      case 'box':
        return Icons.inventory_2_rounded;
      default:
        return Icons.insights_rounded;
    }
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
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              children: [
                // ---- Briefing ----
                Row(
                  children: [
                    Icon(Icons.wb_sunny_rounded, size: 16, color: accent),
                    const SizedBox(width: 6),
                    Text('Seu resumo de hoje', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
                  ],
                ),
                const SizedBox(height: 12),
                if (_loadingBriefing)
                  const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator()))
                else if (_locked)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: accent.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: accent.withValues(alpha: 0.3))),
                    child: Row(
                      children: [
                        Icon(Icons.lock_rounded, color: accent, size: 20),
                        const SizedBox(width: 12),
                        Expanded(child: Text('O Copiloto faz parte do plano Pro. Faça upgrade pra desbloquear o resumo e o assistente com IA.', style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.4))),
                      ],
                    ),
                  )
                else if (_cards.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                    child: Text('Tudo em dia por aqui. 👌', style: TextStyle(color: palette.textFaint)),
                  )
                else
                  ..._cards.map((c) => _BriefingCardTile(
                        card: c,
                        icon: _iconFor(c.icon),
                        palette: palette,
                        accent: accent,
                        busy: _busyActions.contains(c.id),
                        onAction: () => _runAction(c),
                      )),
                const SizedBox(height: 20),
                Divider(color: palette.border, height: 1),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Icon(Icons.forum_rounded, size: 16, color: accent),
                    const SizedBox(width: 6),
                    Text('Converse com sua barbearia', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
                  ],
                ),
                const SizedBox(height: 12),
                if (_messages.isEmpty)
                  Text('Pergunte em português — eu leio os dados reais da sua barbearia.', style: TextStyle(color: palette.textFaint, fontSize: 12.5, height: 1.4)),
                ..._messages.map((m) => _Bubble(msg: m, palette: palette, accent: accent)),
                if (_sending) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: accent)), const SizedBox(width: 8), Text('pensando…', style: TextStyle(color: palette.textFaint, fontSize: 12))])),
              ],
            ),
          ),
          // ---- Suggestions ----
          if (!_sending)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final s in (_suggestions.isEmpty ? _defaultSuggestions : _suggestions))
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
          // ---- Input ----
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

  static const _defaultSuggestions = ['Quanto faturei essa semana?', 'Quais clientes sumiram?', 'Tenho horário vazio hoje?'];
}

class _BriefingCardTile extends StatelessWidget {
  final BriefingCard card;
  final IconData icon;
  final AppPalette palette;
  final Color accent;
  final bool busy;
  final VoidCallback onAction;

  const _BriefingCardTile({required this.card, required this.icon, required this.palette, required this.accent, required this.busy, required this.onAction});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: palette.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: accent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(card.title, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 3),
                    Text(card.body, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, height: 1.35)),
                  ],
                ),
              ),
            ],
          ),
          if (card.actionId != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: busy ? null : onAction,
                style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.symmetric(vertical: 11), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: busy
                    ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                    : Text(card.actionLabel!, style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold, fontSize: 13.5)),
              ),
            ),
          ],
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
