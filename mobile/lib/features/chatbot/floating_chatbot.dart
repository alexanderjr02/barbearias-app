import 'dart:async';
import 'dart:math';
import 'dart:ui';

import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'chatbot_responses.dart';

class _ChatMsg {
  final String text;
  final bool fromBot;
  _ChatMsg(this.text, this.fromBot);
}

/// Self-contained floating assistant bubble + overlay chat panel. Meant to
/// be dropped as the last child of a top-level Stack (above a Scaffold with
/// bottom navigation) so it floats over the whole client shell, not just
/// one tab.
class FloatingChatbot extends StatefulWidget {
  const FloatingChatbot({super.key});

  @override
  State<FloatingChatbot> createState() => _FloatingChatbotState();
}

class _FloatingChatbotState extends State<FloatingChatbot> with TickerProviderStateMixin {
  static const double _navClearance = 92;

  bool _open = false;
  bool _typing = false;
  final _messages = <_ChatMsg>[
    _ChatMsg('Oi! 👋 Sou o assistente da sua barbearia. Posso ajudar a marcar horário, ver seus pontos ou tirar dúvidas rápidas.', true),
  ];
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 280), curve: Curves.easeOut);
      }
    });
  }

  void _send(String raw) {
    final text = raw.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add(_ChatMsg(text, false));
      _inputController.clear();
      _typing = true;
    });
    _scrollToEnd();
    final delayMs = 500 + Random().nextInt(500);
    Future.delayed(Duration(milliseconds: delayMs), () {
      if (!mounted) return;
      setState(() {
        _typing = false;
        _messages.add(_ChatMsg(matchChatbotResponse(text) ?? chatbotDefaultResponse, true));
      });
      _scrollToEnd();
    });
  }

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return Stack(
      children: [
        if (_open)
          Positioned.fill(
            child: GestureDetector(
              onTap: () => setState(() => _open = false),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 3, sigmaY: 3),
                child: Container(color: Colors.black.withValues(alpha: 0.45)),
              ),
            ),
          ),
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
                child: ScaleTransition(
                  alignment: Alignment.bottomRight,
                  scale: Tween(begin: 0.86, end: 1.0).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutBack)),
                  child: child,
                ),
              ),
              child: _open ? _buildPanel(accent, key: const ValueKey('panel')) : const SizedBox.shrink(key: ValueKey('empty')),
            ),
          ),
        ),
        Positioned(
          left: 16,
          bottom: _navClearance + bottomInset,
          child: _buildBubble(accent),
        ),
      ],
    );
  }

  Widget _buildBubble(Color accent) {
    return GestureDetector(
      onTap: () => setState(() => _open = !_open),
      child: SizedBox(
        width: 60,
        height: 60,
        child: Stack(
          alignment: Alignment.center,
          children: [
            if (!_open)
              AnimatedBuilder(
                animation: _pulseController,
                builder: (context, _) {
                  final t = _pulseController.value;
                  return Container(
                    width: 60 * (1 + t * 0.5),
                    height: 60 * (1 + t * 0.5),
                    decoration: BoxDecoration(shape: BoxShape.circle, color: accent.withValues(alpha: (1 - t) * 0.25)),
                  );
                },
              ),
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
                child: Icon(
                  _open ? Icons.close_rounded : Icons.smart_toy_rounded,
                  key: ValueKey(_open),
                  color: contrastingTextColor(accent),
                  size: 26,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPanel(Color accent, {required Key key}) {
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
            child: Builder(builder: (context) {
              final onAccent = contrastingTextColor(accent);
              return Row(
                children: [
                  CircleAvatar(radius: 16, backgroundColor: onAccent.withValues(alpha: 0.16), child: Icon(Icons.smart_toy_rounded, color: onAccent, size: 18)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Assistente Cortix', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold, fontSize: 14)),
                        Text('Online agora', style: TextStyle(color: onAccent.withValues(alpha: 0.7), fontSize: 11)),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => setState(() => _open = false),
                    icon: Icon(Icons.close, color: onAccent.withValues(alpha: 0.7), size: 20),
                  ),
                ],
              );
            }),
          ),
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(14),
              itemCount: _messages.length + (_typing ? 1 : 0),
              itemBuilder: (context, index) {
                if (index >= _messages.length) return _typingBubble();
                final m = _messages[index];
                return Align(
                  alignment: m.fromBot ? Alignment.centerLeft : Alignment.centerRight,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
                    constraints: const BoxConstraints(maxWidth: 240),
                    decoration: BoxDecoration(
                      color: m.fromBot ? const Color(0xFF232329) : accent,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(14),
                        topRight: const Radius.circular(14),
                        bottomLeft: Radius.circular(m.fromBot ? 4 : 14),
                        bottomRight: Radius.circular(m.fromBot ? 14 : 4),
                      ),
                    ),
                    child: Text(m.text, style: TextStyle(color: m.fromBot ? Colors.white : contrastingTextColor(accent), fontSize: 13, height: 1.35)),
                  ),
                );
              },
            ),
          ),
          if (!_typing)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: SizedBox(
                height: 30,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: chatbotQuickReplies.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 6),
                  itemBuilder: (context, i) => GestureDetector(
                    onTap: () => _send(chatbotQuickReplies[i]),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white12)),
                      alignment: Alignment.center,
                      child: Text(chatbotQuickReplies[i], style: const TextStyle(color: Colors.white70, fontSize: 11.5)),
                    ),
                  ),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    style: const TextStyle(color: Colors.white, fontSize: 13.5),
                    onSubmitted: _send,
                    decoration: InputDecoration(
                      hintText: 'Digite sua pergunta...',
                      hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.06),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _send(_inputController.text),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
                    child: Icon(Icons.send_rounded, color: contrastingTextColor(accent), size: 18),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _typingBubble() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(color: const Color(0xFF232329), borderRadius: BorderRadius.circular(14)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) => _Dot(delay: i * 150)),
        ),
      ),
    );
  }
}

class _Dot extends StatefulWidget {
  final int delay;
  const _Dot({required this.delay});

  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat();
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _controller.forward(from: 0);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = (sin(_controller.value * 2 * pi) + 1) / 2;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Opacity(
            opacity: 0.4 + t * 0.6,
            child: Container(width: 6, height: 6, decoration: const BoxDecoration(color: Colors.white70, shape: BoxShape.circle)),
          ),
        );
      },
    );
  }
}
