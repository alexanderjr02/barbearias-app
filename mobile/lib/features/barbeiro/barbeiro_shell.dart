import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/cortix_bottom_nav.dart';
import '../../core/widgets/floating_copilot_button.dart';
import '../gestor/brand_controller.dart';
import '../profile/profile_screen.dart';
import 'barbeiro_agenda_screen.dart';
import 'barbeiro_copilot_screen.dart';
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
    return Stack(
      children: [
        Scaffold(
          backgroundColor: palette.bg,
          body: IndexedStack(index: _index, children: _screens),
          bottomNavigationBar: CortixBottomNav(
            index: _index,
            onTap: (i) => setState(() => _index = i),
            items: const [
              CortixNavItem(Icons.space_dashboard_rounded, 'Início'),
              CortixNavItem(Icons.calendar_today_rounded, 'Agenda'),
              CortixNavItem(Icons.people_rounded, 'Clientes'),
              CortixNavItem(Icons.payments_rounded, 'Ganhos'),
              CortixNavItem(Icons.person_rounded, 'Perfil'),
            ],
          ),
        ),
        Material(
          type: MaterialType.transparency,
          child: FloatingCopilotButton(
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BarbeiroCopilotScreen())),
          ),
        ),
      ],
    );
  }
}
