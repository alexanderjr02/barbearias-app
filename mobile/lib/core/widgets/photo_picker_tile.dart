import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';
import 'app_toast.dart';

/// Square tap-to-upload photo tile shared by every Gestor create/edit form
/// (services, products, staff) — picks an image, uploads it through
/// [upload], and reports back the URL the backend returned.
class PhotoPickerTile extends StatefulWidget {
  final String? imageUrl;
  final ValueChanged<String?> onChanged;
  final Future<String> Function(XFile file) upload;
  final IconData placeholderIcon;

  const PhotoPickerTile({
    super.key,
    required this.imageUrl,
    required this.onChanged,
    required this.upload,
    this.placeholderIcon = Icons.image_outlined,
  });

  @override
  State<PhotoPickerTile> createState() => _PhotoPickerTileState();
}

class _PhotoPickerTileState extends State<PhotoPickerTile> {
  bool _uploading = false;

  Future<void> _pick() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, maxWidth: 900, imageQuality: 85);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final url = await widget.upload(file);
      widget.onChanged(url);
    } catch (_) {
      if (mounted) {
        AppToast.error(context, 'Falha ao enviar a foto.');
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final resolved = resolveAssetUrl(widget.imageUrl);
    return GestureDetector(
      onTap: _uploading ? null : _pick,
      child: Container(
        width: 84,
        height: 84,
        decoration: BoxDecoration(
          color: palette.surfaceAlt,
          borderRadius: BorderRadius.circular(16),
          image: resolved != null ? DecorationImage(image: NetworkImage(resolved), fit: BoxFit.cover) : null,
        ),
        child: _uploading
            ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
            : resolved == null
                ? Icon(widget.placeholderIcon, color: palette.textFaint, size: 26)
                : Align(
                    alignment: Alignment.bottomRight,
                    child: Container(
                      margin: const EdgeInsets.all(4),
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                      child: const Icon(Icons.edit, size: 12, color: Colors.white),
                    ),
                  ),
      ),
    );
  }
}
