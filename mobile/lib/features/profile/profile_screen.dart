import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_controller.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/cortix_date_picker.dart';
import '../auth/session_provider.dart';
import '../barbeiro/barbeiro_copilot_screen.dart';
import 'profile_repository.dart';
import 'push_notification_card.dart';

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
    _birthDate = session?.dateOfBirth;
    _nameController.addListener(_markDirty);
    _phoneController.addListener(_markDirty);
  }

  /// "YYYY-MM-DD" como o servidor devolve. Guardado como String e não DateTime
  /// para ir e voltar da API sem conversão de fuso no meio — data de
  /// nascimento não tem hora, e tratá-la como instante já rendeu bug de
  /// "nasceu um dia antes" em muito sistema.
  String? _birthDate;

  String _formatBirth(String iso) {
    final p = iso.split('-');
    return p.length == 3 ? '${p[2]}/${p[1]}/${p[0]}' : iso;
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final current = _birthDate != null ? DateTime.tryParse(_birthDate!) : null;
    final picked = await showCortixDatePicker(
      context: context,
      initialDate: current ?? DateTime(now.year - 25),
      firstDate: DateTime(now.year - 100),
      lastDate: now,
      title: 'Sua data de nascimento',
    );
    if (picked == null) return;
    setState(() {
      _birthDate = '${picked.year.toString().padLeft(4, '0')}-'
          '${picked.month.toString().padLeft(2, '0')}-'
          '${picked.day.toString().padLeft(2, '0')}';
      _dirty = true;
    });
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
          dateOfBirth: _birthDate,
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
    if (confirmed != true || !mounted) return;

    // O AuthGate troca a tela da RAIZ quando a sessão cai. Só que o gestor
    // chega no Perfil por Navigator.push, então o login aparecia por baixo e
    // a pessoa continuava vendo o Perfil, achando que o "Sair" não funcionou.
    // Pegar o navigator antes do await evita usar o context depois que o
    // widget pode ter sido descartado.
    final navigator = Navigator.of(context);
    await context.read<SessionProvider>().logout();
    navigator.popUntil((route) => route.isFirst);
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
    final roleLabel = session?.isBarber == true
        ? 'Barbeiro'
        : session?.isManager == true
            ? 'Gestor'
            : 'Cliente';

    return Scaffold(
      backgroundColor: palette.bg,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 110),
        children: [
          // ---------- Cabeçalho ----------
          // O nome só existia dentro do campo editável, então a tela abria sem
          // dizer de quem é. Agora ele é o título, como em qualquer perfil.
          // Faixa de cor da marca atrás do topo: dá ao Perfil a mesma
          // identidade das outras telas em vez de abrir num fundo cru.
          Container(
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [accent.withValues(alpha: 0.20), accent.withValues(alpha: 0.04), palette.surface],
                stops: const [0, 0.6, 1],
              ),
              border: Border.all(color: accent.withValues(alpha: 0.18)),
            ),
            child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 16, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Voltar: o Perfil é empurrado por cima do shell (a barra de
                  // abas some enquanto ele está aberto), e sem AppBar não havia
                  // como voltar a não ser pelo gesto de borda — que no PWA
                  // instalado nem sempre existe. Só aparece quando a tela foi
                  // empurrada; onde o Perfil é uma aba fixa, canPop é false.
                  if (Navigator.of(context).canPop())
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _HeaderBackButton(palette: palette),
                    ),
                  Row(
                children: [
                  GestureDetector(
                    onTap: _uploadingAvatar ? null : _pickAvatar,
                    child: Stack(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(2.5),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [accent, accent.withValues(alpha: 0.25)],
                            ),
                          ),
                          child: CircleAvatar(
                            radius: 36,
                            backgroundColor: palette.surfaceAlt,
                            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                            child: avatarUrl == null
                                ? Text(initials,
                                    style: TextStyle(
                                        color: palette.textSecondary, fontSize: 24, fontWeight: FontWeight.w900))
                                : null,
                          ),
                        ),
                        if (_uploadingAvatar)
                          Positioned.fill(
                            child: Container(
                              margin: const EdgeInsets.all(2.5),
                              decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.black54),
                              child: const Center(
                                child: SizedBox(
                                    width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                              ),
                            ),
                          ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: accent,
                              shape: BoxShape.circle,
                              border: Border.all(color: palette.bg, width: 2.5),
                            ),
                            child: Icon(Icons.camera_alt_rounded, size: 12, color: contrastingTextColor(accent)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          session?.name ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: palette.textPrimary,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.7,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: accent.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: accent.withValues(alpha: 0.3)),
                              ),
                              child: Text(roleLabel.toUpperCase(),
                                  style: TextStyle(
                                      color: accent,
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.6)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        Text(
                          session?.email ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: palette.textFaint, fontSize: 12.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
                ],
              ),
            ),
          ),
          ),

          // ---------- Dados ----------
          _GroupLabel('Seus dados', palette: palette),
          _Card(
            palette: palette,
            child: Column(
              children: [
                _FieldRow(
                  label: 'Nome',
                  controller: _nameController,
                  palette: palette,
                  accent: accent,
                ),
                _Divider(palette: palette),
                _FieldRow(
                  label: 'Telefone',
                  controller: _phoneController,
                  hint: '(11) 99999-9999',
                  keyboardType: TextInputType.phone,
                  palette: palette,
                  accent: accent,
                ),
                _Divider(palette: palette),
                // Nascimento é o gancho da campanha de aniversário — a barbearia
                // manda mensagem no dia. Por isso ganha um "por quê" visível em
                // vez de ser mais um campo mudo que ninguém preenche.
                _TapRow(
                  label: 'Nascimento',
                  value: _birthDate != null ? _formatBirth(_birthDate!) : null,
                  placeholder: 'Toque para escolher',
                  icon: Icons.calendar_month_rounded,
                  palette: palette,
                  accent: accent,
                  onTap: _pickBirthDate,
                ),
                _Divider(palette: palette),
                // E-mail não é editável (é a identidade de login), então nem
                // finge ser campo — vira linha de leitura com cadeado.
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 13, 16, 13),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 76,
                        // "Login" e não "E-mail": explica por que está trancado
                        // e evita repetir o rótulo do e-mail já no cabeçalho.
                        child: Text('Login',
                            style: TextStyle(
                                color: palette.textFaint, fontSize: 12.5, fontWeight: FontWeight.w600)),
                      ),
                      Expanded(
                        child: Text(session?.email ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: palette.textSecondary, fontSize: 14)),
                      ),
                      Icon(Icons.lock_outline_rounded, size: 14, color: palette.textFaint),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Botão salvar só aparece quando há o que salvar. Botão desabilitado
          // permanente na tela é peso morto que a pessoa aprende a ignorar.
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            child: _dirty
                ? Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: SizedBox(
                      height: 48,
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _save,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: accent,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: _saving
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: contrastingTextColor(accent)))
                            : Text('Salvar alterações',
                                style: TextStyle(
                                    color: contrastingTextColor(accent),
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14.5)),
                      ),
                    ),
                  )
                : const SizedBox(width: double.infinity),
          ),

          const SizedBox(height: 26),

          // ---------- Aparência ----------
          _GroupLabel('Aparência', palette: palette),
          _Card(
            palette: palette,
            child: const Padding(
              padding: EdgeInsets.all(14),
              child: _ThemeModeSelector(),
            ),
          ),

          // ---------- Notificações no aparelho (Web Push) ----------
          // Traz o próprio rótulo/moldura; some sozinho onde push não existe.
          const PushNotificationCard(),

          if (session?.isBarber == true) ...[
            const SizedBox(height: 26),
            _GroupLabel('Ferramentas', palette: palette),
            _Card(
              palette: palette,
              child: _ActionRow(
                icon: Icons.auto_awesome_rounded,
                label: 'Meu Copiloto',
                sub: 'Seu assistente de atendimento',
                palette: palette,
                accent: accent,
                onTap: () => Navigator.of(context)
                    .push(MaterialPageRoute(builder: (_) => const BarbeiroCopilotScreen())),
              ),
            ),
          ],

          const SizedBox(height: 26),
          _Card(
            palette: palette,
            child: _ActionRow(
              icon: Icons.logout_rounded,
              label: 'Sair da conta',
              palette: palette,
              accent: Colors.redAccent,
              danger: true,
              onTap: _confirmLogout,
            ),
          ),
        ],
      ),
    );
  }

}

