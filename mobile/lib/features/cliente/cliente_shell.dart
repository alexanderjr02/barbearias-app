import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/cortix_bottom_nav.dart';
import '../chatbot/floating_chatbot.dart';
import '../profile/profile_screen.dart';
import 'client_preferences_screen.dart';
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
          bottomNavigationBar: CortixBottomNav(
            index: _index,
            onTap: (i) => setState(() => _index = i),
            items: const [
              CortixNavItem(Icons.home_rounded, 'Início'),
              CortixNavItem(Icons.content_cut_rounded, 'Cortes'),
              CortixNavItem(Icons.card_giftcard_rounded, 'Fidelidade'),
              CortixNavItem(Icons.workspace_premium_rounded, 'Clube'),
              CortixNavItem(Icons.tune_rounded, 'Preferências'),
              CortixNavItem(Icons.person_rounded, 'Perfil'),
            ],
          ),
        ),
        const Material(type: MaterialType.transparency, child: FloatingChatbot()),
      ],
    );
  }
}
