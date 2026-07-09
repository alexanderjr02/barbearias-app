import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/skeleton.dart';
import 'gestor_repository.dart';

const _tierLabels = {'BRONZE': 'Bronze', 'SILVER': 'Prata', 'GOLD': 'Ouro'};
const _tierColors = {
  'BRONZE': Color(0xFFCD8155),
  'SILVER': Color(0xFFC7CDD6),
  'GOLD': Color(0xFFF5C518),
};

Color _colorFromHex(String hex, [Color fallback = const Color(0xFFD4AF37)]) {
  final cleaned = hex.replaceFirst('#', '');
  final value = int.tryParse(cleaned.length == 6 ? 'FF$cleaned' : cleaned, radix: 16);
  return value != null ? Color(value) : fallback;
}

class GestorClientsScreen extends StatefulWidget {
  const GestorClientsScreen({super.key});

  @override
  State<GestorClientsScreen> createState() => _GestorClientsScreenState();
}

class _GestorClientsScreenState extends State<GestorClientsScreen> {
  final _repository = GestorRepository();
  late Future<List<GestorClient>> _future;
  String _search = '';
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _future = _repository.clients();
  }

  void _refresh() => setState(() => _future = _repository.clients());

  String _initials(String name) => name.trim().isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase();

  Future<void> _openCreate() async {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();

    final saved = await FormSheet.show(
      context,
      title: 'Cadastrar cliente',
      submitLabel: 'Cadastrar cliente',
      onSubmit: () async {
        if (nameCtrl.text.trim().isEmpty) throw Exception('Informe o nome do cliente.');
        if (emailCtrl.text.trim().isEmpty) throw Exception('Informe o e-mail do cliente.');
        if (passwordCtrl.text.length < 8) throw Exception('A senha precisa ter ao menos 8 caracteres.');
        await _repository.createClient(
          name: nameCtrl.text.trim(),
          email: emailCtrl.text.trim(),
          phone: phoneCtrl.text.trim(),
          password: passwordCtrl.text,
        );
      },
      children: [
        Text(
          'O cliente recebe um acesso próprio para acompanhar o histórico e os pontos pelo app.',
          style: TextStyle(color: AppPalette.of(context).textFaint, fontSize: 12),
        ),
        const FieldLabel('Nome'),
        CortixField(controller: nameCtrl, hint: 'Ex: Maria Souza'),
        const FieldLabel('E-mail'),
        CortixField(controller: emailCtrl, keyboardType: TextInputType.emailAddress),
        const FieldLabel('Telefone'),
        CortixField(controller: phoneCtrl, keyboardType: TextInputType.phone, hint: '(11) 99999-9999'),
        const FieldLabel('Senha inicial'),
        CortixField(controller: passwordCtrl, obscureText: true, hint: 'Mínimo 8 caracteres'),
      ],
    );
    if (saved == true) {
      _refresh();
      if (mounted) AppToast.success(context, 'Cliente cadastrado.');
    }
  }

  Future<void> _changeAvatar(GestorClient c) async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 800, imageQuality: 85);
    if (file == null) return;
    try {
      final url = await _repository.uploadImage(file);
      await _repository.updateClientAvatar(c.id, url);
      _refresh();
    } catch (_) {
      if (mounted) AppToast.error(context, 'Falha ao enviar a foto.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Clientes'), elevation: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        backgroundColor: accent,
        icon: Icon(Icons.add, color: contrastingTextColor(accent)),
        label: Text('Cadastrar', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<GestorClient>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: 6,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) => const SkeletonBox(height: 72, borderRadius: 14),
              );
            }
            if (snapshot.hasError) {
              return ListView(children: [
                const SizedBox(height: 80),
                Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent))),
              ]);
            }
            final all = snapshot.data ?? [];
            final filtered = all.where((c) {
              final matchSearch = _search.isEmpty || c.name.toLowerCase().contains(_search.toLowerCase()) || c.phone.contains(_search);
              final matchFilter = _filter == 'all' ||
                  (_filter == 'gold' && c.tier == 'GOLD') ||
                  (_filter == 'subscribers' && c.subscription != null) ||
                  (_filter == 'no-account' && !c.hasAccount);
              return matchSearch && matchFilter;
            }).toList();
            final goldCount = all.where((c) => c.tier == 'GOLD').length;
            final subscriberCount = all.where((c) => c.subscription != null).length;

            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: _MiniStat(label: 'Total', value: '${all.length}', icon: Icons.people_outline, palette: palette),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _MiniStat(label: 'Ouro', value: '$goldCount', icon: Icons.star_rounded, palette: palette, iconColor: const Color(0xFFF5C518)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _MiniStat(label: 'Assinantes', value: '$subscriberCount', icon: Icons.workspace_premium_rounded, palette: palette, iconColor: Theme.of(context).colorScheme.primary),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: TextField(
                    onChanged: (v) => setState(() => _search = v),
                    style: TextStyle(color: palette.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Buscar cliente...',
                      hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
                      prefixIcon: Icon(Icons.search, color: palette.textFaint, size: 20),
                      filled: true,
                      fillColor: palette.surfaceAlt,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      ('all', 'Todos'),
                      ('gold', 'Ouro'),
                      ('subscribers', 'Assinantes'),
                      ('no-account', 'Sem conta'),
                    ].map((f) {
                      final selected = _filter == f.$1;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _filter = f.$1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                            decoration: BoxDecoration(
                              color: selected ? accent.withValues(alpha: 0.18) : palette.surfaceAlt,
                              borderRadius: BorderRadius.circular(20),
                              border: selected ? Border.all(color: accent.withValues(alpha: 0.5)) : null,
                            ),
                            child: Text(f.$2, style: TextStyle(color: selected ? palette.textPrimary : palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: filtered.isEmpty
                      ? Center(child: Text('Nenhum cliente encontrado.', style: TextStyle(color: palette.textFaint)))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final c = filtered[index];
                            final avatarUrl = resolveAssetUrl(c.avatar);
                            final tierColor = c.tier != null ? _tierColors[c.tier] : null;
                            return RiseIn(
                              delay: Duration(milliseconds: 20 * index),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                                child: Row(
                                  children: [
                                    GestureDetector(
                                      onTap: c.hasAccount ? () => _changeAvatar(c) : null,
                                      child: Stack(
                                        children: [
                                          CircleAvatar(
                                            radius: 20,
                                            backgroundColor: palette.surfaceAlt,
                                            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                                            child: avatarUrl == null ? Text(_initials(c.name), style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.bold, fontSize: 12)) : null,
                                          ),
                                          if (c.hasAccount)
                                            Positioned(
                                              bottom: -2,
                                              right: -2,
                                              child: Container(
                                                padding: const EdgeInsets.all(3),
                                                decoration: BoxDecoration(color: accent, shape: BoxShape.circle, border: Border.all(color: palette.surface, width: 1.5)),
                                                child: Icon(Icons.camera_alt, size: 9, color: contrastingTextColor(accent)),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Flexible(child: Text(c.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis)),
                                              if (c.subscription != null) ...[
                                                const SizedBox(width: 5),
                                                Icon(Icons.workspace_premium_rounded, size: 13, color: c.subscription!.status == 'PAST_DUE' ? Colors.redAccent : _colorFromHex(c.subscription!.planColor)),
                                              ],
                                            ],
                                          ),
                                          Text(c.phone, style: TextStyle(color: palette.textSecondary, fontSize: 11.5)),
                                          if (c.subscription != null)
                                            Padding(
                                              padding: const EdgeInsets.only(top: 3),
                                              child: Text(
                                                c.subscription!.status == 'PAST_DUE' ? '${c.subscription!.planName} · pagamento pendente' : c.subscription!.planName,
                                                style: TextStyle(
                                                  color: c.subscription!.status == 'PAST_DUE' ? Colors.redAccent : _colorFromHex(c.subscription!.planColor),
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                          if (tierColor != null)
                                            Padding(
                                              padding: const EdgeInsets.only(top: 3),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(Icons.star, size: 11, color: tierColor),
                                                  const SizedBox(width: 3),
                                                  Text('${_tierLabels[c.tier]} · ${c.points}pts', style: TextStyle(color: tierColor, fontSize: 10.5, fontWeight: FontWeight.w600)),
                                                ],
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text('${c.visits} visitas', style: TextStyle(color: palette.textPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
                                        Text('R\$ ${c.totalSpent.toStringAsFixed(2)}', style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
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

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final AppPalette palette;
  final Color? iconColor;

  const _MiniStat({required this.label, required this.value, required this.icon, required this.palette, this.iconColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Icon(icon, size: 18, color: iconColor ?? palette.textSecondary),
          const SizedBox(width: 8),
          Text(value, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(width: 4),
          Flexible(child: Text(label, style: TextStyle(color: palette.textFaint, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}
