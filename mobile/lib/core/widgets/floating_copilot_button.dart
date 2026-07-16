import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// The Copiloto launcher — a floating round button pinned to the bottom-left,
/// exactly where the client's chatbot bubble and the old support button sit,
/// so it reads as "the assistant" across every role. Returns a full Stack (not
/// a bare Positioned) so it can be dropped straight into a shell's Stack via a
/// transparent Material wrapper. Each shell passes [onTap] to open its copilot.
class FloatingCopilotButton extends StatefulWidget {
  final VoidCallback onTap;
  const FloatingCopilotButton({super.key, required this.onTap});

  @override
  State<FloatingCopilotButton> createState() => _FloatingCopilotButtonState();
}

class _FloatingCopilotButtonState extends State<FloatingCopilotButton> with SingleTickerProviderStateMixin {
  static const double _navClearance = 92;
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

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
            onTap: widget.onTap,
            child: AnimatedBuilder(
              animation: _pulse,
              builder: (context, child) => Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color.lerp(accent, Colors.white, 0.18)!, accent]),
                  boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.35 + _pulse.value * 0.30), blurRadius: 18, offset: const Offset(0, 8))],
                ),
                child: Icon(Icons.auto_awesome_rounded, color: onAccent, size: 26),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
