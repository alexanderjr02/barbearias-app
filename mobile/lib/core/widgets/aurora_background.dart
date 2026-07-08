import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Slow-drifting glow blobs behind a dark base — cheap to render (no
/// shaders, just blurred circles animating position) but reads as a
/// "living", futuristic surface instead of a flat gradient.
class AuroraBackground extends StatefulWidget {
  final Color accent;
  final Widget child;

  const AuroraBackground({super.key, required this.accent, required this.child});

  @override
  State<AuroraBackground> createState() => _AuroraBackgroundState();
}

class _AuroraBackgroundState extends State<AuroraBackground> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 18))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF07060B),
      child: Stack(
        fit: StackFit.expand,
        children: [
          AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              final t = _controller.value * 2 * math.pi;
              return Stack(
                children: [
                  _blob(top: 60 + 40 * math.sin(t), left: -60 + 40 * math.cos(t), color: widget.accent, size: 260),
                  _blob(top: 320 + 30 * math.cos(t * 0.8), right: -80 + 30 * math.sin(t * 0.8), color: const Color(0xFF6D28D9), size: 220),
                  _blob(bottom: 40 + 30 * math.sin(t * 1.2), left: 40 + 30 * math.cos(t * 1.3), color: widget.accent, size: 180),
                ],
              );
            },
          ),
          Container(color: Colors.black.withValues(alpha: 0.25)),
          widget.child,
        ],
      ),
    );
  }

  Widget _blob({double? top, double? left, double? right, double? bottom, required Color color, required double size}) {
    return Positioned(
      top: top,
      left: left,
      right: right,
      bottom: bottom,
      child: IgnorePointer(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(colors: [color.withValues(alpha: 0.35), color.withValues(alpha: 0.0)]),
          ),
        ),
      ),
    );
  }
}
