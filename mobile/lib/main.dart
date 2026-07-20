import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'core/push/push_primer.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/session_provider.dart';
import 'features/barbeiro/barbeiro_shell.dart';
import 'features/cliente/cliente_shell.dart';
import 'features/gestor/brand_controller.dart';
import 'features/gestor/gestor_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pt_BR', null);
  runApp(const CortixApp());
}

class CortixApp extends StatelessWidget {
  const CortixApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SessionProvider()..restore()),
        ChangeNotifierProvider(create: (_) => ThemeController()..restore()),
        // Lazy (default): only instantiated — and only then does it fetch —
        // once a Gestor screen actually reads it. Declared above the
        // Navigator so it's reachable from both the shell's tabs and any
        // screen pushed on top of them (e.g. Configurações), unlike a
        // provider scoped inside GestorShell itself.
        ChangeNotifierProvider(create: (_) => BrandController()),
      ],
      child: Consumer2<SessionProvider, ThemeController>(
        builder: (context, sessionProvider, themeController, _) {
          final seed = sessionProvider.brandColor ?? const Color(0xFFF59E0B);
          return MaterialApp(
            title: 'CORTIX',
            debugShowCheckedModeBanner: false,
            themeMode: themeController.mode,
            theme: buildCortixTheme(seed: seed, brightness: Brightness.light),
            darkTheme: buildCortixTheme(seed: seed, brightness: Brightness.dark),
            locale: const Locale('pt', 'BR'),
            supportedLocales: const [Locale('pt', 'BR')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            home: const AuthGate(),
          );
        },
      ),
    );
  }
}

/// Shows a splash while restoring a stored session, then routes by role:
/// BARBER -> barbeiro shell, CLIENT -> cliente shell, OWNER/MANAGER -> gestor
/// shell. SUPER_ADMIN still falls back to the web-only notice below.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  Widget _build(BuildContext context, SessionProvider sessionProvider) {
    switch (sessionProvider.status) {
      case SessionStatus.unknown:
        return const Scaffold(key: ValueKey('splash'), body: Center(child: CircularProgressIndicator()));
      case SessionStatus.unauthenticated:
        return const LoginScreen(key: ValueKey('login'));
      case SessionStatus.authenticated:
        final session = sessionProvider.session!;
        // PushPrimer envolve os três shells: é onde, uma vez, convidamos a
        // ativar as notificações (o convite nosso antes do pedido do sistema).
        if (session.isBarber) return const PushPrimer(key: ValueKey('barbeiro'), child: BarbeiroShell());
        if (session.isClient) return const PushPrimer(key: ValueKey('cliente'), child: ClienteShell());
        if (session.isManager) return const PushPrimer(key: ValueKey('gestor'), child: GestorShell());
        return Scaffold(
          key: const ValueKey('unsupported-role'),
          backgroundColor: const Color(0xFF09090B),
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Este papel ainda usa o painel web do CORTIX.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.read<SessionProvider>().logout(),
                    child: const Text('Sair'),
                  ),
                ],
              ),
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionProvider = context.watch<SessionProvider>();
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 420),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: ScaleTransition(
          scale: Tween(begin: 0.97, end: 1.0).animate(animation),
          child: child,
        ),
      ),
      child: _build(context, sessionProvider),
    );
  }
}
