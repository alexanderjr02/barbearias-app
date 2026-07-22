import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import 'barber_repository.dart';

/// The "Finalizar atendimento" flow: the barber captures the finished-cut
/// photo (the "depois" that auto-pairs with the client's reference and lands
/// in their Carteira de Cortes) and records the cut recipe / ficha técnica so
/// the exact same cut can be reproduced next time. One modern screen, one tap
/// to conclude.
class FinalizeAppointmentScreen extends StatefulWidget {
  final String appointmentId;
  final String? clientId;
  final String clientName;
  final String? referencePhoto;
  final String? existingResultPhoto;
  final CutRecipe? existingRecipe;

  const FinalizeAppointmentScreen({
    super.key,
    required this.appointmentId,
    required this.clientName,
    this.clientId,
    this.referencePhoto,
    this.existingResultPhoto,
    this.existingRecipe,
  });

  @override
  State<FinalizeAppointmentScreen> createState() => _FinalizeAppointmentScreenState();
}

class _FinalizeAppointmentScreenState extends State<FinalizeAppointmentScreen> {
  final _repository = BarberRepository();
  final _machine = TextEditingController();
  final _finish = TextEditingController();
  final _products = TextEditingController();
  final _notes = TextEditingController();

  String? _resultPhoto;
  bool _uploading = false;
  bool _saving = false;
  bool _prefilled = false;

  @override
  void initState() {
    super.initState();
    _resultPhoto = widget.existingResultPhoto;
    final r = widget.existingRecipe;
    if (r != null && !r.isEmpty) {
      _machine.text = r.machine ?? '';
      _finish.text = r.finish ?? '';
      _products.text = r.products ?? '';
      _notes.text = r.notes ?? '';
      _prefilled = true;
    } else if (widget.clientId != null) {
      _loadLastRecipe();
    }
  }

