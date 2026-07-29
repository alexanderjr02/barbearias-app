import 'package:flutter/material.dart';

/// A marca rukz desenhada — o bigode + o "r" — a partir dos traçados oficiais
/// do pacote de marca (os MESMOS do componente RukzLogo da web). É vetor, então
/// fica nítido em qualquer tamanho e aceita cor: o [bigode] pinta o bigode e o
/// [r] pinta a letra (o acento amarelo). Num fundo amarelo, passe o mesmo tom
/// para os dois, senão o "r" some.
///
/// Desenhado no sistema de coordenadas 1024x1024 do ícone quadrado oficial —
/// por isso o símbolo aparece centralizado, com a mesma folga de cima e de
/// baixo do ícone instalado na tela de início. É de propósito: reforça que é o
/// mesmo app.
class RukzSymbol extends StatelessWidget {
  const RukzSymbol({
    super.key,
    this.size = 48,
    this.bigode = Colors.white,
    this.r = const Color(0xFFFFC300),
  });

  final double size;
  final Color bigode;
  final Color r;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _RukzPainter(bigode, r)),
    );
  }
}

// Traçados oficiais (viewBox 0 0 1024 1024). Só usam M, L, Q e Z absolutos.
const _bigodePath =
    'M 0.0 5.5 L 35.0 20.5 L 57.0 27.5 L 77.0 31.5 L 93.0 31.5 L 106.0 25.5 L 115.0 15.5 L 124.0 -3.5 L 126.0 -14.5 L 128.0 -16.5 L 128.0 -26.5 L 125.0 -28.5 L 120.0 -26.5 L 117.0 -13.5 L 110.0 -3.5 L 101.0 1.5 L 91.0 2.5 L 77.0 -2.5 L 46.0 -27.5 L 36.0 -31.5 L 24.0 -31.5 L 9.0 -23.5 L 0.0 -12.5 Z';

const _rPath =
    'M 13.52 -0.00 L 13.52 -121.48 L 51.76 -121.48 L 51.76 -0.00 L 13.52 -0.00 Z M 51.76 -66.76 L 35.74 -79.26 Q 40.51 -100.51 51.76 -112.23 Q 63.01 -123.98 83.01 -123.98 Q 91.76 -123.98 98.36 -121.37 Q 105.00 -118.75 110.00 -113.24 L 87.27 -84.49 Q 84.77 -87.27 81.02 -88.75 Q 77.27 -90.23 72.50 -90.23 Q 63.01 -90.23 57.38 -84.38 Q 51.76 -78.52 51.76 -66.76 Z';

/// Parser mínimo de path SVG — só o que estes traçados usam (M/L/Q/Z absolutos,
/// com repetição implícita de pares após o comando, como manda a spec).
Path _parse(String d) {
  final path = Path();
  final tokens = d.split(RegExp(r'[\s,]+')).where((t) => t.isNotEmpty).toList();
  var i = 0;
  var cmd = '';
  double num() => double.parse(tokens[i++]);
  while (i < tokens.length) {
    final t = tokens[i];
    if (t.length == 1 && RegExp(r'[A-Za-z]').hasMatch(t)) {
      cmd = t;
      i++;
      if (cmd == 'Z' || cmd == 'z') {
        path.close();
        cmd = '';
      }
      continue;
    }
    switch (cmd) {
      case 'M':
        path.moveTo(num(), num());
        cmd = 'L'; // pares seguintes viram lineTo
        break;
      case 'L':
        path.lineTo(num(), num());
        break;
      case 'Q':
        path.quadraticBezierTo(num(), num(), num(), num());
        break;
      default:
        i++; // ignora token inesperado sem travar
    }
  }
  return path;
}

class _RukzPainter extends CustomPainter {
  _RukzPainter(this.bigodeColor, this.rColor);

  final Color bigodeColor;
  final Color rColor;

  // Traçados construídos uma vez.
  static final Path _bigode = _parse(_bigodePath);
  static final Path _r = _parse(_rPath);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 1024, size.height / 1024);
    canvas.translate(440.8, 636.1);
    canvas.scale(2.1934);

    final penBigode = Paint()
      ..color = bigodeColor
      ..isAntiAlias = true;
    final penR = Paint()
      ..color = rColor
      ..isAntiAlias = true;

    // Bigode: metade esquerda (espelhada) e direita.
    canvas.save();
    canvas.translate(32.44, -24.80);
    canvas.scale(-1.1307, 1.1307);
    canvas.drawPath(_bigode, penBigode);
    canvas.restore();

    canvas.save();
    canvas.translate(32.44, -24.80);
    canvas.scale(1.1307, 1.1307);
    canvas.drawPath(_bigode, penBigode);
    canvas.restore();

    // O "r" por cima.
    canvas.drawPath(_r, penR);
  }

  @override
  bool shouldRepaint(_RukzPainter old) =>
      old.bigodeColor != bigodeColor || old.rColor != rColor;
}
