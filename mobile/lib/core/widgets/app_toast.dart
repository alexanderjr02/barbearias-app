import 'package:flutter/material.dart';

const _emerald = Color(0xFF34D399);

/// Consistent feedback for every create/edit/delete action across the
/// gestor app — replaces the 20+ ad-hoc `ScaffoldMessenger.showSnackBar`
/// calls that used to be copy-pasted per screen with inconsistent styling.
class AppToast {
  static void success(BuildContext context, String message) => _show(context, message, isError: false);

  static void error(BuildContext context, String message) => _show(context, message, isError: true);

  static void _show(BuildContext context, String message, {required bool isError}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF1C1C22),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: (isError ? Colors.redAccent : _emerald).withValues(alpha: 0.4)),
        ),
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        duration: const Duration(seconds: 3),
        content: Row(
          children: [
            Icon(isError ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded, color: isError ? Colors.redAccent : _emerald, size: 18),
            const SizedBox(width: 10),
            Expanded(child: Text(message, style: const TextStyle(color: Colors.white, fontSize: 13.5))),
          ],
        ),
      ),
    );
  }
}
