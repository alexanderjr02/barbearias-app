import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../chatbot/floating_chatbot.dart';
import '../profile/profile_screen.dart';
import 'cliente_home_screen.dart';

/// Bottom-tab shell for the cliente role: Início / Perfil. Wrapped in a
/// Stack (rather than living inside the Scaffold) so the floating chatbot
/// bubble sits above the bottom nav bar on every tab, not just one screen.
class ClienteShell extends StatefulWidget {
  const ClienteShell({super.key});

  @override
  State<ClienteShell> createState() => _ClienteShellState();
}

class _ClienteShellState extends State<ClienteShell> {
  int _index = 0;

  static const _screens = [
    ClienteHomeScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Stack(
      children: [
        Scaffold(
          body: IndexedStack(index: _index, children: _screens),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _index,
            onDestinationSelected: (i) => setState(() => _index = i),
            backgroundColor: palette.surface,
            indicatorColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
            destinations: const [
              NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Início'),
              NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Perfil'),
            ],
          ),
        ),
        const Material(type: MaterialType.transparency, child: FloatingChatbot()),
      ],
    );
  }
}
