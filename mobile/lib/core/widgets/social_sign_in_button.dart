import 'package:flutter/material.dart';
import '../theme/cortix_theme.dart';

/// A branded "Continuar com X" pill button (Google/Apple/etc), shared by the
/// login and client-registration screens.
class SocialSignInButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color background;
  final Color foreground;
  final Color? border;
  final VoidCallback onTap;

  const SocialSignInButton({
    super.key,
    required this.label,
    required this.icon,
    required this.background,
    required this.foreground,
    required this.onTap,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    return PulseButton(
      onPressed: onTap,
      color: background,
      borderColor: border,
      height: 48,
      borderRadius: BorderRadius.circular(14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: foreground, size: 22),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(color: foreground, fontWeight: FontWeight.w600, fontSize: 14)),
        ],
      ),
    );
  }
}
