import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/aurora_background.dart';
import '../../core/widgets/br_phone_formatter.dart';
import '../../core/widgets/social_sign_in_button.dart';
import 'google_auth_service.dart';
import 'session_provider.dart';

class RegisterClientScreen extends StatefulWidget {
  const RegisterClientScreen({super.key});

  @override
  State<RegisterClientScreen> createState() => _RegisterClientScreenState();
}

class _RegisterClientScreenState extends State<RegisterClientScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  DateTime? _dateOfBirth;
  bool _obscure = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 20, now.month, now.day),
      firstDate: DateTime(now.year - 120),
      lastDate: now,
      helpText: 'Data de nascimento',
    );
    if (picked != null) setState(() => _dateOfBirth = picked);
  }

  Future<void> _submit(SessionProvider sessionProvider) async {
    if (!_formKey.currentState!.validate()) return;
    if (_dateOfBirth == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(behavior: SnackBarBehavior.floating, backgroundColor: Color(0xFF18181F), content: Text('Informe sua data de nascimento', style: TextStyle(color: Colors.white))),
      );
      return;
    }
    final dob = _dateOfBirth!;
    final dobKey = '${dob.year.toString().padLeft(4, '0')}-${dob.month.toString().padLeft(2, '0')}-${dob.day.toString().padLeft(2, '0')}';
    final ok = await sessionProvider.registerClient(
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
      phone: _phoneController.text,
      dateOfBirth: dobKey,
    );
    if (ok && mounted) Navigator.of(context).pop();
  }

  Future<void> _handleGoogleSignIn(SessionProvider sessionProvider) async {
    try {
      final idToken = await GoogleAuthService.signInAndGetIdToken();
      if (idToken == null || !mounted) return;
      final ok = await sessionProvider.loginWithGoogle(idToken);
      if (ok && mounted) Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(behavior: SnackBarBehavior.floating, backgroundColor: const Color(0xFF18181F), content: Text(e.toString(), style: const TextStyle(color: Colors.white))),
      );
    }
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
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white70),
                      ),
                    ],
                  ),
                  RiseIn(
                    child: Column(
                      children: [
                        const Text(
                          'Criar conta',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: 1),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Agende horários, acompanhe seu histórico e seus pontos de fidelidade',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white54, fontSize: 12.5),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  RiseIn(
                    delay: const Duration(milliseconds: 80),
                    child: GlassPanel(
                      padding: const EdgeInsets.all(20),
                      borderRadius: BorderRadius.circular(28),
                      child: Form(
                        key: _formKey,
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
                            const SizedBox(height: 20),
                            Row(
                              children: [
                                Expanded(child: Container(height: 1, color: Colors.white12)),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 10),
                                  child: Text('ou preencha seus dados', style: TextStyle(color: Colors.white38, fontSize: 11.5)),
                                ),
                                Expanded(child: Container(height: 1, color: Colors.white12)),
                              ],
                            ),
                            const SizedBox(height: 18),

                            TextFormField(
                              controller: _nameController,
                              style: const TextStyle(color: Colors.white),
                              decoration: _inputDecoration('Nome completo', Icons.person_outline_rounded),
                              validator: (v) => (v == null || v.trim().length < 2) ? 'Nome muito curto' : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              style: const TextStyle(color: Colors.white),
                              decoration: _inputDecoration('E-mail', Icons.mail_outline_rounded),
                              validator: (v) => (v == null || !v.contains('@')) ? 'E-mail inválido' : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              inputFormatters: [BrPhoneFormatter()],
                              style: const TextStyle(color: Colors.white),
                              decoration: _inputDecoration('WhatsApp', Icons.phone_outlined),
                              validator: (v) => (v == null || v.replaceAll(RegExp(r'\D'), '').length < 10) ? 'Telefone inválido' : null,
                            ),
                            const SizedBox(height: 12),
                            InkWell(
                              onTap: _pickDateOfBirth,
                              borderRadius: BorderRadius.circular(14),
                              child: InputDecorator(
                                decoration: _inputDecoration('Data de nascimento', Icons.cake_outlined),
                                child: Text(
                                  _dateOfBirth == null
                                      ? 'Selecionar'
                                      : '${_dateOfBirth!.day.toString().padLeft(2, '0')}/${_dateOfBirth!.month.toString().padLeft(2, '0')}/${_dateOfBirth!.year}',
                                  style: TextStyle(color: _dateOfBirth == null ? Colors.white38 : Colors.white),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscure,
                              style: const TextStyle(color: Colors.white),
                              decoration: _inputDecoration('Senha', Icons.lock_outline_rounded).copyWith(
                                suffixIcon: IconButton(
                                  icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, color: Colors.white38, size: 20),
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                ),
                              ),
                              validator: (v) {
                                if (v == null || v.length < 8) return 'Mínimo 8 caracteres';
                                if (!RegExp(r'[a-zA-Z]').hasMatch(v) || !RegExp(r'[0-9]').hasMatch(v)) return 'Use letras e números';
                                return null;
                              },
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
                                  : const Text('Criar minha conta', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 15)),
                            ),
                          ],
                        ),
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
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Colors.redAccent)),
      );
}