/// Botão de voltar do cabeçalho do Perfil. Existe porque a tela é empurrada
/// sem AppBar; devolve o gestor/cliente/barbeiro ao shell com as abas.
class _HeaderBackButton extends StatelessWidget {
  final AppPalette palette;
  const _HeaderBackButton({required this.palette});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.of(context).maybePop(),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 38,
          height: 38,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: palette.surface.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: palette.border),
          ),
          child: Icon(Icons.arrow_back_rounded, size: 20, color: palette.textPrimary),
        ),
      ),
    );
  }
}

/// Rótulo de grupo. Agrupar em blocos com título é o que transforma uma pilha
/// de campos numa tela de ajustes que dá pra escanear.
class _GroupLabel extends StatelessWidget {
  final String text;
  final AppPalette palette;
  const _GroupLabel(this.text, {required this.palette});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 6, bottom: 9),
      child: Text(text,
          style: TextStyle(
            color: palette.textPrimary,
            fontSize: 15,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.2,
          )),
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;
  final AppPalette palette;
  const _Card({required this.child, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: palette.textFaint.withValues(alpha: 0.11)),
      ),
      child: child,
    );
  }
}

class _Divider extends StatelessWidget {
  final AppPalette palette;
  const _Divider({required this.palette});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(left: 16),
        child: Divider(height: 1, thickness: 1, color: palette.textFaint.withValues(alpha: 0.10)),
      );
}

