import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../profile/profile_screen.dart';
import 'gestor_finance_screen.dart';
import 'gestor_inventory_screen.dart';
import 'gestor_marketing_screen.dart';
import 'gestor_reports_screen.dart';
import 'gestor_services_screen.dart';
import 'gestor_settings_screen.dart';
import 'gestor_subscriptions_screen.dart';

class GestorMoreScreen extends StatelessWidget {
  const GestorMoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Mais'), elevation: 0),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _MenuTile(
            icon: Icons.bar_chart_rounded,
            label: 'Relatórios',
            sub: 'KPIs, gráficos e performance da equipe',
            palette: palette,
            accent: accent,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorReportsScreen())),
          ),
          const SizedBox(height: 10),
          _MenuTile(
            icon: Icons.content_cut_rounded,
            label: 'Serviços',
            sub: 'Catálogo, preços e disponibilidade',
            palette: palette,
            accent: accent,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorServicesScreen())),
          ),
          const SizedBox(height: 10),
          _MenuTile(
            icon: Icons.inventory_2_outlined,
            label: 'Estoque',
            sub: 'Produtos, preços e alertas de reposição',
            palette: palette,
            accent: accent,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorInventoryScreen())),
          ),
          const SizedBox(height: 10),
          _MenuTile(
            icon: Icons.campaign_outlined,
            label: 'Marketing',
            sub: 'Campanhas e automações',
            palette: palette,
            accent: accent,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorMarketingScreen())),
          ),
          const SizedBox(height: 10),
          _MenuTile(
            icon: Icons.attach_money_rounded,
            label: 'Financeiro',
            sub: 'Receitas, despesas e lucro',
            palette: palette,
            accent: accent,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorFinanceScreen())),
          ),
          const SizedBox(height: 10),
          _MenuTile(
            icon: Icons.repeat_rounded,
            label: 'Assinaturas',
            sub: 'Planos recorrentes e assinantes',
            palette: palette,
            accent: accent,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorSubscriptionsScreen())),
          ),
          const SizedBox(height: 10),
          _MenuTile(
            icon: Icons.settings_outlined,
            label: 'Configurações',
            sub: 'Barbearia, aparência, horários, chatbot e plano',
            palette: palette,
            accent: accent,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GestorSettingsScreen())),
          ),
          const SizedBox(height: 10),
          _MenuTile(
            icon: Icons.person_outline_rounded,
            label: 'Meu perfil',
            sub: 'Nome, foto, telefone e aparência',
            palette: palette,
            accent: accent,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen())),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String sub;
  final AppPalette palette;
  final Color accent;
  final VoidCallback onTap;

  const _MenuTile({required this.icon, required this.label, required this.sub, required this.palette, required this.accent, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: palette.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, color: palette.textPrimary, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5)),
                    Text(sub, style: TextStyle(color: palette.textFaint, fontSize: 12)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: palette.textFaint),
            ],
          ),
        ),
      ),
    );
  }
}
