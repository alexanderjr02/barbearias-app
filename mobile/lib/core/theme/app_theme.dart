import 'package:flutter/material.dart';

/// Picks black or white for legible text over [background] — needed because
/// the brand accent is merchant-chosen (Configurações > Aparência) and can
/// land anywhere from bright gold to pure black, so a hardcoded "always use
/// black text on the accent" breaks the moment a shop picks a dark color.
Color contrastingTextColor(Color background) => background.computeLuminance() > 0.5 ? Colors.black : Colors.white;

/// The only two semantic colors the app reaches for outside the brand accent
/// and the neutral palette: a resolved-good state and a resolved-bad state.
/// Everything still pending (scheduled/confirmed/in progress) is neutral —
/// color is reserved for outcomes, not for telling statuses apart. Chosen a
/// touch softer than the stock Material red/green so they sit comfortably
/// next to a warm gold brand accent instead of reading as generic alerts.
const Color kSuccessColor = Color(0xFF3DDC84);
const Color kDangerColor = Color(0xFFF2685C);
const Color kWarningColor = Color(0xFFFBBF66);

/// Shared status→color mapping for appointments (Gestor and Barbeiro agenda
/// screens) — one minimal, semantic scale instead of a different hue per
/// status.
Color appointmentStatusColor(String status, AppPalette palette) {
  switch (status) {
    case 'COMPLETED':
      return kSuccessColor;
    case 'CANCELLED':
    case 'NO_SHOW':
      return kDangerColor;
    default:
      return palette.textSecondary;
  }
}

/// Semantic colors every screen should pull from instead of hardcoding hex
/// values — this is what makes the light/dark toggle actually work, rather
/// than just swapping the Scaffold background and leaving white-on-white
/// text everywhere.
class AppPalette {
  final Color bg;
  final Color surface;
  final Color surfaceAlt;
  final Color textPrimary;
  final Color textSecondary;
  final Color textFaint;
  final Color border;
  final Color scrim;

  const AppPalette({
    required this.bg,
    required this.surface,
    required this.surfaceAlt,
    required this.textPrimary,
    required this.textSecondary,
    required this.textFaint,
    required this.border,
    required this.scrim,
  });

  // A warm charcoal scale (a hint of brown/gold in the black, rather than a
  // cold blue-black) so the neutral chrome sits comfortably alongside a
  // warm gold/amber brand accent instead of fighting it.
  static const dark = AppPalette(
    bg: Color(0xFF0C0A08),
    surface: Color(0xFF18140F),
    surfaceAlt: Color(0xFF221C15),
    textPrimary: Colors.white,
    textSecondary: Colors.white70,
    textFaint: Colors.white38,
    border: Color(0x1FFFE9D2),
    scrim: Colors.black45,
  );

  // Claro moderno: neutro e limpo, no lugar do bege amarelado de antes (que
  // dava cara datada). Fundo levemente frio, cartão branco puro, cinzas
  // neutros e alto contraste no texto — o padrão de app premium (Apple, Linear)
  // em vez de "papel envelhecido".
  static const light = AppPalette(
    bg: Color(0xFFF4F4F6),
    surface: Colors.white,
    surfaceAlt: Color(0xFFECECEF),
    textPrimary: Color(0xFF17151A),
    textSecondary: Color(0xFF616068),
    textFaint: Color(0xFF9B9AA2),
    border: Color(0x0F17151A),
    scrim: Colors.black26,
  );

  static AppPalette of(BuildContext context) => Theme.of(context).brightness == Brightness.dark ? dark : light;
}

/// Builds a full ThemeData for a given brand seed + brightness. Deliberately
/// pins [ColorScheme.primary] to the exact seed instead of letting
/// [ColorScheme.fromSeed] tonal-map it — Material 3's dark-mode tone curve
/// desaturates warm ambers into a washed-out pink, which read as a bug.
ThemeData buildCortixTheme({required Color seed, required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;
  final palette = isDark ? AppPalette.dark : AppPalette.light;
  final base = ColorScheme.fromSeed(seedColor: seed, brightness: brightness).copyWith(
    primary: seed,
    onPrimary: Colors.black,
    surface: palette.surface,
    onSurface: palette.textPrimary,
  );

  return (isDark ? ThemeData.dark() : ThemeData.light()).copyWith(
    brightness: brightness,
    scaffoldBackgroundColor: palette.bg,
    colorScheme: base,
    appBarTheme: AppBarTheme(backgroundColor: palette.bg, foregroundColor: palette.textPrimary, elevation: 0),
    cardColor: palette.surface,
    dividerColor: palette.border,
    textTheme: (isDark ? ThemeData.dark() : ThemeData.light()).textTheme.apply(
          bodyColor: palette.textPrimary,
          displayColor: palette.textPrimary,
        ),
  );
}
