import 'package:flutter/material.dart';

/// Três pontinhos pulsando em sequência: o "está digitando" dos apps de chat.
///
/// Substitui o spinner circular + "pensando…", que parecia carregamento de
/// página e não conversa. Cada ponto sobe e clareia com um atraso, dando a
/// onda característica.
class TypingDots extends StatefulWidget {
  const TypingDots({super.key, this.color, this.size = 7});

  final Color? color;
  final double size;

  @override
  State<TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<TypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cor = widget.color ?? Theme.of(context).colorScheme.primary;
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            // Cada ponto atrasado 1/6 do ciclo, criando a onda.
            final t = (_c.value + i * 0.16) % 1.0;
            // Sobe e volta suave (seno), some e volta junto.
            final wave = (t < 0.5) ? t * 2 : (1 - t) * 2;
            final opacity = 0.35 + wave * 0.65;
            return Padding(
              padding: EdgeInsets.only(right: i == 2 ? 0 : widget.size * 0.6),
              child: Transform.translate(
                offset: Offset(0, -wave * widget.size * 0.5),
                child: Container(
                  width: widget.size,
                  height: widget.size,
                  decoration: BoxDecoration(color: cor.withValues(alpha: opacity), shape: BoxShape.circle),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
