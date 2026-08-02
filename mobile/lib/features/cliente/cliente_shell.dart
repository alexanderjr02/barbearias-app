import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/rukz_bottom_nav.dart';
import '../../core/widgets/floating_copilot_button.dart';
import '../profile/profile_screen.dart';
import 'client_preferences_screen.dart';
import 'cliente_copilot_screen.dart';
import 'cliente_home_screen.dart';
import 'cliente_subscriptions_screen.dart';
import 'cut_wallet_screen.dart';
import 'loyalty_tab_screen.dart';

/// Bottom-tab shell for the cliente role: Início / Cortes / Fidelidade /
/// Clube / Preferências / Perfil.
/// Wrapped in a Stack so the floating chatbot bubble sits above the nav bar.
class ClienteShell extends StatefulWidget {
  const ClienteShell({super.key});

  @override
  State<ClienteShell> createState() => _ClienteShellState();
}

class _ClienteShellState extends State<ClienteShell> {
  int _index = 0;

  static const _screens = [
    ClienteHomeScreen(),
    CutWalletScreen(),
    LoyaltyTabScreen(),
    ClientSubscriptionsScreen(),
    ClientPreferencesScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Stack(
      children: [
        Scaffold(
          backgroundColor: palette.bg,
          body: IndexedStack(index: _index, children: _screens),
          bottomNavigationBar: RukzBottomNav(
            index: _index,
            onTap: (i) => setState(() => _index = i),
            items: const [
              RukzNavItem(Icons.home_rounded, 'Início'),
              RukzNavItem(Icons.content_cut_rounded, 'Cortes'),
              RukzNavItem(Icons.card_giftcard_rounded, 'Fidelidade'),
              RukzNavItem(Icons.workspace_premium_rounded, 'Clube'),
              RukzNavItem(Icons.tune_rounded, 'Preferências'),
              RukzNavItem(Icons.person_rounded, 'Perfil'),
            ],
          ),
        ),
        // Mesmo botão flutuante do gestor e do barbeiro: abre o Copiloto em
        // tela cheia (antes o cliente tinha um painelzinho que abria diferente).
        Material(
          type: MaterialType.transparency,
          child: FloatingCopilotButton(
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ClienteCopilotScreen())),
          ),
        ),
      ],
    );
  }
}
