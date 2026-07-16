import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_toast.dart';
import '../../../core/widgets/form_sheet.dart';
import '../gestor_repository.dart';

const _providers = <String, (String, String)>{
  'MERCADOPAGO': ('Mercado Pago', 'APP_USR-...'),
  'ASAAS': ('Asaas', '\$aact_...'),
  'STRIPE': ('Stripe', 'sk_live_...'),
  'PAGBANK': ('PagBank', 'Token PagBank'),
};

/// Lets the gestor connect their OWN payment account (choosing the provider)
/// so client memberships are charged straight into it — mirrors the web
/// "Conectar recebimento" card.
class PaymentConnectCard extends StatefulWidget {
  const PaymentConnectCard({super.key});

  @override
  State<PaymentConnectCard> createState() => _PaymentConnectCardState();
}

class _PaymentConnectCardState extends State<PaymentConnectCard> {
  final _repository = GestorRepository();
  final _keyCtrl = TextEditingController();
  late Future<({String? provider, bool connected})> _future;
  String _selected = 'MERCADOPAGO';
  bool _open = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _future = _repository.paymentConnection();
  }

  @override
  void dispose() {
    _keyCtrl.dispose();
    super.dispose();
  }

  void _reload() => setState(() => _future = _repository.paymentConnection());

  Future<void> _connect() async {
    if (_keyCtrl.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await _repository.connectPayment(provider: _selected, apiKey: _keyCtrl.text.trim());
      _keyCtrl.clear();
      if (mounted) {
        setState(() {
          _open = false;
          _busy = false;
        });
        AppToast.success(context, 'Recebimento conectado');
      }
      _reload();
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        AppToast.error(context, 'Falha ao conectar');
      }
    }
  }

  Future<void> _disconnect() async {
    setState(() => _busy = true);
    try {
      await _repository.connectPayment(provider: '', apiKey: '');
      if (mounted) setState(() => _busy = false);
      _reload();
    } catch (_) {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return FutureBuilder<({String? provider, bool connected})>(
      future: _future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return Container(height: 66, decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16)));
        }
        final connected = snapshot.data!.connected;
        final providerLabel = _providers[snapshot.data!.provider]?.$1 ?? snapshot.data!.provider ?? '';

        if (connected) {
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.25)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Recebimento conectado${providerLabel.isNotEmpty ? ' via $providerLabel' : ''}',
                          style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 13.5)),
                      Text('As mensalidades caem direto na sua conta.', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: _busy ? null : _disconnect,
                  child: const Text('Desconectar', style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                ),
              ],
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accent.withValues(alpha: 0.22)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.link_rounded, color: accent, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text('Conecte uma conta para receber de verdade',
                        style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 13.5)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Sem conectar, as assinaturas ativam em modo simulado (sem cobrança). Receba por Pix e cartão, direto na sua conta.',
                  style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
              if (!_open) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => setState(() => _open = true),
                    style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(vertical: 12)),
                    icon: Icon(Icons.link_rounded, color: contrastingTextColor(accent), size: 18),
                    label: Text('Conectar recebimento', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                  ),
                ),
              ] else ...[
                const SizedBox(height: 14),
                Text('PROVEDOR', style: TextStyle(color: palette.textFaint, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _providers.entries.map((e) {
                    final sel = _selected == e.key;
                    return GestureDetector(
                      onTap: () => setState(() => _selected = e.key),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: sel ? accent.withValues(alpha: 0.15) : palette.surfaceAlt,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: sel ? accent.withValues(alpha: 0.6) : Colors.transparent),
                        ),
                        child: Text(e.value.$1, style: TextStyle(color: sel ? accent : palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                CortixField(controller: _keyCtrl, obscureText: true, hint: _providers[_selected]!.$2),
                const SizedBox(height: 6),
                Text('Guardamos com segurança e nunca exibimos de volta.', style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _busy ? null : _connect,
                    style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(vertical: 12)),
                    child: _busy
                        ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                        : Text('Salvar', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
