import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_controller.dart';
import '../../core/widgets/app_toast.dart';
import '../auth/session_provider.dart';
import '../barbeiro/barbeiro_copilot_screen.dart';
import '../cliente/client_preferences_screen.dart';
import 'profile_repository.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _repository = ProfileRepository();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _saving = false;
  bool _uploadingAvatar = false;
  bool _dirty = false;

  @override
  void initState() {
    super.initState();
    final session = context.read<SessionProvider>().session;
    _nameController.text = session?.name ?? '';
    _phoneController.text = session?.phone ?? '';
    _nameController.addListener(_markDirty);
    _phoneController.addListener(_markDirty);
  }

  void _markDirty() {
    if (!_dirty) setState(() => _dirty = true);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, maxWidth: 800, imageQuality: 85);
    if (file == null) return;
    setState(() => _uploadingAvatar = true);
    try {
      final url = await _repository.uploadAvatar(file);
      if (!mounted) return;
      final ok = await context.read<SessionProvider>().updateProfile(avatar: url);
      if (!ok && mounted) {
        AppToast.error(context, 'Não foi possível salvar a foto.');
      }
    } catch (_) {
      if (mounted) {
        AppToast.error(context, 'Falha ao enviar a foto.');
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final ok = await context.read<SessionProvider>().updateProfile(
          name: _nameController.text.trim(),
          phone: _phoneController.text.trim(),
        );
    if (mounted) {
      setState(() {
        _saving = false;
        if (ok) _dirty = false;
      });
      if (ok) {
        AppToast.success(context, 'Perfil atualizado.');
      } else {
        AppToast.error(context, 'Não foi possível salvar. Tente novamente.');
      }
    }
  }

  Future<void> _confirmLogout() async {
    final palette = AppPalette.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: palette.surface,
        title: Text('Sair da conta', style: TextStyle(color: palette.textPrimary)),
        content: Text('Tem certeza que deseja sair?', style: TextStyle(color: palette.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sair', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await context.read<SessionProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>().session;
    final avatarUrl = resolveAssetUrl(session?.avatar);
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final initials = (session?.name.trim().isNotEmpty ?? false)
        ? session!.name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase()
        : '?';

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
        children: [
          Center(
            child: GestureDetector(
              onTap: _uploadingAvatar ? null : _pickAvatar,
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: palette.surfaceAlt,
                    backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                    child: avatarUrl == null
                        ? Text(initials, style: TextStyle(color: palette.textSecondary, fontSize: 28, fontWeight: FontWeight.bold))
                        : null,
                  ),
                  if (_uploadingAvatar)
                    Positioned.fill(
                      child: CircleAvatar(
                        backgroundColor: Colors.black54,
                        child: const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
                      ),
                    ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: accent,
                        shape: BoxShape.circle,
                        border: Border.all(color: palette.bg, width: 2),
                      ),
                      child: Icon(Icons.camera_alt, size: 14, color: contrastingTextColor(accent)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              session?.isBarber == true
                  ? 'Barbeiro'
                  : session?.isManager == true
                      ? 'Gestor'
                      : 'Cliente',
              style: TextStyle(color: palette.textFaint, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 28),

          Text('Aparência', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const _ThemeModeSelector(),
          const SizedBox(height: 28),

          Text('Nome', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          TextField(controller: _nameController, style: TextStyle(color: palette.textPrimary), decoration: _inputDecoration(palette)),
          const SizedBox(height: 18),
          Text('Telefone', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            style: TextStyle(color: palette.textPrimary),
            decoration: _inputDecoration(palette, hint: '(11) 99999-9999'),
          ),
          const SizedBox(height: 18),
          Text('E-mail', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
            child: Text(session?.email ?? '', style: TextStyle(color: palette.textFaint)),
          ),
          const SizedBox(height: 28),
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _dirty && !_saving ? _save : null,
              style: ElevatedButton.styleFrom(backgroundColor: accent),
              child: _saving
                  ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                  : Text('Salvar alterações', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
            ),
          ),
          if (session?.isClient == true) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ClientPreferencesScreen())),
                style: OutlinedButton.styleFrom(foregroundColor: accent, side: BorderSide(color: palette.border)),
                icon: const Icon(Icons.tune_rounded),
                label: const Text('Minhas preferências'),
              ),
            ),
          ],
          if (session?.isBarber == true) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BarbeiroCopilotScreen())),
                style: OutlinedButton.styleFrom(foregroundColor: accent, side: BorderSide(color: palette.border)),
                icon: const Icon(Icons.auto_awesome_rounded),
                label: const Text('Meu Copiloto'),
              ),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            height: 48,
            child: OutlinedButton.icon(
              onPressed: _confirmLogout,
              style: OutlinedButton.styleFrom(foregroundColor: Colors.redAccent, side: const BorderSide(color: Colors.redAccent)),
              icon: const Icon(Icons.logout),
              label: const Text('Sair da conta'),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(AppPalette palette, {String? hint}) => InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: palette.textFaint),
        filled: true,
        fillColor: palette.surfaceAlt,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      );
}

/// Simple 3-way appearance toggle — the same pattern most mainstream apps
/// use in Settings, rather than a bare on/off switch that can't express
/// "follow the system".
class _ThemeModeSelector extends StatelessWidget {
  const _ThemeModeSelector();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ThemeController>();
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final options = [
      (ThemeMode.light, 'Claro', Icons.light_mode_rounded),
      (ThemeMode.dark, 'Escuro', Icons.dark_mode_rounded),
      (ThemeMode.system, 'Sistema', Icons.smartphone_rounded),
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: options.map((o) {
          final selected = controller.mode == o.$1;
          return Expanded(
            child: GestureDetector(
              onTap: () => context.read<ThemeController>().setMode(o.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: selected ? accent : Colors.transparent,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Column(
                  children: [
                    Icon(o.$3, size: 18, color: selected ? contrastingTextColor(accent) : palette.textSecondary),
                    const SizedBox(height: 3),
                    Text(o.$2, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? contrastingTextColor(accent) : palette.textSecondary)),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
