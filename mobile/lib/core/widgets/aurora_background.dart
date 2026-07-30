import 'package:flutter/material.dart';
import '../brand/rukz_symbol.dart';

/// Fundo das telas de entrada: preto seco com a marca d'água do bigode, bem
/// apagada — a mesma linguagem da tela de login.
///
/// Antes eram blobs de glow animados (a "aurora"), incluindo um roxo fora da
/// paleta. Saíram junto com os outros gradientes decorativos: a marca rukz é
/// contraste seco, sem lavagem de cor.
///
/// O construtor segue igual (accent, child) pra não obrigar quem usa a mudar.
/// O `accent` hoje não pinta o fundo, mas continua na assinatura caso volte a
/// servir num detalhe.
class AuroraBackground extends StatelessWidget {
  final Color accent;
  final Widget child;

  const AuroraBackground({super.key, required this.accent, required this.child});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFF0B0A0F),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: Center(
              child: RukzSymbol(
                size: 340,
                tight: true,
                bigode: Colors.white.withValues(alpha: 0.05),
                r: accent.withValues(alpha: 0.09),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
