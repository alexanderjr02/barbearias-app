import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/notification_models.dart';

const _notifIcon = {
  'NEW_APPOINTMENT': Icons.event_available_rounded,
  'APPOINTMENT_CANCELLED': Icons.event_busy_rounded,
  'SUPPORT_REPLY': Icons.support_agent_rounded,
  'APPOINTMENT_CONFIRMED': Icons.check_circle_outline_rounded,
  'APPOINTMENT_CANCELLED_BY_SHOP': Icons.event_busy_rounded,
  'APPOINTMENT_COMPLETED': Icons.content_cut_rounded,
};

/// Combined bell dropdown — mirrors the web Topbar's two-tab bell (Avisos /
/// Notificações). Shared by every role that has both: gestor and barbeiro.
/// Takes plain callbacks instead of a concrete repository type so it isn't
/// tied to GestorRepository specifically.
class BellSheet extends StatefulWidget {
  final List<GestorAnnouncement> announcements;
  final Future<void> Function(String id) onDismissAnnouncement;
  final Future<GestorNotificationsResult> Function() onFetchNotifications;
  final Future<void> Function() onMarkAllRead;
  final VoidCallback onChanged;

  const BellSheet({
    super.key,
    required this.announcements,
    required this.onDismissAnnouncement,
    required this.onFetchNotifications,
    required this.onMarkAllRead,
    required this.onChanged,
  });

  static Future<void> show(
    BuildContext context, {
    required List<GestorAnnouncement> announcements,
    required Future<void> Function(String id) onDismissAnnouncement,
    required Future<GestorNotificationsResult> Function() onFetchNotifications,
    required Future<void> Function() onMarkAllRead,
    required VoidCallback onChanged,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BellSheet(
        announcements: announcements,
        onDismissAnnouncement: onDismissAnnouncement,
        onFetchNotifications: onFetchNotifications,
        onMarkAllRead: onMarkAllRead,
        onChanged: onChanged,
      ),
    );
  }

  @override
  State<BellSheet> createState() => _BellSheetState();
}

class _BellSheetState extends State<BellSheet> {
  late List<GestorAnnouncement> _announcements;
  final Set<String> _dismissing = {};
  int _tab = 0;
  GestorNotificationsResult? _notifResult;

  @override
  void initState() {
    super.initState();
    _announcements = List.of(widget.announcements);
  }

  Future<void> _loadNotifications() async {
    try {
      final result = await widget.onFetchNotifications();
      if (mounted) setState(() => _notifResult = result);
    } catch (_) {
      // Non-critical.
    }
  }

  Future<void> _openNotificationsTab() async {
    setState(() => _tab = 1);
    await _loadNotifications();
    if (_notifResult != null && _notifResult!.unreadCount > 0) {
      await widget.onMarkAllRead();
      widget.onChanged();
    }
  }

  Future<void> _dismissAnnouncement(GestorAnnouncement a) async {
    setState(() => _dismissing.add(a.id));
    try {
      await widget.onDismissAnnouncement(a.id);
      if (mounted) {
        setState(() {
          _announcements.removeWhere((e) => e.id == a.id);
          _dismissing.remove(a.id);
        });
        widget.onChanged();
      }
    } catch (_) {
      if (mounted) setState(() => _dismissing.remove(a.id));
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
    final unread = _notifResult?.unreadCount ?? 0;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.35,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(color: palette.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(
                children: [
                  Expanded(
                    child: _TabButton(
                      label: 'Avisos${_announcements.isNotEmpty ? ' (${_announcements.length})' : ''}',
                      icon: Icons.campaign_outlined,
                      selected: _tab == 0,
                      onTap: () => setState(() => _tab = 0),
                    ),
                  ),
                  Expanded(
                    child: _TabButton(
                      label: 'Notificações${unread > 0 ? ' ($unread)' : ''}',
                      icon: Icons.inbox_outlined,
                      selected: _tab == 1,
                      onTap: _openNotificationsTab,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Expanded(
              child: _tab == 0
                  ? (_announcements.isEmpty
                      ? Center(child: Text('Nenhum aviso novo', style: TextStyle(color: palette.textFaint)))
                      : ListView.separated(
                          controller: scrollController,
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                          itemCount: _announcements.length,
                          separatorBuilder: (_, _) => Divider(color: palette.border, height: 20),
                          itemBuilder: (context, i) {
                            final a = _announcements[i];
                            final busy = _dismissing.contains(a.id);
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(a.title, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 13.5)),
                                      const SizedBox(height: 3),
                                      Text(a.body, style: TextStyle(color: palette.textSecondary, fontSize: 12.5)),
                                      const SizedBox(height: 4),
                                      Text(_relative(a.createdAt), style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
                                    ],
                                  ),
                                ),
                                busy
                                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                    : IconButton(
                                        onPressed: () => _dismissAnnouncement(a),
                                        icon: Icon(Icons.close, size: 16, color: palette.textFaint),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                      ),
                              ],
                            );
                          },
                        ))
                  : (_notifResult == null
                      ? const Center(child: CircularProgressIndicator())
                      : _notifResult!.notifications.isEmpty
                          ? Center(child: Text('Nenhuma notificação ainda', style: TextStyle(color: palette.textFaint)))
                          : ListView.separated(
                              controller: scrollController,
                              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                              itemCount: _notifResult!.notifications.length,
                              separatorBuilder: (_, _) => Divider(color: palette.border, height: 20),
                              itemBuilder: (context, i) {
                                final n = _notifResult!.notifications[i];
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
                            )),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _TabButton({required this.label, required this.icon, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: selected ? accent : Colors.transparent, width: 2))),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 14, color: selected ? accent : palette.textFaint),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: selected ? accent : palette.textFaint, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
