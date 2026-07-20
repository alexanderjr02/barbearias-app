import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'client_repository.dart';
import 'loyalty_wallet_screen.dart';

/// Aba "Fidelidade". A carteira precisa de uma barbearia, mas a aba não recebe
/// nenhuma — então é aqui que isso se resolve: com uma só, abre direto (o caso
/// de quase todo mundo); com várias, deixa escolher antes.
class LoyaltyTabScreen extends StatefulWidget {
  const LoyaltyTabScreen({super.key});

  @override
  State<LoyaltyTabScreen> createState() => _LoyaltyTabScreenState();
}

class _LoyaltyTabScreenState extends State<LoyaltyTabScreen> {
  final _repository = ClientRepository();
  late Future<List<LoyaltyBalance>> _future = _repository.myLoyalty();

  void _reload() => setState(() => _future = _repository.myLoyalty());

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      body: FutureBuilder<List<LoyaltyBalance>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final shops = (snapshot.data ?? []).where((l) => l.barbershopId.isNotEmpty).toList();

          if (snapshot.hasError || shops.isEmpty) {
            return _Empty(palette: palette, accent: accent, onRetry: _reload, failed: snapshot.hasError);
          }

          if (shops.length == 1) {
            return LoyaltyWalletScreen(
              barbershopId: shops.first.barbershopId,
              barbershopName: shops.first.barbershopName,
              embedded: true,
            );
          }

          return SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
              children: [
                Text('Suas barbearias',
                    style: TextStyle(
                        color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 22, letterSpacing: -0.5)),
                const SizedBox(height: 4),
                Text('Escolha de qual quer ver a carteira',
                    style: TextStyle(color: palette.textFaint, fontSize: 13)),
                const SizedBox(height: 20),
                for (final s in shops) ...[
                  _ShopTile(shop: s, palette: palette, accent: accent),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ShopTile extends StatelessWidget {
  final LoyaltyBalance shop;
  final AppPalette palette;
  final Color accent;
  const _ShopTile({required this.shop, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => LoyaltyWalletScreen(barbershopId: shop.barbershopId, barbershopName: shop.barbershopName),
        )),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: palette.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: palette.textFaint.withValues(alpha: 0.12)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(Icons.storefront_rounded, color: accent, size: 21),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(shop.barbershopName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text('${shop.points} pontos', style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: palette.textFaint),
            ],
          ),
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  final AppPalette palette;
  final Color accent;
  final VoidCallback onRetry;
  final bool failed;
  const _Empty({required this.palette, required this.accent, required this.onRetry, required this.failed});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 66,
              height: 66,
              decoration: BoxDecoration(shape: BoxShape.circle, color: accent.withValues(alpha: 0.10)),
              child: Icon(failed ? Icons.cloud_off_rounded : Icons.card_giftcard_rounded,
                  color: accent.withValues(alpha: 0.8), size: 30),
            ),
            const SizedBox(height: 16),
            Text(failed ? 'Não consegui carregar' : 'Sua carteira começa no primeiro corte',
                textAlign: TextAlign.center,
                style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 6),
            Text(
              failed
                  ? 'Verifique sua conexão e tente de novo.'
                  : 'Assim que você for atendido, os pontos, selos e prêmios aparecem aqui.',
              textAlign: TextAlign.center,
              style: TextStyle(color: palette.textFaint, fontSize: 13, height: 1.5),
            ),
            if (failed) ...[
              const SizedBox(height: 18),
              FilledButton(
                onPressed: onRetry,
                style: FilledButton.styleFrom(backgroundColor: accent),
                child: const Text('Tentar de novo'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