/// Campo em linha (rótulo à esquerda, valor à direita) no lugar de rótulo
/// acima + caixa cheia embaixo. Ocupa metade da altura e alinha tudo numa
/// coluna só — é como iOS e a maioria dos apps de ajustes fazem.
class _FieldRow extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final AppPalette palette;
  final Color accent;

  const _FieldRow({
    required this.label,
    required this.controller,
    required this.palette,
    required this.accent,
    this.hint,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          SizedBox(
            width: 76,
            child: Text(label,
                style: TextStyle(color: palette.textFaint, fontSize: 12.5, fontWeight: FontWeight.w600)),
          ),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: keyboardType,
              textAlign: TextAlign.start,
              style: TextStyle(color: palette.textPrimary, fontSize: 14.5, fontWeight: FontWeight.w600),
              cursorColor: accent,
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: TextStyle(color: palette.textFaint.withValues(alpha: 0.6), fontSize: 14),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 15),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Linha que abre um seletor em vez de aceitar digitação. Mostra o valor
/// quando existe e um convite quando não — campo vazio sem convite é campo
/// que fica vazio para sempre.
class _TapRow extends StatelessWidget {
  final String label;
  final String? value;
  final String placeholder;
  final IconData icon;
  final VoidCallback onTap;
  final AppPalette palette;
  final Color accent;

  const _TapRow({
    required this.label,
    required this.value,
    required this.placeholder,
    required this.icon,
    required this.onTap,
    required this.palette,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final filled = value != null;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            SizedBox(
              width: 76,
              child: Text(label,
                  style: TextStyle(color: palette.textFaint, fontSize: 12.5, fontWeight: FontWeight.w600)),
            ),
            Icon(icon, size: 15, color: filled ? accent : palette.textFaint.withValues(alpha: 0.6)),
            const SizedBox(width: 7),
            Expanded(
              child: Text(
                filled ? value! : placeholder,
                style: TextStyle(
                  color: filled ? palette.textPrimary : palette.textFaint.withValues(alpha: 0.7),
                  fontSize: 14.5,
                  fontWeight: filled ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
            Icon(Icons.chevron_right_rounded, size: 17, color: palette.textFaint),
          ],
        ),
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? sub;
  final VoidCallback onTap;
  final AppPalette palette;
  final Color accent;
  final bool danger;

  const _ActionRow({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.palette,
    required this.accent,
    this.sub,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.13),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, size: 18, color: accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: TextStyle(
                          color: danger ? accent : palette.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 14.5,
                        )),
                    if (sub != null) ...[
                      const SizedBox(height: 2),
                      Text(sub!, style: TextStyle(color: palette.textFaint, fontSize: 12)),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, size: 18, color: palette.textFaint),
            ],
          ),
        ),
      ),
    );
  }
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
