import 'dart:typed_data';
import 'package:flutter/material.dart';

/// A marca rukz desenhada, o bigode + o "r", a partir dos traçados oficiais
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
    this.tight = false,
  });

  /// Em [tight] = false o símbolo é desenhado dentro do quadrado 1024 do ícone
  /// do app (com a mesma folga do ícone instalado). Em [tight] = true ele é
  /// recortado justo, preenche a largura [size], sem margem, igual à logo da
  /// web. Nesse modo a altura é [size] / 2.147 (a proporção do símbolo).
  final bool tight;

  final double size;
  final Color bigode;
  final Color r;

  // Proporção do símbolo recortado justo (do arquivo de marca): 634.9 : 295.67.
  static const double _aspect = 2.1472;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: tight ? size / _aspect : size,
      child: CustomPaint(painter: _RukzPainter(bigode, r, tight)),
    );
  }
}

/// Só o "r" da marca (sem o bigode), recortado justo e centralizado, para
/// espaços pequenos, tipo o botão do copiloto. Mesmo traçado oficial da logo.
class RukzR extends StatelessWidget {
  const RukzR({super.key, this.size = 28, this.color = const Color(0xFFFFC300)});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: size, height: size, child: CustomPaint(painter: _RukzRPainter(color)));
  }
}

/// A cara do Copiloto: o bigode oficial da marca dentro de um balão de conversa.
/// Gêmeo do CopilotMark da web, mesmos traço e proporções. [bubble] pinta o
/// balão e [mustache] pinta o bigode (o vazado). Num FAB de fundo âmbar, passe
/// bubble = onAccent e mustache = accent; em fundo escuro, bubble = accent e
/// mustache = um tom escuro.
class CopilotMark extends StatelessWidget {
  const CopilotMark({
    super.key,
    this.size = 28,
    this.bubble = const Color(0xFFFFC300),
    this.mustache = const Color(0xFF101014),
  });

  final double size;
  final Color bubble;
  final Color mustache;

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: size, height: size, child: CustomPaint(painter: _CopilotMarkPainter(bubble, mustache)));
  }
}

class _CopilotMarkPainter extends CustomPainter {
  _CopilotMarkPainter(this.bubbleColor, this.mustacheColor);

  final Color bubbleColor;
  final Color mustacheColor;

  static final Path _bigode = _parse(_bigodePath);

  @override
  void paint(Canvas canvas, Size size) {
    // Desenhado num espaço 100x100, igual ao viewBox do CopilotMark da web.
    canvas.scale(size.width / 100, size.height / 100);

    final penBalao = Paint()
      ..color = bubbleColor
      ..isAntiAlias = true;
    // Balão: retângulo arredondado + rabinho embaixo à esquerda, os dois na
    // mesma cor pra virarem uma peça só.
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(8, 10, 84, 56), const Radius.circular(18)),
      penBalao,
    );
    canvas.drawPath(
      Path()
        ..moveTo(32, 60)
        ..lineTo(52, 60)
        ..lineTo(27, 87)
        ..close(),
      penBalao,
    );

    // Bigode da marca, a MESMA cadeia de transformação do CopilotMark web, que
    // encaixa a caixa do bigode na área interna do balão.
    final penBigode = Paint()
      ..color = mustacheColor
      ..isAntiAlias = true;
    canvas.save();
    canvas.translate(1.6, -11.3);
    canvas.scale(0.0945);
    canvas.translate(440.8, 636.1);
    canvas.scale(2.1934);
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
    canvas.restore();
  }

  @override
  bool shouldRepaint(_CopilotMarkPainter old) =>
      old.bubbleColor != bubbleColor || old.mustacheColor != mustacheColor;
}

class _RukzRPainter extends CustomPainter {
  _RukzRPainter(this.color);

  final Color color;

  // O "r" já posicionado no espaço 1024 do ícone (mesmos translate/scale do
  // símbolo). Matriz coluna-maior de translate(440.8,636.1)·scale(2.1934).
  static final Path _rGlyph = _parse(_rPath).transform(Float64List.fromList(
    <double>[2.1934, 0, 0, 0, 0, 2.1934, 0, 0, 0, 0, 1, 0, 440.8, 636.1, 0, 1],
  ));

  @override
  void paint(Canvas canvas, Size size) {
    final b = _rGlyph.getBounds();
    final side = b.width > b.height ? b.width : b.height;
    final s = (size.shortestSide * 0.84) / side;
    canvas.translate(size.width / 2, size.height / 2);
    canvas.scale(s);
    canvas.translate(-b.center.dx, -b.center.dy);
    canvas.drawPath(_rGlyph, Paint()..color = color..isAntiAlias = true);
  }

  @override
  bool shouldRepaint(_RukzRPainter old) => old.color != color;
}

// Traçados oficiais (viewBox 0 0 1024 1024). Só usam M, L, Q e Z absolutos.
const _bigodePath =
    'M 0.0 5.5 L 35.0 20.5 L 57.0 27.5 L 77.0 31.5 L 93.0 31.5 L 106.0 25.5 L 115.0 15.5 L 124.0 -3.5 L 126.0 -14.5 L 128.0 -16.5 L 128.0 -26.5 L 125.0 -28.5 L 120.0 -26.5 L 117.0 -13.5 L 110.0 -3.5 L 101.0 1.5 L 91.0 2.5 L 77.0 -2.5 L 46.0 -27.5 L 36.0 -31.5 L 24.0 -31.5 L 9.0 -23.5 L 0.0 -12.5 Z';

const _rPath =
    'M 13.52 -0.00 L 13.52 -121.48 L 51.76 -121.48 L 51.76 -0.00 L 13.52 -0.00 Z M 51.76 -66.76 L 35.74 -79.26 Q 40.51 -100.51 51.76 -112.23 Q 63.01 -123.98 83.01 -123.98 Q 91.76 -123.98 98.36 -121.37 Q 105.00 -118.75 110.00 -113.24 L 87.27 -84.49 Q 84.77 -87.27 81.02 -88.75 Q 77.27 -90.23 72.50 -90.23 Q 63.01 -90.23 57.38 -84.38 Q 51.76 -78.52 51.76 -66.76 Z';

/// Parser mínimo de path SVG, só o que estes traçados usam (M/L/Q/Z absolutos,
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
  _RukzPainter(this.bigodeColor, this.rColor, this.tight);

  final Color bigodeColor;
  final Color rColor;
  final bool tight;

  // Traçados construídos uma vez.
  static final Path _bigode = _parse(_bigodePath);
  static final Path _r = _parse(_rPath);

  @override
  void paint(Canvas canvas, Size size) {
    if (tight) {
      // Encaixa a caixa justa do símbolo (194.5,364.16 · 634.9×295.67, do
      // arquivo de marca) na largura toda, sem a margem do ícone quadrado.
      final s = size.width / 634.9;
      canvas.scale(s);
      canvas.translate(-194.5, -364.16);
    } else {
      canvas.scale(size.width / 1024, size.height / 1024);
    }
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
      old.bigodeColor != bigodeColor || old.rColor != rColor || old.tight != tight;
}
