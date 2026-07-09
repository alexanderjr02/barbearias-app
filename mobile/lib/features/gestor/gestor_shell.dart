import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import 'brand_controller.dart';
import 'gestor_agenda_screen.dart';
import 'gestor_clients_screen.dart';
import 'gestor_dashboard_screen.dart';
import 'gestor_more_screen.dart';
import 'gestor_staff_screen.dart';
import 'widgets/floating_support_button.dart';

/// Bottom-tab shell for OWNER/MANAGER on mobile: Dashboard / Agenda /
/// Clientes / Equipe / Mais. The remaining web sidebar sections — Relatórios,
/// Serviços, Estoque, Marketing and Configurações — live one level deeper,
/// linked from "Mais", to keep the bottom nav to five primary destinations.
class GestorShell extends StatefulWidget {
  const GestorShell({super.key});

  @override
  State<GestorShell> createState() => _GestorShellState();
}

class _GestorShellState extends State<GestorShell> {
  int _index = 0;

  static const _screens = [
    GestorDashboardScreen(),
    GestorAgendaScreen(),
    GestorClientsScreen(),
    GestorStaffScreen(),
    GestorMoreScreen(),
  ];

  @override
  void initState() {
    super.initState();
    context.read<BrandController>().refresh();
  }

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
              NavigationDestination(icon: Icon(Icons.space_dashboard_outlined), selectedIcon: Icon(Icons.space_dashboard), label: 'Dashboard'),
              NavigationDestination(icon: Icon(Icons.calendar_today_outlined), selectedIcon: Icon(Icons.calendar_today), label: 'Agenda'),
              NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Clientes'),
              NavigationDestination(icon: Icon(Icons.content_cut_outlined), selectedIcon: Icon(Icons.content_cut), label: 'Equipe'),
              NavigationDestination(icon: Icon(Icons.more_horiz), selectedIcon: Icon(Icons.more_horiz), label: 'Mais'),
            ],
          ),
        ),
        const Material(type: MaterialType.transparency, child: FloatingSupportButton()),
      ],
    );
  }
}
