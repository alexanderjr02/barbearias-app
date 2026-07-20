import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CortixNavItem {
  final IconData icon;
  final String label;
  const CortixNavItem(this.icon, this.label);
}

/// Modern floating "expanding pill" bottom nav shared by all three roles
/// (cliente / barbeiro / gestor). Inactive items show just the icon; the
/// active item expands into an accent pill with its label. Sits above content
/// (use a normal Scaffold, not extendBody) so nothing is ever hidden behind it.
class CortixBottomNav extends StatelessWidget {
  final int index;
  final List<CortixNavItem> items;
  final ValueChanged<int> onTap;
  const CortixBottomNav({super.key, required this.index, required this.items, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
      child: Container(
        decoration: BoxDecoration(
          color: palette.surface.withValues(alpha: 0.97),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: palette.border),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.28), blurRadius: 24, offset: const Offset(0, 8))],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Flexible em cada item: com 6 abas, o pílula do item ativo
                // mais 5 ícones estoura a largura num aparelho estreito
                // (iPhone SE e afins). Assim eles dividem o espaço e o
                // rótulo trunca em vez de rasgar o layout.
                for (var i = 0; i < items.length; i++) Flexible(child: _item(i, accent, palette)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _item(int i, Color accent, AppPalette palette) {
    final active = index == i;
    final item = items[i];
    return GestureDetector(
      onTap: () => onTap(i),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(horizontal: active ? 13 : 10, vertical: 10),
        decoration: BoxDecoration(
          color: active ? accent.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(item.icon, color: active ? accent : palette.textFaint, size: 22),
            AnimatedSize(
              duration: const Duration(milliseconds: 240),
              curve: Curves.easeOutCubic,
              child: active
                  ? Padding(
                      padding: const EdgeInsets.only(left: 6),
                      child: Text(
                        item.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        softWrap: false,
                        style: TextStyle(color: accent, fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}
