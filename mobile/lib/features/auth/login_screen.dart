import 'dart:ui' as ui;
import '../../core/brand/brand_slug.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/social_sign_in_button.dart';
import 'auth_repository.dart';
import 'google_auth_service.dart';
import 'register_client_screen.dart';
import 'session_provider.dart';

const _bg = Color(0xFF0B0A0F);
const _amber = Color(0xFFF59E0B);
const _amberLight = Color(0xFFFBBF24);

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authRepository = AuthRepository();
  bool _obscure = true;

  // Brand appearance (white-label): fetched from the barbershop configured via
  // the BRAND_SLUG dart-define. Falls back to the default CORTIX look.
  Color _accent = _amber;
  Color _accentLight = _amberLight;
  String _brandName = 'CORTIX';
  String? _tagline;
  String? _logoUrl;
  String? _coverUrl;
  String _bgType = 'gradient';
  double _bgDim = 0.35;
  double _bgBlur = 0;
  bool _bgGradient = true;
  String _bgEffect = 'none';
  VideoPlayerController? _videoController;
  late final AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(seconds: 16));
    _loadBrand();
  }

  void _configureAnim() {
    _anim.stop();
    if (_bgEffect == 'zoom') {
      _anim.duration = const Duration(seconds: 16);
      _anim.repeat(reverse: true);
    } else if (_bgEffect == 'pulse') {
      _anim.duration = const Duration(milliseconds: 3500);
      _anim.repeat(reverse: true);
    } else {
      _anim.value = 0;
    }
  }

  Future<void> _loadBrand() async {
    final slug = await resolveBrandSlug();
    if (slug == null || slug.isEmpty) return;
    try {
      final data = await ApiClient.instance.get('/barbershop', query: {'slug': slug}) as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        final c = _parseHex(data['primaryColor'] as String?);
        if (c != null) {
          _accent = c;
          _accentLight = Color.lerp(c, Colors.white, 0.22) ?? c;
        }
        final n = (data['name'] as String?)?.trim();
        if (n != null && n.isNotEmpty) _brandName = n;
        _tagline = data['appTagline'] as String?;
        _logoUrl = _abs(data['logo'] as String?);
        _coverUrl = _abs(data['coverImage'] as String?);
        _bgType = (data['bgType'] as String?) ?? 'gradient';
        _bgDim = ((data['bgDim'] as num?)?.toDouble() ?? 35) / 100;
        _bgBlur = (data['bgBlur'] as num?)?.toDouble() ?? 0;
        _bgGradient = (data['bgGradient'] as bool?) ?? true;
        _bgEffect = (data['bgEffect'] as String?) ?? 'none';
      });
      _configureAnim();
      final videoUrl = _abs(data['bgVideo'] as String?);
      if (_bgType == 'video' && videoUrl != null && videoUrl.isNotEmpty) {
        final ctrl = VideoPlayerController.networkUrl(Uri.parse(videoUrl))
          ..setLooping(true)
          ..setVolume(0);
        _videoController = ctrl;
        ctrl.initialize().then((_) {
          if (!mounted) return;
          setState(() {});
          ctrl.play();
        }).catchError((_) {});
      }
    } catch (_) {
      // keep the default look on any failure
    }
  }

  // Image URLs come back relative (e.g. "/uploads/x.jpg"); the app needs the
  // full host to load them.
  String? _abs(String? url) {
    // String vazia = SEM asset → null, não "". Antes retornava "", e o login
    // tentava carregar NetworkImage("") — o tile ficava só com a cor, sem a
    // tesoura de fallback. É o bug de "removi a logo e sumiu tudo".
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('http')) return url;
    const base = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    final origin = base.contains('/api') ? base.substring(0, base.indexOf('/api')) : base;
    return '$origin$url';
  }

  Color? _parseHex(String? hex) {
    if (hex == null) return null;
    var h = hex.replaceAll('#', '').trim();
    if (h.length == 6) h = 'FF$h';
    final v = int.tryParse(h, radix: 16);
    return v == null ? null : Color(v);
  }

  Widget _buildBackground() {
    final showImage = _bgType == 'image' && _coverUrl != null && _coverUrl!.isNotEmpty;
    final showVideo = _bgType == 'video' && _videoController != null && _videoController!.value.isInitialized;
    final hasMedia = showImage || showVideo;

    Widget media;
    if (showVideo) {
      final v = _videoController!;
      media = FittedBox(
        fit: BoxFit.cover,
        child: SizedBox(width: v.value.size.width, height: v.value.size.height, child: VideoPlayer(v)),
      );
    } else if (showImage) {
      Widget img = Image.network(_coverUrl!, fit: BoxFit.cover, width: double.infinity, height: double.infinity);
      if (_bgBlur > 0) img = ImageFiltered(imageFilter: ui.ImageFilter.blur(sigmaX: _bgBlur, sigmaY: _bgBlur), child: img);
      media = img;
    } else {
      media = DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(center: const Alignment(0, -0.8), radius: 1.1, colors: [_accent.withValues(alpha: 0.22), _bg], stops: const [0, 0.6]),
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        AnimatedBuilder(
          animation: _anim,
          builder: (_, child) {
            final scale = _bgEffect == 'zoom' ? 1.06 + 0.16 * _anim.value : (hasMedia ? 1.08 : 1.0);
            return Transform.scale(scale: scale, child: child);
          },
          child: media,
        ),
        if (hasMedia && _bgDim > 0) Container(color: Colors.black.withValues(alpha: _bgDim.clamp(0, 0.85))),
        if (_bgGradient)
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.center, colors: [_bg, _bg.withValues(alpha: 0)]),
            ),
          ),
        Align(
          alignment: const Alignment(0, -0.95),
          child: AnimatedBuilder(
            animation: _anim,
            builder: (_, __) {
              final op = _bgEffect == 'pulse' ? 0.35 + 0.55 * _anim.value : 0.26;
              return Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [_accent.withValues(alpha: op), _accent.withValues(alpha: 0)])),
              );
            },
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _anim.dispose();
    _videoController?.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit(SessionProvider sessionProvider) async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) return;
    await sessionProvider.login(email, password);
  }

  Future<void> _handleGoogleSignIn(SessionProvider sessionProvider) async {
    try {
      final idToken = await GoogleAuthService.signInAndGetIdToken();
      if (idToken == null || !mounted) return; // user cancelled
      await sessionProvider.loginWithGoogle(idToken);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF18181F),
          content: Text(e.toString(), style: const TextStyle(color: Colors.white)),
        ),
      );
    }
  }

  Future<void> _showForgotPassword() async {
    final emailCtrl = TextEditingController(text: _emailController.text.trim());
    var sending = false;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF121216),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Redefinir senha', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Informe seu e-mail e enviaremos um link para você criar uma nova senha.',
                style: TextStyle(color: Colors.white54, fontSize: 13),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: emailCtrl,
                keyboardType: TextInputType.emailAddress,
                autofocus: true,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration('E-mail', Icons.mail_outline_rounded),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: sending ? null : () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancelar', style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              onPressed: sending
                  ? null
                  : () async {
                      final email = emailCtrl.text.trim();
                      if (!email.contains('@')) return;
                      final navigator = Navigator.of(dialogContext);
                      final messenger = ScaffoldMessenger.of(context);
                      setDialogState(() => sending = true);
                      try {
                        await _authRepository.requestPasswordReset(email);
                      } catch (_) {
                        // Endpoint always succeeds server-side; ignore network hiccups.
                      }
                      navigator.pop();
                      messenger.showSnackBar(
                        const SnackBar(
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: Color(0xFF18181F),
                          content: Text(
                            'Se houver uma conta com esse e-mail, enviamos um link de redefinição.',
                            style: TextStyle(color: Colors.white),
                          ),
                        ),
                      );
                    },
              style: ElevatedButton.styleFrom(backgroundColor: _amber),
              child: sending
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                  : const Text('Enviar link', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _comingSoon(String provider) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF18181F),
        content: Text('Login com $provider chega em breve. Use e-mail e senha por enquanto.', style: const TextStyle(color: Colors.white)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionProvider = context.watch<SessionProvider>();

    return Scaffold(
      backgroundColor: _bg,
      body: Stack(
        children: [
          Positioned.fill(child: _buildBackground()),
          SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(28, MediaQuery.of(context).size.height * 0.06, 28, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Brand
                          RiseIn(
                            child: Column(
                              children: [
                                Container(
                                  width: 64,
                                  height: 64,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(18),
                                    gradient: _logoUrl == null ? LinearGradient(colors: [_accentLight, _accent]) : null,
                                    image: _logoUrl != null ? DecorationImage(image: NetworkImage(_logoUrl!), fit: BoxFit.cover) : null,
                                    boxShadow: [BoxShadow(color: _accent.withValues(alpha: 0.4), blurRadius: 28, offset: const Offset(0, 10))],
                                  ),
                                  child: _logoUrl == null ? const Icon(Icons.content_cut_rounded, color: Colors.black, size: 28) : null,
                                ),
                                const SizedBox(height: 22),
                                const Text('Bem-vindo de volta', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
                                const SizedBox(height: 6),
                                Text(_tagline ?? 'Entre na sua conta $_brandName', style: const TextStyle(color: Colors.white54, fontSize: 14), textAlign: TextAlign.center),
                              ],
                            ),
                          ),

                          const SizedBox(height: 40),

                          RiseIn(
                            delay: const Duration(milliseconds: 80),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                SocialSignInButton(
                                  label: 'Continuar com Google',
                                  icon: Icons.g_mobiledata_rounded,
                                  background: Colors.white,
                                  foreground: Colors.black87,
                                  onTap: () => _handleGoogleSignIn(sessionProvider),
                                ),
                                const SizedBox(height: 10),
                                SocialSignInButton(
                                  label: 'Continuar com Apple',
                                  icon: Icons.apple_rounded,
                                  background: const Color(0xFF17161C),
                                  foreground: Colors.white,
                                  border: Colors.white12,
                                  onTap: () => _comingSoon('Apple'),
                                ),

                                const SizedBox(height: 24),
                                Row(
                                  children: [
                                    Expanded(child: Container(height: 1, color: Colors.white10)),
                                    const Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 12),
                                      child: Text('ou', style: TextStyle(color: Colors.white38, fontSize: 12)),
                                    ),
                                    Expanded(child: Container(height: 1, color: Colors.white10)),
                                  ],
                                ),
                                const SizedBox(height: 24),

                                TextField(
                                  controller: _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: _inputDecoration('E-mail', Icons.mail_outline_rounded),
                                ),
                                const SizedBox(height: 12),
                                TextField(
                                  controller: _passwordController,
                                  obscureText: _obscure,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: _inputDecoration('Senha', Icons.lock_outline_rounded).copyWith(
                                    suffixIcon: IconButton(
                                      icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, color: Colors.white38, size: 20),
                                      onPressed: () => setState(() => _obscure = !_obscure),
                                    ),
                                  ),
                                  onSubmitted: (_) => _submit(sessionProvider),
                                ),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: _showForgotPassword,
                                    style: TextButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 6),
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text('Esqueceu a senha?', style: TextStyle(color: _accent, fontSize: 12.5)),
                                  ),
                                ),
                                if (sessionProvider.error != null) ...[
                                  const SizedBox(height: 10),
                                  Text(sessionProvider.error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                                ],
                                const SizedBox(height: 18),
                                PulseButton(
                                  onPressed: sessionProvider.isBusy ? null : () => _submit(sessionProvider),
                                  gradient: LinearGradient(colors: [_accentLight, _accent]),
                                  child: sessionProvider.isBusy
                                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                      : const Text('Entrar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 15)),
                                ),
                              ],
                            ),
                          ),

                  const SizedBox(height: 36),

                  Center(
                    child: TextButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const RegisterClientScreen()),
                      ),
                      child: RichText(
                        text: TextSpan(
                          style: const TextStyle(color: Colors.white54, fontSize: 13),
                          children: [
                            const TextSpan(text: 'Novo por aqui? '),
                            TextSpan(text: 'Criar conta', style: TextStyle(color: _accent, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white38),
        prefixIcon: Icon(icon, color: Colors.white38, size: 20),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.04),
        contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: _accent, width: 1.5)),
      );
}