  Future<void> _loadLastRecipe() async {
    try {
      final r = await _repository.lastRecipe(widget.clientId!);
      if (r != null && !r.isEmpty && mounted) {
        setState(() {
          if (_machine.text.isEmpty) _machine.text = r.machine ?? '';
          if (_finish.text.isEmpty) _finish.text = r.finish ?? '';
          if (_products.text.isEmpty) _products.text = r.products ?? '';
          if (_notes.text.isEmpty) _notes.text = r.notes ?? '';
          _prefilled = true;
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _machine.dispose();
    _finish.dispose();
    _products.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _capture(ImageSource source) async {
    final file = await ImagePicker().pickImage(source: source, maxWidth: 1400, imageQuality: 88);
    if (file == null || !mounted) return;
    setState(() => _uploading = true);
    try {
      final url = await _repository.uploadImage(file);
      if (mounted) setState(() => _resultPhoto = url);
    } catch (_) {
      if (mounted) AppToast.error(context, 'Falha ao enviar a foto');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _pickSource() {
    final palette = AppPalette.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2))),
            ListTile(
              leading: Icon(Icons.photo_camera_rounded, color: Theme.of(context).colorScheme.primary),
              title: Text('Tirar foto agora', style: TextStyle(color: palette.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _capture(ImageSource.camera);
              },
            ),
            ListTile(
              leading: Icon(Icons.photo_library_rounded, color: Theme.of(context).colorScheme.primary),
              title: Text('Escolher da galeria', style: TextStyle(color: palette.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _capture(ImageSource.gallery);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      await _repository.finalizeAppointment(
        widget.appointmentId,
        resultPhoto: _resultPhoto,
        machine: _machine.text.trim(),
        finish: _finish.text.trim(),
        products: _products.text.trim(),
        notes: _notes.text.trim(),
      );
      if (mounted) {
        AppToast.success(context, 'Atendimento concluído');
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) AppToast.error(context, 'Não foi possível concluir');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);
    final ref = widget.referencePhoto;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Finalizar atendimento', style: TextStyle(fontSize: 16)),
            Text(widget.clientName, style: TextStyle(fontSize: 12, color: palette.textFaint, fontWeight: FontWeight.w400)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          // ---- Antes / Depois ----
          _SectionLabel(icon: Icons.compare_rounded, text: 'Antes e depois', palette: palette, accent: accent),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (ref != null && ref.isNotEmpty) ...[
                Expanded(child: _PhotoTile(label: 'Antes', imageUrl: resolveAssetUrl(ref) ?? ref, palette: palette)),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: _resultPhoto != null
                    ? _PhotoTile(
                        label: 'Depois',
                        imageUrl: resolveAssetUrl(_resultPhoto) ?? _resultPhoto!,
                        palette: palette,
                        accent: accent,
                        onTap: _pickSource,
                      )
                    : _CapturePlaceholder(uploading: _uploading, palette: palette, accent: accent, onTap: _pickSource),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'A foto do resultado vai automaticamente pra Carteira de Cortes do cliente.',
            style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4),
          ),

          const SizedBox(height: 26),

          // ---- Receita do corte ----
          _SectionLabel(icon: Icons.receipt_long_rounded, text: 'Receita do corte', palette: palette, accent: accent),
          const SizedBox(height: 4),
          Text(
            _prefilled
                ? 'Pré-carregada do último corte deste cliente — ajuste se mudou algo.'
                : 'Anote como você fez, pra reproduzir igual na próxima.',
            style: TextStyle(color: palette.textFaint, fontSize: 11.5, height: 1.4),
          ),
          const SizedBox(height: 14),
          _RecipeField(controller: _machine, label: 'Laterais / máquina', hint: 'Ex: 1.5 nas laterais, 2 no meio', icon: Icons.content_cut_rounded, palette: palette, accent: accent),
          _RecipeField(controller: _finish, label: 'Acabamento / topo', hint: 'Ex: tesoura no topo, texturizado', icon: Icons.auto_fix_high_rounded, palette: palette, accent: accent),
          _RecipeField(controller: _products, label: 'Produtos', hint: 'Ex: pomada matte, finalização', icon: Icons.science_rounded, palette: palette, accent: accent),
          _RecipeField(controller: _notes, label: 'Observações', hint: 'Qualquer detalhe importante', icon: Icons.notes_rounded, palette: palette, accent: accent, maxLines: 2),
        ],
      ),
      bottomSheet: Container(
        padding: EdgeInsets.fromLTRB(16, 10, 16, 16 + MediaQuery.of(context).padding.bottom),
        color: palette.bg,
        child: PulseButton(
          onPressed: _saving ? null : _submit,
          gradient: LinearGradient(colors: [Color.lerp(accent, Colors.white, 0.22)!, accent]),
          child: _saving
              ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: onAccent))
              : Text('Concluir atendimento', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold, fontSize: 15.5)),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final IconData icon;
  final String text;
  final AppPalette palette;
  final Color accent;
  const _SectionLabel({required this.icon, required this.text, required this.palette, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 17, color: accent),
        const SizedBox(width: 8),
        Text(text, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
      ],
    );
  }
}

class _PhotoTile extends StatelessWidget {
  final String label;
  final String imageUrl;
  final AppPalette palette;
  final Color? accent;
  final VoidCallback? onTap;
  const _PhotoTile({required this.label, required this.imageUrl, required this.palette, this.accent, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Stack(
              children: [
                Image.network(imageUrl, height: 150, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 150, color: palette.surfaceAlt)),
                Positioned(
                  left: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(20)),
                    child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700)),
                  ),
                ),
                if (onTap != null)
                  Positioned(
                    right: 8,
                    bottom: 8,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: (accent ?? Colors.black).withValues(alpha: 0.85), shape: BoxShape.circle),
                      child: const Icon(Icons.edit_rounded, size: 14, color: Colors.white),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CapturePlaceholder extends StatelessWidget {
  final bool uploading;
  final AppPalette palette;
  final Color accent;
  final VoidCallback onTap;
  const _CapturePlaceholder({required this.uploading, required this.palette, required this.accent, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: uploading ? null : onTap,
      child: Container(
        height: 150,
        decoration: BoxDecoration(
          color: palette.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: accent.withValues(alpha: 0.4), width: 1.4),
        ),
        child: Center(
          child: uploading
              ? CircularProgressIndicator(strokeWidth: 2, color: accent)
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.add_a_photo_rounded, color: accent, size: 26),
                    const SizedBox(height: 8),
                    Text('Foto do\nresultado', textAlign: TextAlign.center, style: TextStyle(color: palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                  ],
                ),
        ),
      ),
    );
  }
}

class _RecipeField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final AppPalette palette;
  final Color accent;
  final int maxLines;
  const _RecipeField({required this.controller, required this.label, required this.hint, required this.icon, required this.palette, required this.accent, this.maxLines = 1});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: palette.textFaint),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(color: palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            maxLines: maxLines,
            style: TextStyle(color: palette.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
              filled: true,
              fillColor: palette.surface,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: accent.withValues(alpha: 0.6))),
            ),
          ),
        ],
      ),
    );
  }
}
