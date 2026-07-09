import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/notification_models.dart';

const _notifIcon = {
  'APPOINTMENT_CONFIRMED': Icons.check_circle_outline_rounded,
  'APPOINTMENT_CANCELLED_BY_SHOP': Icons.event_busy_rounded,
  'APPOINTMENT_COMPLETED': Icons.content_cut_rounded,
};

/// The client's own notifications (their appointment was confirmed/cancelled/
/// completed by the shop) — a single list, no Avisos tab, since platform
/// announcements are a gestor/staff-only channel.
class ClientNotificationsSheet extends StatefulWidget {
  final Future<GestorNotificationsResult> Function() onFetch;
  final Future<void> Function() onMarkAllRead;
  final VoidCallback onChanged;

  const ClientNotificationsSheet({super.key, required this.onFetch, required this.onMarkAllRead, required this.onChanged});

  static Future<void> show(
    BuildContext context, {
    required Future<GestorNotificationsResult> Function() onFetch,
    required Future<void> Function() onMarkAllRead,
    required VoidCallback onChanged,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ClientNotificationsSheet(onFetch: onFetch, onMarkAllRead: onMarkAllRead, onChanged: onChanged),
    );
  }

  @override
  State<ClientNotificationsSheet> createState() => _ClientNotificationsSheetState();
}

class _ClientNotificationsSheetState extends State<ClientNotificationsSheet> {
  GestorNotificationsResult? _result;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await widget.onFetch();
      if (mounted) setState(() => _result = result);
      if (result.unreadCount > 0) {
        await widget.onMarkAllRead();
        widget.onChanged();
      }
    } catch (_) {
      // Non-critical.
    }
  }

  String _relative(DateTime d) {
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 60) return 'há ${diff.inMinutes}min';
    if (diff.inHours < 24) return 'há ${diff.inHours}h';
    return 'há ${diff.inDays}d';
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(color: palette.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 6),
              child: Row(
                children: [
                  Icon(Icons.notifications_outlined, color: accent, size: 18),
                  const SizedBox(width: 8),
                  Text('Notificações', style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            Expanded(
              child: _result == null
                  ? const Center(child: CircularProgressIndicator())
                  : _result!.notifications.isEmpty
                      ? Center(child: Text('Nenhuma notificação ainda', style: TextStyle(color: palette.textFaint)))
                      : ListView.separated(
                          controller: scrollController,
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                          itemCount: _result!.notifications.length,
                          separatorBuilder: (_, _) => Divider(color: palette.border, height: 20),
                          itemBuilder: (context, i) {
                            final n = _result!.notifications[i];
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(_notifIcon[n.type] ?? Icons.notifications_outlined, size: 16, color: accent),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(n.title, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 13.5)),
                                      const SizedBox(height: 3),
                                      Text(n.body, style: TextStyle(color: palette.textSecondary, fontSize: 12.5)),
                                      const SizedBox(height: 4),
                                      Text(_relative(n.createdAt), style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
                                    ],
                                  ),
                                ),
                                if (!n.read) Container(width: 6, height: 6, margin: const EdgeInsets.only(top: 4), decoration: BoxDecoration(color: accent, shape: BoxShape.circle)),
                              ],
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
