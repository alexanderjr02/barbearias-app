import 'package:flutter/material.dart';

/// Shared visual language for the Cortix app: dark, glassy, with a soft
/// glow around the brand accent. Every screen pulls from here instead of
/// hand-rolling colors, so the "futuristic" look stays consistent.
class CortixColors {
  static const void_ = Color(0xFF060608);
  static const surface = Color(0xFF121216);
  static const surfaceAlt = Color(0xFF18181F);
  static const border = Color(0x1AFFFFFF);
}

/// Background gradient used behind auth/onboarding surfaces — a slow drift
/// of deep violet/blue behind the brand accent, evoking a "premium tech"
/// feel rather than a flat single color.
List<Color> cortixBackdropColors(Color accent) => [
      const Color(0xFF0B0713),
      Color.lerp(const Color(0xFF0B0713), accent, 0.12)!,
      const Color(0xFF06060A),
    ];

/// A frosted glass panel: translucent fill, hairline border, soft shadow.
/// Used everywhere a card needs to feel elevated and "alive" rather than
/// a flat filled rectangle.
class GlassPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final BorderRadius borderRadius;
  final Color? tint;
  final double borderOpacity;

  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = const BorderRadius.all(Radius.circular(20)),
    this.tint,
    this.borderOpacity = 0.14,
  });

  @override
  Widget build(BuildContext context) {
    final accent = tint ?? Theme.of(context).colorScheme.primary;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // "Glass" reads as a light gradient over a dark backdrop; on a light
    // backdrop the same trick needs a dark-tinted gradient instead, or the
    // panel disappears into the page.
    final overlay = isDark ? Colors.white : Colors.black;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            overlay.withValues(alpha: isDark ? 0.06 : 0.035),
            accent.withValues(alpha: 0.05),
          ],
        ),
        border: Border.all(color: overlay.withValues(alpha: borderOpacity)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08), blurRadius: 24, offset: const Offset(0, 12)),
        ],
      ),
      child: child,
    );
  }
}

/// A pill button with a subtle scale-down press animation — used for the
/// primary CTAs across auth/booking flows so taps feel tactile.
class PulseButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final Gradient? gradient;
  final Color? color;
  final Color? borderColor;
  final double height;
  final BorderRadius? borderRadius;

  const PulseButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.gradient,
    this.color,
    this.borderColor,
    this.height = 52,
    this.borderRadius,
  });

  @override
  State<PulseButton> createState() => _PulseButtonState();
}

class _PulseButtonState extends State<PulseButton> {
  double _scale = 1;

  void _setScale(double v) {
    if (widget.onPressed == null) return;
    setState(() => _scale = v);
  }

  @override
  Widget build(BuildContext context) {
    final radius = widget.borderRadius ?? BorderRadius.circular(16);
    return GestureDetector(
      onTapDown: (_) => _setScale(0.97),
      onTapUp: (_) => _setScale(1),
      onTapCancel: () => _setScale(1),
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _scale,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: AnimatedOpacity(
          opacity: widget.onPressed == null ? 0.5 : 1,
          duration: const Duration(milliseconds: 150),
          child: Container(
            height: widget.height,
            decoration: BoxDecoration(
              borderRadius: radius,
              gradient: widget.gradient,
              color: widget.gradient == null ? (widget.color ?? Theme.of(context).colorScheme.primary) : null,
              border: widget.borderColor != null ? Border.all(color: widget.borderColor!) : null,
              boxShadow: [
                BoxShadow(
                  color: (widget.color ?? Theme.of(context).colorScheme.primary).withValues(alpha: 0.28),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            alignment: Alignment.center,
            child: widget.child,
          ),
        ),
      ),
    );
  }
}

/// Fades + gently scales content in on first build — a cheap way to give
/// list items and cards a sense of arrival instead of popping in instantly.
class RiseIn extends StatefulWidget {
  final Widget child;
  final Duration delay;

  const RiseIn({super.key, required this.child, this.delay = Duration.zero});

  @override
  State<RiseIn> createState() => _RiseInState();
}

class _RiseInState extends State<RiseIn> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 420));
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _slide = Tween(begin: const Offset(0, 0.06), end: Offset.zero).animate(_fade);
    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(position: _slide, child: widget.child),
    );
  }
}
