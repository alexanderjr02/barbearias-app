import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Pulsing placeholder block, shaped by the caller via width/height/radius —
/// replaces bare CircularProgressIndicator loading states with something
/// shaped like the real content, same idea as Skeleton.tsx on web.
class SkeletonBox extends StatefulWidget {
  final double? width;
  final double height;
  final double borderRadius;

  const SkeletonBox({super.key, this.width, required this.height, this.borderRadius = 10});

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => Opacity(
        opacity: 0.5 + _controller.value * 0.3,
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(widget.borderRadius)),
        ),
      ),
    );
  }
}
