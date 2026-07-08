import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/aurora_background.dart';
import 'session_provider.dart';

enum _RolePick { client, barber, manager }

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  _RolePick _role = _RolePick.client;

  @override
  void dispose() {
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
      body: AuroraBackground(
        accent: const Color(0xFFF59E0B),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  RiseIn(
                    child: Column(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            gradient: const LinearGradient(colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)]),
                            boxShadow: [BoxShadow(color: const Color(0xFFF59E0B).withValues(alpha: 0.4), blurRadius: 30, offset: const Offset(0, 10))],
                          ),
                          child: const Icon(Icons.content_cut_rounded, color: Colors.black, size: 30),
                        ),
                        const SizedBox(height: 18),
                        const Text(
                          'CORTIX',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900, letterSpacing: 4),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'A barbearia do futuro, na palma da mão',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white54, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 30),

                  RiseIn(
                    delay: const Duration(milliseconds: 80),
                    child: GlassPanel(
                      padding: const EdgeInsets.all(20),
                      borderRadius: BorderRadius.circular(28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Entrar como', style: TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                          const SizedBox(height: 10),
                          _RoleSelector(value: _role, onChanged: (r) => setState(() => _role = r)),
                          const SizedBox(height: 20),

                          _SocialButton(
                            label: 'Continuar com Google',
                            icon: Icons.g_mobiledata_rounded,
                            background: Colors.white,
                            foreground: Colors.black87,
                            onTap: () => _comingSoon('Google'),
                          ),
                          const SizedBox(height: 10),
                          _SocialButton(
                            label: 'Continuar com Apple',
                            icon: Icons.apple_rounded,
                            background: Colors.black,
                            foreground: Colors.white,
                            border: Colors.white24,
                            onTap: () => _comingSoon('Apple'),
                          ),

                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Expanded(child: Container(height: 1, color: Colors.white12)),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 10),
                                child: Text('ou entre com e-mail', style: TextStyle(color: Colors.white38, fontSize: 11.5)),
                              ),
                              Expanded(child: Container(height: 1, color: Colors.white12)),
                            ],
                          ),
                          const SizedBox(height: 18),

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
                          if (sessionProvider.error != null) ...[
                            const SizedBox(height: 12),
                            Text(sessionProvider.error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                          ],
                          const SizedBox(height: 22),
                          PulseButton(
                            onPressed: sessionProvider.isBusy ? null : () => _submit(sessionProvider),
                            gradient: const LinearGradient(colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)]),
                            child: sessionProvider.isBusy
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                : const Text('Entrar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 15)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white38),
        prefixIcon: Icon(icon, color: Colors.white38, size: 20),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.05),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Colors.white12)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFF59E0B))),
      );
}

class _RoleSelector extends StatelessWidget {
  final _RolePick value;
  final ValueChanged<_RolePick> onChanged;

  const _RoleSelector({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final options = [
      (_RolePick.client, 'Cliente', Icons.person_outline_rounded),
      (_RolePick.barber, 'Barbeiro', Icons.content_cut_rounded),
      (_RolePick.manager, 'Gestor', Icons.storefront_outlined),
    ];
    return Row(
      children: options.map((o) {
        final selected = value == o.$1;
        return Expanded(
          child: GestureDetector(
            onTap: () => onChanged(o.$1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: selected ? const Color(0xFFF59E0B) : Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Icon(o.$3, size: 18, color: selected ? Colors.black : Colors.white54),
                  const SizedBox(height: 4),
                  Text(o.$2, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? Colors.black : Colors.white54)),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _SocialButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color background;
  final Color foreground;
  final Color? border;
  final VoidCallback onTap;

  const _SocialButton({required this.label, required this.icon, required this.background, required this.foreground, required this.onTap, this.border});

  @override
  Widget build(BuildContext context) {
    return PulseButton(
      onPressed: onTap,
      color: background,
      borderColor: border,
      height: 48,
      borderRadius: BorderRadius.circular(14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: foreground, size: 22),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(color: foreground, fontWeight: FontWeight.w600, fontSize: 14)),
        ],
      ),
    );
  }
}
