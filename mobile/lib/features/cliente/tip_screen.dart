import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'client_repository.dart';

/// Gorjeta digital via PIX — the client picks an amount, copies the shop's PIX
/// key to pay directly, and the tip is logged so the barber sees it in Ganhos.
class TipScreen extends StatefulWidget {
  final String appointmentId;
  final String barberName;

  const TipScreen({super.key, required this.appointmentId, required this.barberName});

  @override
  State<TipScreen> createState() => _TipScreenState();
}

class _TipScreenState extends State<TipScreen> {
  final _repository = ClientRepository();
  late Future<TipInfo> _future;
  double _amount = 10;
  bool _sending = false;
  bool _sent = false;

  static const _presets = [5.0, 10.0, 20.0, 50.0];

  @override
  void initState() {
    super.initState();
    _future = _repository.tipInfo(widget.appointmentId);
  }

  Future<void> _customAmount() async {
    final ctrl = TextEditingController(text: _amount.toStringAsFixed(0));
    final palette = AppPalette.of(context);
    final result = await showDialog<double>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: palette.surface,
        title: Text('Outro valor', style: TextStyle(color: palette.textPrimary, fontSize: 16)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: TextStyle(color: palette.textPrimary),
          decoration: const InputDecoration(prefixText: 'R\$ '),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(ctx, double.tryParse(ctrl.text.replaceAll(',', '.'))), child: const Text('Ok')),
        ],
      ),
    );
    if (result != null && result > 0) setState(() => _amount = result);
  }

  Future<void> _send() async {
    setState(() => _sending = true);
    try {
      await _repository.sendTip(widget.appointmentId, _amount);
      if (mounted) setState(() => _sent = true);
    } catch (e) {
      if (mounted) AppToast.error(context, 'Não foi possível registrar a gorjeta');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, elevation: 0, title: const Text('Gorjeta')),
      body: FutureBuilder<TipInfo>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final info = snap.data;
          if (info != null && (info.hasTip || _sent)) {
            return _ThankYou(palette: palette, accent: accent, amount: info.hasTip ? (info.amount ?? _amount) : _amount, barberName: widget.barberName);
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
            children: [
              Center(
                child: Container(
                  width: 66,
                  height: 66,
                  decoration: BoxDecoration(color: accent.withValues(alpha: 0.14), shape: BoxShape.circle),
                  child: Icon(Icons.volunteer_activism_rounded, color: accent, size: 32),
                ),
              ),
              const SizedBox(height: 14),
              Center(child: Text('Gostou do atendimento?', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 18))),
              const SizedBox(height: 4),
              Center(child: Text('Deixe uma gorjeta pra ${widget.barberName}', textAlign: TextAlign.center, style: TextStyle(color: palette.textFaint, fontSize: 13))),
              const SizedBox(height: 24),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.center,
                children: [
                  for (final p in _presets) _AmountChip(value: p, selected: _amount == p, palette: palette, accent: accent, onTap: () => setState(() => _amount = p)),
                  _AmountChip(value: null, selected: !_presets.contains(_amount), palette: palette, accent: accent, onTap: _customAmount, customLabel: _presets.contains(_amount) ? 'Outro' : 'R\$ ${_amount.toStringAsFixed(0)}'),
                ],
              ),
              const SizedBox(height: 24),
              if (info?.pixKey != null && info!.pixKey!.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      Icon(Icons.pix_rounded, color: accent, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(info.pixGoesToBarber ? 'Chave PIX de ${widget.barberName}' : 'Chave PIX da barbearia', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                            Text(info.pixKey!, style: TextStyle(color: palette.textPrimary, fontSize: 13.5, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: info.pixKey!));
                          AppToast.success(context, 'Chave PIX copiada');
                        },
                        child: Text('Copiar', style: TextStyle(color: accent, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text('Faça o PIX de R\$ ${_amount.toStringAsFixed(2)} pela chave acima e confirme abaixo.', style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4)),
              ] else
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                  child: Text('Esta barbearia ainda não cadastrou uma chave PIX. Você pode registrar a intenção da gorjeta mesmo assim.', style: TextStyle(color: palette.textFaint, fontSize: 12.5, height: 1.4)),
                ),
              const SizedBox(height: 24),
              PulseButton(
                onPressed: _sending ? null : _send,
                gradient: LinearGradient(colors: [Color.lerp(accent, Colors.white, 0.22)!, accent]),
                child: _sending
                    ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: onAccent))
                    : Text('Confirmar gorjeta de R\$ ${_amount.toStringAsFixed(2)}', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _AmountChip extends StatelessWidget {
  final double? value;
  final bool selected;
  final AppPalette palette;
  final Color accent;
  final VoidCallback onTap;
  final String? customLabel;
  const _AmountChip({required this.value, required this.selected, required this.palette, required this.accent, required this.onTap, this.customLabel});

  @override
  Widget build(BuildContext context) {
    final label = customLabel ?? 'R\$ ${value!.toStringAsFixed(0)}';
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? accent : palette.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? accent : palette.border),
        ),
        child: Text(label, style: TextStyle(color: selected ? contrastingTextColor(accent) : palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
      ),
    );
  }
}

class _ThankYou extends StatelessWidget {
  final AppPalette palette;
  final Color accent;
  final double amount;
  final String barberName;
  const _ThankYou({required this.palette, required this.accent, required this.amount, required this.barberName});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(color: accent.withValues(alpha: 0.14), shape: BoxShape.circle),
              child: Icon(Icons.favorite_rounded, color: accent, size: 40),
            ),
            const SizedBox(height: 18),
            Text('Obrigado!', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 22)),
            const SizedBox(height: 8),
            Text('Sua gorjeta de R\$ ${amount.toStringAsFixed(2)} pra $barberName foi registrada.', textAlign: TextAlign.center, style: TextStyle(color: palette.textFaint, fontSize: 14, height: 1.5)),
            const SizedBox(height: 24),
            TextButton(onPressed: () => Navigator.of(context).pop(true), child: Text('Voltar', style: TextStyle(color: accent, fontWeight: FontWeight.w700))),
          ],
        ),
      ),
    );
  }
}
