import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../gestor_repository.dart';

/// Mirrors the web Topbar's bell dropdown: lists announcements the platform
/// admin published for this barbershop's plan, lets the gestor dismiss them
/// one by one (persisted via /announcements/:id/dismiss, same as web).
class AnnouncementsSheet extends StatefulWidget {
  final List<GestorAnnouncement> initial;
  final GestorRepository repository;
  final VoidCallback onChanged;

  const AnnouncementsSheet({super.key, required this.initial, required this.repository, required this.onChanged});

  static Future<void> show(
    BuildContext context, {
    required List<GestorAnnouncement> initial,
    required GestorRepository repository,
    required VoidCallback onChanged,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AnnouncementsSheet(initial: initial, repository: repository, onChanged: onChanged),
    );
  }

  @override
  State<AnnouncementsSheet> createState() => _AnnouncementsSheetState();
}

class _AnnouncementsSheetState extends State<AnnouncementsSheet> {
  late List<GestorAnnouncement> _items;
  final Set<String> _dismissing = {};

  @override
  void initState() {
    super.initState();
    _items = List.of(widget.initial);
  }

  Future<void> _dismiss(GestorAnnouncement a) async {
    setState(() => _dismissing.add(a.id));
    try {
      await widget.repository.dismissAnnouncement(a.id);
      if (mounted) {
        setState(() {
          _items.removeWhere((e) => e.id == a.id);
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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(children: [
                    Icon(Icons.campaign_outlined, color: accent, size: 18),
                    const SizedBox(width: 8),
                    Text('Avisos', style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
                  ]),
                  IconButton(onPressed: () => Navigator.of(context).pop(), icon: Icon(Icons.close, color: palette.textFaint)),
                ],
              ),
            ),
            Expanded(
              child: _items.isEmpty
                  ? Center(child: Text('Nenhum aviso novo', style: TextStyle(color: palette.textFaint)))
                  : ListView.separated(
                      controller: scrollController,
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                      itemCount: _items.length,
                      separatorBuilder: (_, _) => Divider(color: palette.border, height: 20),
                      itemBuilder: (context, i) {
                        final a = _items[i];
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
                                    onPressed: () => _dismiss(a),
                                    icon: Icon(Icons.close, size: 16, color: palette.textFaint),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
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
