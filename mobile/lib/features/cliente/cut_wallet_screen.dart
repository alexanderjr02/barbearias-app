import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/skeleton.dart';
import 'client_repository.dart';
import 'new_appointment_screen.dart';

class CutWalletScreen extends StatefulWidget {
  const CutWalletScreen({super.key});

  @override
  State<CutWalletScreen> createState() => _CutWalletScreenState();
}

class _CutWalletScreenState extends State<CutWalletScreen> {
  final _repository = ClientRepository();
  late Future<List<CutPhoto>> _future;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _future = _repository.cuts();
  }

  void _refresh() => setState(() => _future = _repository.cuts());

  Future<void> _add() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1400, imageQuality: 88);
    if (file == null || !mounted) return;
    setState(() => _busy = true);
    try {
      final url = await _repository.uploadImage(file);
      final note = await _askNote();
      await _repository.addCut(imageUrl: url, note: note);
      _refresh();
      if (mounted) AppToast.success(context, 'Corte adicionado à carteira');
    } catch (e) {
      if (mounted) AppToast.error(context, 'Falha ao adicionar');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _askNote() async {
    final ctrl = TextEditingController();
    final palette = AppPalette.of(context);
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: palette.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Anotação (opcional)', style: TextStyle(color: palette.textPrimary, fontSize: 16, fontWeight: FontWeight.w800)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          style: TextStyle(color: palette.textPrimary),
          decoration: InputDecoration(
            hintText: 'Ex: degradê na máquina 2, topo texturizado',
            hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
            filled: true,
            fillColor: palette.surfaceAlt,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(''), child: const Text('Pular')),
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(ctrl.text.trim()), child: const Text('Salvar')),
        ],
      ),
    );
  }

  Future<void> _share(CutPhoto cut) async {
    try {
      final url = resolveAssetUrl(cut.imageUrl) ?? cut.imageUrl;
      final bytes = await _repository.downloadBytes(url);
      await SharePlus.instance.share(ShareParams(
        files: [XFile.fromData(bytes, mimeType: 'image/jpeg', name: 'meu-corte.jpg')],
        text: 'Corte novo!',
      ));
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível compartilhar');
    }
  }

  void _openCut(CutPhoto cut, Color accent) {
    final palette = AppPalette.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Container(
        decoration: BoxDecoration(color: palette.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(resolveAssetUrl(cut.imageUrl) ?? cut.imageUrl, fit: BoxFit.cover, height: 320, width: double.infinity),
            ),
            if (cut.note != null && cut.note!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(12)),
                child: Text(cut.note!, style: TextStyle(color: palette.textSecondary, fontSize: 13)),
              ),
            ],
            const SizedBox(height: 14),
            PulseButton(
              onPressed: () {
                Navigator.of(sheetContext).pop();
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => NewAppointmentScreen(referencePhoto: cut.imageUrl)));
              },
              gradient: LinearGradient(colors: [Color.lerp(accent, Colors.white, 0.22)!, accent]),
              child: Text('Quero esse de novo', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold, fontSize: 15)),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.of(sheetContext).pop();
                _share(cut);
              },
              icon: const Icon(Icons.ios_share_rounded, size: 18),
              label: const Text('Compartilhar'),
              style: OutlinedButton.styleFrom(foregroundColor: accent, side: BorderSide(color: palette.border), minimumSize: const Size(double.infinity, 44)),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () async {
                Navigator.of(sheetContext).pop();
                try {
                  await _repository.deleteCut(cut.id);
                  _refresh();
                } catch (_) {}
              },
              child: const Text('Excluir', style: TextStyle(color: Colors.redAccent)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        title: const Text('Carteira de Cortes'),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _busy ? null : _add,
            tooltip: 'Adicionar corte',
            icon: _busy
                ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: accent))
                : Icon(Icons.add_a_photo_rounded, color: accent),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<CutPhoto>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return GridView.count(
                crossAxisCount: 2,
                padding: const EdgeInsets.all(16),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.82,
                children: List.generate(4, (_) => const SkeletonBox(height: 180, borderRadius: 16)),
              );
            }
            if (snapshot.hasError) {
              return ListView(children: [const SizedBox(height: 80), Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent)))]);
            }
            final cuts = snapshot.data ?? [];
            if (cuts.isEmpty) {
              return ListView(
                padding: const EdgeInsets.fromLTRB(28, 90, 28, 24),
                children: [
                  Icon(Icons.content_cut_rounded, size: 46, color: palette.textFaint),
                  const SizedBox(height: 16),
                  Center(child: Text('Sua carteira de cortes', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 18))),
                  const SizedBox(height: 8),
                  Text(
                    'Guarde aqui as fotos dos seus cortes favoritos. Na próxima visita, é só mostrar "quero esse de novo" pro barbeiro — sem precisar explicar.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: palette.textFaint, fontSize: 13.5, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  PulseButton(
                    onPressed: _busy ? null : _add,
                    gradient: LinearGradient(colors: [Color.lerp(accent, Colors.white, 0.22)!, accent]),
                    child: Text('Adicionar meu primeiro corte', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ],
              );
            }
            return GridView.count(
              crossAxisCount: 2,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.82,
              children: [
                for (var i = 0; i < cuts.length; i++)
                  RiseIn(
                    delay: Duration(milliseconds: 20 * i),
                    child: GestureDetector(
                      onTap: () => _openCut(cuts[i], accent),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.network(resolveAssetUrl(cuts[i].imageUrl) ?? cuts[i].imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: palette.surface)),
                            if (cuts[i].note != null && cuts[i].note!.isNotEmpty)
                              Positioned(
                                left: 0,
                                right: 0,
                                bottom: 0,
                                child: Container(
                                  padding: const EdgeInsets.fromLTRB(10, 16, 10, 8),
                                  decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Colors.black87, Colors.transparent])),
                                  child: Text(cuts[i].note!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 11.5)),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
