/// Dinheiro no padrao brasileiro: ponto no milhar, virgula nos centavos.
///
/// O app inteiro vinha escrevendo 'R\$ \${v.toStringAsFixed(2)}', que produz
/// "R\$ 1234.50", formato americano. Numa tela que o dono confere contra o
/// caixa, isso e leitura errada, nao so estranheza.
String reais(num valor) {
  final negativo = valor < 0;
  final absoluto = valor.abs();
  final inteiro = absoluto.floor();
  final centavos = ((absoluto - inteiro) * 100).round();

  // Arredondar os centavos pode estourar pra 100 (ex.: 9,999 -> 10,00).
  final inteiroFinal = centavos == 100 ? inteiro + 1 : inteiro;
  final centavosFinal = centavos == 100 ? 0 : centavos;

  final digitos = inteiroFinal.toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digitos.length; i++) {
    if (i > 0 && (digitos.length - i) % 3 == 0) buffer.write('.');
    buffer.write(digitos[i]);
  }

  return 'R\$ ${negativo ? '-' : ''}$buffer,${centavosFinal.toString().padLeft(2, '0')}';
}
