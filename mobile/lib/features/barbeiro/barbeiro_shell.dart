import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../gestor/brand_controller.dart';
import '../profile/profile_screen.dart';
import 'barbeiro_agenda_screen.dart';
import 'barbeiro_home_screen.dart';
import 'client_ranking_screen.dart';
import 'ganhos_screen.dart';

/// Bottom-tab shell for the barbeiro role: Início / Agenda / Clientes /
/// Ganhos / Perfil — same five-tab shape as the Gestor shell, scoped to
/// what a barber actually needs day to day.
class BarbeiroShell extends StatefulWidget {
  const BarbeiroShell({super.key});

  @override
  State<BarbeiroShell> createState() => _BarbeiroShellState();
}

class _BarbeiroShellState extends State<BarbeiroShell> {
  int _index = 0;

  static const _screens = [
    BarbeiroHomeScreen(),
    BarbeiroAgendaScreen(),
    ClientRankingScreen(),
    GanhosScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    context.read<BrandController>().refresh();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: palette.surface,
        indicatorColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.space_dashboard_outlined), selectedIcon: Icon(Icons.space_dashboard), label: 'Início'),
          NavigationDestination(icon: Icon(Icons.calendar_today_outlined), selectedIcon: Icon(Icons.calendar_today), label: 'Agenda'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Clientes'),
          NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments), label: 'Ganhos'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Perfil'),
        ],
      ),
    );
  }
}
