import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// Mirrors the web Marketing page 1:1 — campaigns, automations and quick
/// actions are demo/mock data there too (no backend exists for marketing on
/// either platform), so this screen intentionally matches that same static
/// state rather than pretending mobile has a real campaign engine.
class GestorMarketingScreen extends StatefulWidget {
  const GestorMarketingScreen({super.key});

  @override
  State<GestorMarketingScreen> createState() => _GestorMarketingScreenState();
}

class _Campaign {
  final String name;
  final String type;
  final String status;
  final int recipients;
  final int opened;
  final String date;
  const _Campaign(this.name, this.type, this.status, this.recipients, this.opened, this.date);
}

class _Automation {
  final String label;
  final String desc;
  bool active;
  _Automation(this.label, this.desc, this.active);
}

class _GestorMarketingScreenState extends State<GestorMarketingScreen> {
  final _campaigns = const [
    _Campaign('Promoção Julho', 'WhatsApp', 'Enviada', 245, 198, '01/07/2025'),
    _Campaign('Lembrete Aniversariantes', 'Email', 'Programada', 18, 0, '05/07/2025'),
    _Campaign('Reativação Inativos', 'SMS', 'Rascunho', 67, 0, '—'),
  ];

  final _automations = [
    _Automation('Lembrete 24h antes', 'Mensagem WhatsApp 24h antes do agendamento', true),
    _Automation('Lembrete 2h antes', 'Mensagem WhatsApp 2h antes do agendamento', true),
    _Automation('Aniversariantes do dia', 'Mensagem especial no aniversário do cliente', false),
    _Automation('Reativação de inativos', 'Mensagem para clientes sem visita há 30 dias', false),
  ];

  Color _statusColor(String status) {
    return status == 'Enviada' ? kSuccessColor : Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    final quickActions = [
      (Icons.chat_bubble_outline_rounded, 'Campanha\nWhatsApp', accent),
      (Icons.mail_outline_rounded, 'Campanha\nEmail', accent),
      (Icons.notifications_active_outlined, 'Lembrete\nAutomático', accent),
      (Icons.groups_outlined, 'Programa\nFidelidade', accent),
    ];

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        elevation: 0,
        title: const Text('Marketing'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Em breve.'))),
              icon: const Icon(Icons.campaign_outlined, size: 18),
              label: const Text('Nova'),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Text('Campanhas e automações', style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
          const SizedBox(height: 14),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.5,
            children: quickActions
                .map((a) => Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(color: a.$3.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(12)),
                            child: Icon(a.$1, color: a.$3, size: 18),
                          ),
                          const SizedBox(height: 8),
                          Text(a.$2, textAlign: TextAlign.center, style: TextStyle(color: palette.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 20),
          Text('Automações ativas', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16)),
            child: Column(
              children: _automations.asMap().entries.map((e) {
                final i = e.key;
                final a = e.value;
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(border: i < _automations.length - 1 ? Border(bottom: BorderSide(color: palette.border)) : null),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(a.label, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                            Text(a.desc, style: TextStyle(color: palette.textFaint, fontSize: 11)),
                          ],
                        ),
                      ),
                      Switch(value: a.active, activeThumbColor: accent, onChanged: (v) => setState(() => a.active = v)),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),
          Text('Últimas campanhas', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 10),
          ..._campaigns.map((c) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                          Text('${c.type} · ${c.date}', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                        ],
                      ),
                    ),
                    if (c.recipients > 0) ...[
                      Column(
                        children: [
                          Text('${c.recipients}', style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600)),
                          Text('enviados', style: TextStyle(color: palette.textFaint, fontSize: 9.5)),
                        ],
                      ),
                      const SizedBox(width: 14),
                    ],
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: _statusColor(c.status).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                      child: Text(c.status, style: TextStyle(color: _statusColor(c.status), fontSize: 10.5, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
