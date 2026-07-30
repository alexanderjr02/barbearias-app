import 'package:flutter/material.dart';
import '../brand/rukz_symbol.dart';
import '../theme/app_theme.dart';

/// The Copiloto launcher — a floating round button pinned to the bottom-left,
/// exactly where the client's chatbot bubble and the old support button sit,
/// so it reads as "the assistant" across every role. Traz o "r" da marca no
/// meio (não um ícone genérico). Returns a full Stack (not a bare Positioned)
/// so it can be dropped straight into a shell's Stack via a transparent
/// Material wrapper. Each shell passes [onTap] to open its copilot.
class FloatingCopilotButton extends StatelessWidget {
  final VoidCallback onTap;
  const FloatingCopilotButton({super.key, required this.onTap});

  static const double _navClearance = 92;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return Stack(
      children: [
        Positioned(
          left: 16,
          bottom: _navClearance + bottomInset,
          child: GestureDetector(
            onTap: onTap,
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: accent,
                // Sombra escura discreta só pra dar relevo — sem o glow amarelo
                // de antes (que virava um borrão de cor atrás do botão).
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.28), blurRadius: 12, offset: const Offset(0, 4))],
              ),
              child: Center(child: RukzR(size: 30, color: onAccent)),
            ),
          ),
        ),
      ],
    );
  }
}
