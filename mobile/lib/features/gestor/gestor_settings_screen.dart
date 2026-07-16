import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/photo_picker_tile.dart';
import 'brand_controller.dart';
import 'gestor_repository.dart';

const _weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const _swatches = [0xFFD4AF37, 0xFFF59E0B, 0xFFEF4444, 0xFF3B82F6, 0xFF10B981, 0xFF8B5CF6, 0xFFEC4899, 0xFF000000];

const _planInfo = {
  'FREE': ('Essencial', 'R\$ 79/mês', Color(0xFF9CA3AF), 'Agendamentos ilimitados · até 3 barbeiros'),
  'PRO': ('Pro', 'R\$ 149/mês', Color(0xFFF59E0B), 'Ilimitado · Copiloto com IA, financeiro e assinatura'),
  'ENTERPRISE': ('White Label', 'R\$ 399/mês', Color(0xFFA78BFA), 'App próprio, NF-e e multi-unidade'),
};

const _proFeatures = [
  'Agendamentos e barbeiros ilimitados',
  'Financeiro completo (meta e comissões)',
  'Relatórios avançados',
  'Controle de estoque',
  'Fidelidade (pontos/cashback)',
  'Clube de assinatura',
  'Chatbot com IA',
  'Lembrete no WhatsApp',
];

const _enterpriseExtras = [
  'App próprio com a sua marca',
  'App instalável (link vira app)',
  'Nota fiscal (NFS-e)',
];

const _featuresByPlan = {
  'FREE': <String>[],
  'PRO': _proFeatures,
  'ENTERPRISE': [..._proFeatures, ..._enterpriseExtras],
};

const _allFeatureLabels = [..._proFeatures, ..._enterpriseExtras];

class GestorSettingsScreen extends StatefulWidget {
  const GestorSettingsScreen({super.key});

  @override
  State<GestorSettingsScreen> createState() => _GestorSettingsScreenState();
}

class _GestorSettingsScreenState extends State<GestorSettingsScreen> with SingleTickerProviderStateMixin {
  final _repository = GestorRepository();
  late final TabController _tab;

  bool _loading = true;
  String? _loadError;

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _instaCtrl = TextEditingController();
  final _pixCtrl = TextEditingController();
  final _faqCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  Color _color = const Color(0xFFD4AF37);
  List<WorkingHour> _hours = [];
  String _plan = 'FREE';
  String? _logo;
  String? _coverImage;

  bool _savingProfile = false;
  bool _savedProfile = false;
  bool _savingColor = false;
  bool _savedColor = false;
  bool _savingHours = false;
  bool _savedHours = false;
  bool _savingPlan = false;

  final _notifications = [
    ('Lembrete de agendamento (24h antes)', 'Envia mensagem automática para o cliente', true),
    ('Lembrete de agendamento (2h antes)', 'Segundo lembrete antes do horário', true),
    ('Confirmação de agendamento', 'Confirma quando o agendamento é feito', true),
    ('Aviso de cancelamento', 'Notifica quando um cliente cancela', false),
    ('Relatório diário', 'Resumo do dia no final do expediente', true),
  ].map((e) => _NotificationSetting(e.$1, e.$2, e.$3)).toList();

