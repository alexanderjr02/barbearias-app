import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CortixNavItem {
  final IconData icon;
  final String label;
  const CortixNavItem(this.icon, this.label);
}

/// Medidas da barra, exportadas porque outras coisas flutuam por cima dela.
///
/// O balão do chat usava um valor fixo chutado (92) e o botão "Agendar" era
/// posicionado pelo Scaffold — dois sistemas independentes para a mesma
/// pergunta ("onde a barra termina?"). Bastou a barra mudar de altura para
/// um encostar no outro e ficarem desalinhados entre si.
const double kNavContentHeight = 56; // ícone + respiro interno
const double kNavBottomMargin = 18; // distância da borda de baixo da tela

/// Onde qualquer elemento flutuante deve começar, medido da base da tela
/// (sem contar a área segura, que quem usa soma por cima).
const double kNavClearance = kNavContentHeight + kNavBottomMargin + 12;

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
      // Mais afastado da borda de baixo: no iPhone a barra ficava colada na
      // faixa de gestos do sistema, e o toque no item competia com o swipe
      // de "voltar à tela inicial".
      padding: const EdgeInsets.fromLTRB(14, 0, 14, kNavBottomMargin),
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
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
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
    // Com 6 abas o espaço por item cai bastante; apertar ícone e respiro é o
    // que mantém o rótulo ativo legível em vez de virar "Prefe…".
    final many = items.length >= 6;
    final iconSize = many ? 20.0 : 22.0;
    final pad = many ? 10.0 : 13.0;
    return GestureDetector(
      onTap: () => onTap(i),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(horizontal: active ? pad : pad - 3, vertical: 11),
        decoration: BoxDecoration(
          color: active ? accent.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(item.icon, color: active ? accent : palette.textFaint, size: iconSize),
            // Flexible (e não AnimatedSize solto): o AnimatedSize mede o filho
            // com largura infinita, então o ellipsis do Text nunca dispara e a
            // linha estoura. Dentro de um Flexible o Text recebe largura máxima
            // real e trunca como deveria.
            if (active)
              Flexible(
                child: Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    softWrap: false,
                    style: TextStyle(color: accent, fontWeight: FontWeight.w800, fontSize: 12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
