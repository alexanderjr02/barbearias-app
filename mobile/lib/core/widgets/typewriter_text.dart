import 'dart:async';
import 'package:flutter/material.dart';

/// Reveals text character-by-character (the "assistant is typing" feel of
/// modern AI apps) without needing server-side streaming. Animates once when
/// first built; if [animate] is false it just shows the full text instantly
/// (used for older messages that were already revealed).
class TypewriterText extends StatefulWidget {
  final String text;
  final TextStyle style;
  final bool animate;
  final VoidCallback? onTick;

  const TypewriterText({super.key, required this.text, required this.style, this.animate = true, this.onTick});

  @override
  State<TypewriterText> createState() => _TypewriterTextState();
}

class _TypewriterTextState extends State<TypewriterText> {
  Timer? _timer;
  int _shown = 0;

  @override
  void initState() {
    super.initState();
    if (widget.animate) {
      _start();
    } else {
      _shown = widget.text.length;
    }
  }

  void _start() {
    _shown = 0;
    // Pace by length so long answers don't crawl — total ~1.2s max.
    final total = widget.text.length;
    final stepMs = total == 0 ? 20 : (1200 / total).clamp(8, 32).round();
    _timer?.cancel();
    _timer = Timer.periodic(Duration(milliseconds: stepMs), (t) {
      if (!mounted) return t.cancel();
      setState(() => _shown = (_shown + 1).clamp(0, total));
      widget.onTick?.call();
      if (_shown >= total) t.cancel();
    });
  }

  @override
  void didUpdateWidget(TypewriterText old) {
    super.didUpdateWidget(old);
    if (old.text != widget.text && widget.animate) _start();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(widget.text.substring(0, _shown), style: widget.style);
  }
}
