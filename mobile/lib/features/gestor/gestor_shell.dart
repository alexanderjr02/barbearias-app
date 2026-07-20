import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/cortix_bottom_nav.dart';
import '../../core/widgets/floating_copilot_button.dart';
import 'brand_controller.dart';
import 'gestor_agenda_screen.dart';
import 'gestor_clients_screen.dart';
import 'gestor_copilot_screen.dart';
import 'gestor_dashboard_screen.dart';
import 'gestor_more_screen.dart';
import 'gestor_staff_screen.dart';

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
          backgroundColor: palette.bg,
          body: IndexedStack(index: _index, children: _screens),
          bottomNavigationBar: CortixBottomNav(
            index: _index,
            onTap: (i) => setState(() => _index = i),
            items: const [
              CortixNavItem(Icons.space_dashboard_rounded, 'Painel'),
              CortixNavItem(Icons.calendar_today_rounded, 'Agenda'),
              CortixNavItem(Icons.people_rounded, 'Clientes'),
              CortixNavItem(Icons.content_cut_rounded, 'Equipe'),
              CortixNavItem(Icons.more_horiz_rounded, 'Mais'),
            ],
          ),
        ),
        Material(
          type: MaterialType.transparency,
          child: FloatingCopilotButton(
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorCopilotScreen())),
          ),
        ),
      ],
    );
  }
}
