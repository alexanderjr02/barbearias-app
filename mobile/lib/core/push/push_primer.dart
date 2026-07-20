import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../storage/token_storage.dart';
import '../theme/app_theme.dart';
import '../widgets/app_toast.dart';
import 'push_service.dart';

/// Envolve o app autenticado e, uma vez, convida a ativar as notificações.
///
/// Por que um convite NOSSO antes do pedido do sistema: no iPhone o
/// Notification.requestPermission() só funciona a partir de um toque e só pode
/// ser pedido uma vez. Então mostramos primeiro esta folha; o pedido real do
/// iOS só dispara quando a pessoa toca em "Ativar". Quem tocaria em "Agora não"
/// não gasta a permissão — e pode ser convidado de novo pelo Perfil.
class PushPrimer extends StatefulWidget {
  final Widget child;
  const PushPrimer({super.key, required this.child});

  @override
  State<PushPrimer> createState() => _PushPrimerState();
}

class _PushPrimerState extends State<PushPrimer> {
  static const _seenKey = 'push_prompt_seen';

  @override
  void initState() {
    super.initState();
    // Depois do primeiro frame, com uma pausa curta para o app assentar antes
    // de qualquer coisa saltar na frente da pessoa.
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybePrompt());
  }

  Future<void> _maybePrompt() async {
    // Só quando dá para ativar de verdade e a pessoa ainda não decidiu.
    // 'granted'/'denied' já resolvidos, 'needs-install'/'unsupported' não têm
    // como suceder aqui — o Perfil cuida desses casos com a explicação certa.
    if (pushStatus() != 'default') return;

    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_seenKey) ?? false) return;

    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    // Marca como visto ANTES de abrir: mostramos no máximo uma vez, sem
    // insistir a cada login. Quem quiser depois usa o Perfil.
    await prefs.setBool(_seenKey, true);
    if (!mounted) return;

    final accepted = await _showSheet();
    if (accepted != true) return;

    final token = await TokenStorage.instance.accessToken;
    if (token == null) return;
    final result = await pushEnable(token, apiBaseUrl);
    if (!mounted) return;
    if (result == 'granted') {
      AppToast.success(context, 'Notificações ativadas.');
    } else if (result == 'denied') {
      AppToast.error(context, 'Permissão negada. Você pode liberar nas configurações do navegador.');
    }
  }

  Future<bool?> _showSheet() {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    return showModalBottomSheet<bool>(
      context: context,
      backgroundColor: palette.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 14, 22, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 22),
                decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2)),
              ),
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.14), shape: BoxShape.circle),
                child: Icon(Icons.notifications_active_rounded, color: accent, size: 28),
              ),
              const SizedBox(height: 18),
              Text(
                'Ativar notificações?',
                style: TextStyle(color: palette.textPrimary, fontSize: 19, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                'Receba seus agendamentos e avisos no celular na hora, mesmo com o app fechado.',
                textAlign: TextAlign.center,
                style: TextStyle(color: palette.textSecondary, fontSize: 14, height: 1.4),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text('Ativar',
                      style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.w800, fontSize: 15.5)),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: Text('Agora não', style: TextStyle(color: palette.textFaint, fontWeight: FontWeight.w600, fontSize: 14)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