  Map<String, dynamic> _chatbot = {
    'enabled': true,
    'name': 'Assistente',
    'welcomeMessage': 'Olá! 👋 Como posso te ajudar hoje?',
    'address': '',
    'hours': '',
    'whatsapp': {'enabled': false, 'phone': '', 'autoFrom': '09:00', 'autoTo': '18:00', 'token': ''},
    'faqItems': <Map<String, String>>[],
  };
  bool _chatbotLoaded = false;
  bool _chatbotSaved = false;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 6, vsync: this);
    _load();
    _loadChatbot();
  }

  @override
  void dispose() {
    _tab.dispose();
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _instaCtrl.dispose();
    _pixCtrl.dispose();
    _faqCtrl.dispose();
    _cityCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<XFile?> _pickImage() => ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600, imageQuality: 85);

  Color _parseHex(String hex) {
    final cleaned = hex.replaceAll('#', '');
    return Color(0xFF000000 | (int.tryParse(cleaned, radix: 16) ?? 0xD4AF37));
  }

  String _toHex(Color c) => '#${(c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase()}';

  Future<void> _load() async {
    try {
      final p = await _repository.barbershop();
      _nameCtrl.text = p.name;
      _phoneCtrl.text = p.phone ?? '';
      _emailCtrl.text = p.email ?? '';
      _instaCtrl.text = p.instagram ?? '';
      _pixCtrl.text = p.pixKey ?? '';
      _faqCtrl.text = p.faqText ?? '';
      _cityCtrl.text = p.city ?? '';
      _descCtrl.text = p.description ?? '';
      _color = _parseHex(p.primaryColor);
      _plan = p.plan;
      _logo = p.logo;
      _coverImage = p.coverImage;
      _hours = List.generate(7, (i) {
        final existing = p.workingHours.where((h) => h.dayOfWeek == i);
        if (existing.isNotEmpty) return existing.first;
        return WorkingHour(dayOfWeek: i, isOpen: i != 0, openTime: '09:00', closeTime: i == 6 ? '18:00' : '20:00');
      });
      if (mounted) setState(() => _loading = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _loadError = e.toString();
        });
      }
    }
  }

  Future<void> _loadChatbot() async {
    try {
      final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 5));
      final stored = prefs.getString('cortix_chatbot_config');
      if (stored != null) {
        final parsed = jsonDecode(stored) as Map<String, dynamic>;
        _chatbot = {..._chatbot, ...parsed};
      }
    } catch (_) {
      // keep defaults — persistence across reloads is best-effort, same as
      // the web version's localStorage-only config
    }
    if (mounted) setState(() => _chatbotLoaded = true);
  }

  Future<void> _saveChatbot() async {
    try {
      final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 5));
      await prefs.setString('cortix_chatbot_config', jsonEncode(_chatbot));
    } catch (_) {
      // ignore — config still applies for the rest of this session
    }
    if (mounted) {
      setState(() => _chatbotSaved = true);
      Future.delayed(const Duration(milliseconds: 1600), () {
        if (mounted) setState(() => _chatbotSaved = false);
      });
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    try {
      await _repository.updateBarbershopProfile(
        name: _nameCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        instagram: _instaCtrl.text.trim(),
        pixKey: _pixCtrl.text.trim(),
        faqText: _faqCtrl.text.trim(),
        city: _cityCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        logo: _logo,
        coverImage: _coverImage,
      );
      if (mounted) {
        context.read<BrandController>().refresh();
        setState(() => _savedProfile = true);
        Future.delayed(const Duration(milliseconds: 1600), () {
          if (mounted) setState(() => _savedProfile = false);
        });
      }
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível salvar.');
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _saveColor() async {
    setState(() => _savingColor = true);
    try {
      await _repository.updateBarbershopColor(_toHex(_color));
      if (mounted) {
        context.read<BrandController>().refresh();
        setState(() => _savedColor = true);
        Future.delayed(const Duration(milliseconds: 1600), () {
          if (mounted) setState(() => _savedColor = false);
        });
      }
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível salvar.');
    } finally {
      if (mounted) setState(() => _savingColor = false);
    }
  }

  Future<void> _saveHours() async {
    setState(() => _savingHours = true);
    try {
      await _repository.updateWorkingHours(_hours);
      if (mounted) {
        setState(() => _savedHours = true);
        Future.delayed(const Duration(milliseconds: 1600), () {
          if (mounted) setState(() => _savedHours = false);
        });
      }
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível salvar.');
    } finally {
      if (mounted) setState(() => _savingHours = false);
    }
  }

  Future<void> _switchPlan(String plan) async {
    setState(() => _savingPlan = true);
    try {
      await _repository.updatePlan(plan);
      if (mounted) {
        setState(() => _plan = plan);
        AppToast.success(context, 'Plano atualizado.');
      }
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível trocar de plano.');
    } finally {
      if (mounted) setState(() => _savingPlan = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        elevation: 0,
        title: const Text('Configurações'),
        bottom: TabBar(
          controller: _tab,
          isScrollable: true,
          labelColor: palette.textPrimary,
          unselectedLabelColor: palette.textFaint,
          indicatorColor: palette.textPrimary,
          tabs: const [
            Tab(text: 'Barbearia'),
            Tab(text: 'Aparência'),
            Tab(text: 'Horários'),
            Tab(text: 'Notificações'),
            Tab(text: 'Chatbot'),
            Tab(text: 'Plano'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
              ? Center(child: Text('Erro: $_loadError', style: const TextStyle(color: Colors.redAccent)))
              : TabBarView(
                  controller: _tab,
                  children: [
                    _profileTab(palette, accent),
                    _appearanceTab(palette, accent),
                    _hoursTab(palette, accent),
                    _notificationsTab(palette, accent),
                    _chatbotTab(palette, accent),
                    _planTab(palette, accent),
                  ],
                ),
    );
  }

  Widget _saveButton({required VoidCallback? onPressed, required bool busy, required bool saved, required String label, required Color accent}) {
    return SizedBox(
      height: 48,
      child: ElevatedButton(
        onPressed: busy ? null : onPressed,
        style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
        child: busy
            ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
            : Text(saved ? 'Salvou!' : label, style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _profileTab(AppPalette palette, Color accent) {
    final coverUrl = resolveAssetUrl(_coverImage);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Banner e logo', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 4),
        Text('Aparecem no topo do Dashboard e na página pública de agendamento.', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
        const SizedBox(height: 12),
        StatefulBuilder(
          builder: (context, setTabState) => Stack(
            clipBehavior: Clip.none,
            children: [
              GestureDetector(
                onTap: () async {
                  final file = await _pickImage();
                  if (file == null) return;
                  try {
                    final url = await _repository.uploadImage(file);
                    setTabState(() => _coverImage = url);
                  } catch (_) {
                    if (mounted) AppToast.error(context, 'Falha ao enviar a foto.');
                  }
                },
                child: Container(
                  height: 110,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: palette.surfaceAlt,
                    borderRadius: BorderRadius.circular(16),
                    image: coverUrl != null ? DecorationImage(image: NetworkImage(coverUrl), fit: BoxFit.cover) : null,
                  ),
                  child: coverUrl == null
                      ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.add_photo_alternate_outlined, color: palette.textFaint, size: 24),
                          const SizedBox(height: 6),
                          Text('Adicionar banner de capa', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                        ]))
                      : Align(
                          alignment: Alignment.bottomRight,
                          child: Container(
                            margin: const EdgeInsets.all(8),
                            padding: const EdgeInsets.all(5),
                            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                            child: const Icon(Icons.edit, size: 13, color: Colors.white),
                          ),
                        ),
                ),
              ),
              Positioned(
                bottom: -22,
                left: 14,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(color: palette.bg, shape: BoxShape.circle),
                  child: PhotoPickerTile(
                    imageUrl: _logo,
                    upload: _repository.uploadImage,
                    placeholderIcon: Icons.storefront_outlined,
                    onChanged: (url) => setTabState(() => _logo = url),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        const FieldLabel('Nome da barbearia'),
        CortixField(controller: _nameCtrl),
        const FieldLabel('Telefone / WhatsApp'),
        CortixField(controller: _phoneCtrl, keyboardType: TextInputType.phone, hint: '(11) 99999-9999'),
        const FieldLabel('E-mail'),
        CortixField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress),
        const FieldLabel('Instagram'),
        CortixField(controller: _instaCtrl, hint: '@suabarbearia'),
        const FieldLabel('Chave PIX (gorjetas)'),
        CortixField(controller: _pixCtrl, hint: 'CPF, e-mail, telefone ou chave aleatória'),
        const FieldLabel('Perguntas frequentes (o chatbot responde com isso)'),
        CortixField(controller: _faqCtrl, maxLines: 4, hint: 'Ex: Aceita PIX e cartão. Tem estacionamento. Atende criança a partir de 3 anos.'),
        const FieldLabel('Cidade'),
        CortixField(controller: _cityCtrl),
        const FieldLabel('Descrição'),
        CortixField(controller: _descCtrl, maxLines: 3),
        const SizedBox(height: 20),
        _saveButton(onPressed: _saveProfile, busy: _savingProfile, saved: _savedProfile, label: 'Salvar alterações', accent: accent),
      ],
    );
  }

  Widget _appearanceTab(AppPalette palette, Color accent) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Cor principal', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: _swatches.map((hex) {
            final c = Color(hex);
            final selected = c.toARGB32() == _color.toARGB32();
            return GestureDetector(
              onTap: () => setState(() => _color = c),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: c,
                  shape: BoxShape.circle,
                  border: Border.all(color: selected ? palette.textPrimary : Colors.transparent, width: 2.5),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        Text('Preview da página de agendamento', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Column(
            children: [
              Container(
                height: 48,
                color: _color,
                alignment: Alignment.centerLeft,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Text(_nameCtrl.text.isEmpty ? 'Sua barbearia' : _nameCtrl.text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
              Container(
                color: palette.surfaceAlt,
                padding: const EdgeInsets.all(16),
                width: double.infinity,
                child: Column(
                  children: [
                    Text('Sua página personalizada de agendamento', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(color: _color, borderRadius: BorderRadius.circular(10)),
                      child: const Text('Agendar horário', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12.5)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _saveButton(onPressed: _saveColor, busy: _savingColor, saved: _savedColor, label: 'Salvar aparência', accent: accent),
      ],
    );
  }

  Widget _hoursTab(AppPalette palette, Color accent) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ..._hours.asMap().entries.map((entry) {
          final i = entry.key;
          final h = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Row(
              children: [
                SizedBox(width: 36, child: Text(_weekdays[i], style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.w600, fontSize: 13))),
                Switch(
                  value: h.isOpen,
                  activeThumbColor: accent,
                  onChanged: (v) => setState(() => _hours[i] = WorkingHour(dayOfWeek: i, isOpen: v, openTime: h.openTime, closeTime: h.closeTime)),
                ),
                if (h.isOpen)
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(child: _TimeField(value: h.openTime, onChanged: (v) => setState(() => _hours[i] = WorkingHour(dayOfWeek: i, isOpen: true, openTime: v, closeTime: h.closeTime)))),
                        Padding(padding: const EdgeInsets.symmetric(horizontal: 6), child: Text('até', style: TextStyle(color: palette.textFaint, fontSize: 11))),
                        Expanded(child: _TimeField(value: h.closeTime, onChanged: (v) => setState(() => _hours[i] = WorkingHour(dayOfWeek: i, isOpen: true, openTime: h.openTime, closeTime: v)))),
                      ],
                    ),
                  )
                else
                  Expanded(child: Padding(padding: const EdgeInsets.only(left: 8), child: Text('Fechado', style: TextStyle(color: palette.textFaint, fontSize: 12)))),
              ],
            ),
          );
        }),
        const SizedBox(height: 10),
        _saveButton(onPressed: _saveHours, busy: _savingHours, saved: _savedHours, label: 'Salvar horários', accent: accent),
      ],
    );
  }

  Widget _notificationsTab(AppPalette palette, Color accent) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: _notifications
          .map((n) => Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(border: Border(bottom: BorderSide(color: palette.border))),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(n.label, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                          Text(n.desc, style: TextStyle(color: palette.textFaint, fontSize: 11)),
                        ],
                      ),
                    ),
                    StatefulBuilder(
                      builder: (context, setTileState) => Switch(
                        value: n.enabled,
                        activeThumbColor: accent,
                        onChanged: (v) => setTileState(() => n.enabled = v),
                      ),
                    ),
                  ],
                ),
              ))
          .toList(),
    );
  }

  Widget _chatbotTab(AppPalette palette, Color accent) {
    if (!_chatbotLoaded) return const Center(child: CircularProgressIndicator());
    final canCustomize = _plan != 'FREE';
    if (!canCustomize) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.amber.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.amber.withValues(alpha: 0.25))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [Icon(Icons.lock_outline_rounded, color: Colors.amber, size: 18), SizedBox(width: 8), Text('Disponível no plano Pro', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold))]),
                const SizedBox(height: 8),
                Text('Ative o plano Pro para editar nome, mensagem de boas-vindas, FAQ e integração com WhatsApp.', style: TextStyle(color: palette.textSecondary, fontSize: 12.5)),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => _tab.animateTo(5),
                  style: ElevatedButton.styleFrom(backgroundColor: accent),
                  child: Text('Ver planos', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ],
      );
    }

    final faqItems = (_chatbot['faqItems'] as List).cast<Map<String, dynamic>>();
    final whatsapp = (_chatbot['whatsapp'] as Map).cast<String, dynamic>();
    final canWhatsapp = _featuresByPlan[_plan]!.contains('Lembrete no WhatsApp');

    return StatefulBuilder(
      builder: (context, setTabState) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(child: Text('Ativar chatbot', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600))),
              Switch(value: _chatbot['enabled'] == true, activeThumbColor: accent, onChanged: (v) => setTabState(() => _chatbot['enabled'] = v)),
            ],
          ),
          const FieldLabel('Nome do assistente'),
          _InlineTextField(initial: _chatbot['name'], onChanged: (v) => _chatbot['name'] = v),
          const FieldLabel('Mensagem de boas-vindas'),
          _InlineTextField(initial: _chatbot['welcomeMessage'], onChanged: (v) => _chatbot['welcomeMessage'] = v),
          const FieldLabel('Endereço'),
          _InlineTextField(initial: _chatbot['address'], onChanged: (v) => _chatbot['address'] = v),
          const FieldLabel('Horário'),
          _InlineTextField(initial: _chatbot['hours'], onChanged: (v) => _chatbot['hours'] = v),
          if (canWhatsapp) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF34D399), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Integração WhatsApp', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                            Text('Ative o atendimento direto pelo WhatsApp.', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                          ],
                        ),
                      ),
                      Switch(
                        value: whatsapp['enabled'] == true,
                        activeThumbColor: accent,
                        onChanged: (v) => setTabState(() => whatsapp['enabled'] = v),
                      ),
                    ],
                  ),
                  if (whatsapp['enabled'] == true) ...[
                    const FieldLabel('Telefone'),
                    _InlineTextField(initial: whatsapp['phone'] ?? '', hint: '(11) 99999-9999', onChanged: (v) => whatsapp['phone'] = v),
                    const FieldLabel('Token de acesso (Meta/WhatsApp Business API)'),
                    _InlineTextField(initial: whatsapp['token'] ?? '', hint: 'Token do provedor', onChanged: (v) => whatsapp['token'] = v),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const FieldLabel('Automático de'),
                              _TimeField(value: whatsapp['autoFrom'] ?? '09:00', onChanged: (v) => setTabState(() => whatsapp['autoFrom'] = v)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const FieldLabel('Automático até'),
                              _TimeField(value: whatsapp['autoTo'] ?? '18:00', onChanged: (v) => setTabState(() => whatsapp['autoTo'] = v)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('FAQ do assistente', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              TextButton.icon(
                onPressed: () => setTabState(() => faqItems.add({'question': '', 'answer': ''})),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Adicionar'),
              ),
            ],
          ),
          ...faqItems.asMap().entries.map((e) {
            final i = e.key;
            final item = e.value;
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(12)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Pergunta ${i + 1}', style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600)),
                      GestureDetector(onTap: () => setTabState(() => faqItems.removeAt(i)), child: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  _InlineTextField(initial: item['question'] ?? '', hint: 'Ex.: Como agendar?', onChanged: (v) => item['question'] = v),
                  const SizedBox(height: 6),
                  _InlineTextField(initial: item['answer'] ?? '', hint: 'Resposta do chatbot...', maxLines: 2, onChanged: (v) => item['answer'] = v),
                ],
              ),
            );
          }),
          const SizedBox(height: 8),
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: () async {
                _chatbot['faqItems'] = faqItems;
                await _saveChatbot();
              },
              style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: Text(_chatbotSaved ? 'Salvou!' : 'Salvar chatbot', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _planTab(AppPalette palette, Color accent) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...['FREE', 'PRO', 'ENTERPRISE'].map((key) {
          final info = _planInfo[key]!;
          final isCurrent = _plan == key;
          final features = _featuresByPlan[key]!;
          return Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: palette.surface,
              borderRadius: BorderRadius.circular(16),
              border: isCurrent ? Border.all(color: info.$3.withValues(alpha: 0.5)) : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: info.$3.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                      child: Text(info.$1, style: TextStyle(color: info.$3, fontWeight: FontWeight.bold, fontSize: 11.5)),
                    ),
                    if (isCurrent)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(10)),
                        child: Text('PLANO ATUAL', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold, fontSize: 9.5)),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(info.$2, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w900, fontSize: 20)),
                Text(info.$4, style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                const SizedBox(height: 12),
                ..._allFeatureLabels.map((f) {
                  final included = features.contains(f);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 5),
                    child: Row(
                      children: [
                        Icon(included ? Icons.check_circle : Icons.lock_outline, size: 13, color: included ? Colors.green : palette.textFaint),
                        const SizedBox(width: 8),
                        Expanded(child: Text(f, style: TextStyle(color: included ? palette.textSecondary : palette.textFaint, fontSize: 11.5))),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 42,
                  child: ElevatedButton(
                    onPressed: isCurrent || _savingPlan ? null : () => _switchPlan(key),
                    style: ElevatedButton.styleFrom(backgroundColor: isCurrent ? palette.surfaceAlt : accent),
                    child: Text(
                      isCurrent ? 'Plano ativo' : 'Ver como ${info.$1}',
                      style: TextStyle(color: isCurrent ? palette.textFaint : contrastingTextColor(accent), fontWeight: FontWeight.bold, fontSize: 12.5),
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
        Text(
          '"Ver como" troca o plano da sua barbearia instantaneamente, para fins de demonstração — sem cobrança real.',
          style: TextStyle(color: palette.textFaint, fontSize: 10.5),
        ),
      ],
    );
  }
}

class _NotificationSetting {
  final String label;
  final String desc;
  bool enabled;
  _NotificationSetting(this.label, this.desc, this.enabled);
}

class _TimeField extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  const _TimeField({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return GestureDetector(
      onTap: () async {
        final parts = value.split(':');
        final initial = TimeOfDay(hour: int.tryParse(parts[0]) ?? 9, minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0);
        final picked = await showTimePicker(context: context, initialTime: initial);
        if (picked != null) onChanged('${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}');
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(8)),
        alignment: Alignment.center,
        child: Text(value, style: TextStyle(color: palette.textPrimary, fontSize: 12.5)),
      ),
    );
  }
}

/// Uncontrolled text field that reports changes without forcing a rebuild
/// of the whole tab on every keystroke (the chatbot config map is mutated
/// directly, matching the web version's plain local-state form).
class _InlineTextField extends StatefulWidget {
  final String initial;
  final String? hint;
  final int maxLines;
  final ValueChanged<String> onChanged;

  const _InlineTextField({required this.initial, required this.onChanged, this.hint, this.maxLines = 1});

  @override
  State<_InlineTextField> createState() => _InlineTextFieldState();
}

class _InlineTextFieldState extends State<_InlineTextField> {
  late final TextEditingController _controller = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CortixField(controller: _controller, hint: widget.hint, maxLines: widget.maxLines);
  }
}
