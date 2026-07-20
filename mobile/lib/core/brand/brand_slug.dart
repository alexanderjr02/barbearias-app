import 'package:shared_preferences/shared_preferences.dart';

/// De qual barbearia é este app, antes de qualquer login.
///
/// Existe como função solta porque DOIS lugares precisam da resposta e antes
/// cada um tinha a sua: o SessionProvider (cor do tema) e a tela de login
/// (logo, nome, capa, vídeo de fundo). Corrigir um e esquecer o outro foi
/// exatamente o que aconteceu — o tema mudava e a tela de login continuava
/// com a cara padrão.
///
/// Ordem de resolução:
///   1. `?shop=slug` na URL — o link que o gestor divulga;
///   2. o último slug usado neste aparelho, porque depois de instalado na
///      tela de início não há query string;
///   3. o dart-define BRAND_SLUG, para builds dedicados a uma barbearia.
const _slugKey = 'cortix_brand_slug';

Future<String?> resolveBrandSlug() async {
  final fromUrl = Uri.base.queryParameters['shop']?.trim();
  try {
    final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 5));
    if (fromUrl != null && fromUrl.isNotEmpty) {
      await prefs.setString(_slugKey, fromUrl);
      return fromUrl;
    }
    final saved = prefs.getString(_slugKey);
    if (saved != null && saved.isNotEmpty) return saved;
  } catch (_) {
    // Preferências indisponíveis (modo privado, por exemplo) não podem
    // derrubar a marca: cai no que veio na URL.
    if (fromUrl != null && fromUrl.isNotEmpty) return fromUrl;
  }
  const fromBuild = String.fromEnvironment('BRAND_SLUG');
  return fromBuild.isEmpty ? null : fromBuild;
}
