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
// Paleta metálica contida, igual à do web: ouro âmbar, prata ardósia, bronze
// quente. Sem tons berrantes.
const _tierColors = {
  'BRONZE': Color(0xFFB07A4A),
  'SILVER': Color(0xFF94A3B8),
  'GOLD': Color(0xFFF59E0B),
};
const _tierOrder = ['GOLD', 'SILVER', 'BRONZE'];

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
    final dobNotifier = ValueNotifier<DateTime?>(null);

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
          dateOfBirth: formatDobKey(dobNotifier.value),
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
        const FieldLabel('Data de nascimento'),
        CortixDateField(value: dobNotifier),
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(
            children: [
              Icon(Icons.card_giftcard_rounded, size: 13, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Habilita felicitações e promoções de aniversário.',
                  style: TextStyle(color: AppPalette.of(context).textFaint, fontSize: 11.5),
                ),
              ),
            ],
          ),
        ),
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
                  (_filter == 'silver' && c.tier == 'SILVER') ||
                  (_filter == 'bronze' && c.tier == 'BRONZE') ||
                  (_filter == 'subscribers' && c.subscription != null) ||
                  (_filter == 'no-account' && !c.hasAccount);
              return matchSearch && matchFilter;
            }).toList();
            final tierCounts = <String, int>{'GOLD': 0, 'SILVER': 0, 'BRONZE': 0};
            for (final c in all) {
              if (c.tier != null && tierCounts.containsKey(c.tier)) tierCounts[c.tier!] = tierCounts[c.tier!]! + 1;
            }
            final withTier = tierCounts.values.fold<int>(0, (a, b) => a + b);
            final subscriberCount = all.where((c) => c.subscription != null).length;
            final noAccountCount = all.where((c) => !c.hasAccount).length;
            final segments = <(String, String, int)>[
              ('all', 'Todos', all.length),
              ('gold', 'Ouro', tierCounts['GOLD']!),
              ('silver', 'Prata', tierCounts['SILVER']!),
              ('bronze', 'Bronze', tierCounts['BRONZE']!),
              ('subscribers', 'Assinantes', subscriberCount),
              ('no-account', 'Sem conta', noAccountCount),
            ];

            return Column(
              children: [
                // Distribuição por nível — barra proporcional + contagem por
                // tier, igual ao web. A leitura rápida do mix da base.
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: palette.surface,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: palette.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('DISTRIBUIÇÃO POR NÍVEL', style: TextStyle(color: palette.textFaint, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.4)),
                            Text('${all.length} clientes · $subscriberCount assinantes', style: TextStyle(color: palette.textFaint, fontSize: 10.5)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: SizedBox(
                            height: 8,
                            child: withTier == 0
                                ? Container(color: palette.surfaceAlt)
                                : Row(
                                    children: _tierOrder.where((t) => tierCounts[t]! > 0).map((t) {
                                      return Expanded(flex: tierCounts[t]!, child: Container(color: _tierColors[t]));
                                    }).toList(),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: _tierOrder.map((t) {
                            final selected = _filter == t.toLowerCase();
                            return Expanded(
                              child: Padding(
                                padding: EdgeInsets.only(right: t == 'BRONZE' ? 0 : 8),
                                child: GestureDetector(
                                  onTap: () => setState(() => _filter = selected ? 'all' : t.toLowerCase()),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: selected ? palette.surfaceAlt : Colors.transparent,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: selected ? palette.textFaint.withValues(alpha: 0.3) : palette.border),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Container(width: 7, height: 7, decoration: BoxDecoration(color: _tierColors[t], shape: BoxShape.circle)),
                                            const SizedBox(width: 5),
                                            Text(_tierLabels[t]!, style: TextStyle(color: palette.textSecondary, fontSize: 11)),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text('${tierCounts[t]}', style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: TextField(
                    onChanged: (v) => setState(() => _search = v),
                    style: TextStyle(color: palette.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Buscar por nome ou telefone...',
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
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: segments.map((f) {
                      final selected = _filter == f.$1;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: GestureDetector(
                          onTap: () => setState(() => _filter = f.$1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: selected ? palette.textPrimary.withValues(alpha: 0.10) : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(f.$2, style: TextStyle(color: selected ? palette.textPrimary : palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                                const SizedBox(width: 5),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(5)),
                                  child: Text('${f.$3}', style: TextStyle(color: palette.textFaint, fontSize: 10, fontWeight: FontWeight.w700)),
                                ),
                              ],
                            ),
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
                                decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: palette.border)),
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
                                                  Container(width: 6, height: 6, decoration: BoxDecoration(color: tierColor, shape: BoxShape.circle)),
                                                  const SizedBox(width: 5),
                                                  Text('${_tierLabels[c.tier]} · ${c.points} pts', style: TextStyle(color: tierColor, fontSize: 10.5, fontWeight: FontWeight.w600)),
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

