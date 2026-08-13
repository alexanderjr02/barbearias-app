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

/// Dinheiro sem centavos, para numero grande onde o centavo e ruido.
///
/// A meta do mes e a projecao aparecem como "R$ 45.000", nao "R$ 45.000,00":
/// ali o centavo nao ajuda ninguem a decidir nada. O que faltava era o ponto
/// no milhar, sem o qual "R$ 16479" vira um numero que a pessoa tem que
/// soletrar.
String reaisSemCentavos(num valor) {
  final inteiro = valor.round().abs();
  final digitos = inteiro.toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digitos.length; i++) {
    if (i > 0 && (digitos.length - i) % 3 == 0) buffer.write('.');
    buffer.write(digitos[i]);
  }
  return 'R\$ ${valor < 0 ? '-' : ''}$buffer';
}
