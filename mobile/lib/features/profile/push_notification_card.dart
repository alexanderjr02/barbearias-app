import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/push/push_service.dart';
import '../../core/storage/token_storage.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';

/// Card de "Notificações no aparelho" — liga/desliga o Web Push. Aparece na
/// tela de perfil (todos os papéis). Fora do web, ou em navegador sem suporte,
/// some sozinho (pushStatus == 'unsupported').
class PushNotificationCard extends StatefulWidget {
  const PushNotificationCard({super.key});

  @override
  State<PushNotificationCard> createState() => _PushNotificationCardState();
}

class _PushNotificationCardState extends State<PushNotificationCard> {
  String _status = 'default';
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _status = pushStatus();
  }

  Future<void> _enable() async {
    setState(() => _busy = true);
    final token = await TokenStorage.instance.accessToken;
    if (token == null) {
      if (mounted) {
        setState(() => _busy = false);
        AppToast.error(context, 'Faça login de novo para ativar.');
      }
      return;
    }
    final result = await pushEnable(token, apiBaseUrl);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _status = result;
    });
    if (result == 'granted') {
      AppToast.success(context, 'Notificações ativadas neste aparelho.');
    } else if (result == 'denied') {
      AppToast.error(context, 'Permissão negada. Libere nas configurações do navegador.');
    } else if (result == 'error') {
      AppToast.error(context, 'Não consegui ativar agora. Tente de novo.');
    }
  }

  Future<void> _disable() async {
    setState(() => _busy = true);
    final token = await TokenStorage.instance.accessToken;
    final result = await pushDisable(token ?? '', apiBaseUrl);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (result == 'ok') _status = 'default';
    });
    if (result == 'ok') AppToast.success(context, 'Notificações desligadas.');
  }

  @override
  Widget build(BuildContext context) {
    // Navegador sem suporte: não mostra nada — nada pior que um botão que
    // promete algo que o aparelho não faz.
    if (_status == 'unsupported') return const SizedBox.shrink();

    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 26),
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text('Notificações',
              style: TextStyle(color: palette.textFaint, fontSize: 12.5, fontWeight: FontWeight.w700, letterSpacing: 0.3)),
        ),
        Container(
          decoration: BoxDecoration(
            color: palette.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: palette.border),
          ),
          padding: const EdgeInsets.all(14),
          child: _body(palette, accent),
        ),
      ],
    );
  }

  Widget _body(AppPalette palette, Color accent) {
    // iPhone sem o app instalado: a Apple só libera push no PWA da tela de
    // início. Explica o passo em vez de oferecer um botão que falharia.
    if (_status == 'needs-install') {
      return Row(
        children: [
          _iconBox(Icons.ios_share_rounded, accent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Adicione o app à tela de início',
                    style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14.5)),
                const SizedBox(height: 2),
                Text('No iPhone, toque em Compartilhar e "Adicionar à Tela de Início". Depois volte aqui para ativar os avisos.',
                    style: TextStyle(color: palette.textFaint, fontSize: 12, height: 1.35)),
              ],
            ),
          ),
        ],
      );
    }

    if (_status == 'granted') {
      return Row(
        children: [
          _iconBox(Icons.notifications_active_rounded, accent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Notificações ativadas',
                    style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14.5)),
                const SizedBox(height: 2),
                Text('Você recebe avisos neste aparelho mesmo com o app fechado.',
                    style: TextStyle(color: palette.textFaint, fontSize: 12, height: 1.35)),
              ],
            ),
          ),
          TextButton(
            onPressed: _busy ? null : _disable,
            child: _busy
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : Text('Desligar', style: TextStyle(color: palette.textFaint, fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ],
      );
    }

    // 'default', 'denied' ou 'error' — oferece ativar.
    final denied = _status == 'denied';
    return Row(
      children: [
        _iconBox(Icons.notifications_none_rounded, accent),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Ativar avisos no aparelho',
                  style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 14.5)),
              const SizedBox(height: 2),
              Text(denied
                  ? 'Permissão negada antes. Libere as notificações nas configurações do navegador e tente de novo.'
                  : 'Receba agendamentos e lembretes na hora, como uma mensagem — mesmo com o app fechado.',
                  style: TextStyle(color: palette.textFaint, fontSize: 12, height: 1.35)),
            ],
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          height: 38,
          child: ElevatedButton(
            onPressed: _busy ? null : _enable,
            style: ElevatedButton.styleFrom(
              backgroundColor: accent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            child: _busy
                ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                : Text('Ativar', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.w800, fontSize: 13.5)),
          ),
        ),
      ],
    );
  }

  Widget _iconBox(IconData icon, Color accent) => Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(color: accent.withValues(alpha: 0.13), borderRadius: BorderRadius.circular(11)),
        child: Icon(icon, size: 18, color: accent),
      );
}
