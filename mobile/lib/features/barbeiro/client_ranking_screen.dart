import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/form_sheet.dart';
import 'barber_repository.dart';

Color _colorFromHex(String hex, [Color fallback = const Color(0xFFD4AF37)]) {
  final cleaned = hex.replaceAll('#', '');
  if (cleaned.length != 6) return fallback;
  final value = int.tryParse(cleaned, radix: 16);
  return value == null ? fallback : Color(0xFF000000 | value);
}

class ClientRankingScreen extends StatefulWidget {
  const ClientRankingScreen({super.key});

  @override
  State<ClientRankingScreen> createState() => _ClientRankingScreenState();
}

class _ClientRankingScreenState extends State<ClientRankingScreen> {
  final _repository = BarberRepository();
  late Future<List<BarberClientEntry>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.allClients();
  }

  void _refresh() => setState(() => _future = _repository.allClients());

  String _initials(String name) => name.trim().isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase();

  Future<void> _openCreateClient() async {
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
    if (saved == true) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        elevation: 0,
        title: const Text('Clientes'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreateClient,
        backgroundColor: accent,
        icon: Icon(Icons.person_add_alt_1, color: contrastingTextColor(accent)),
        label: Text('Cadastrar', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<BarberClientEntry>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(children: [
                const SizedBox(height: 80),
                Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent))),
              ]);
            }
            final all = <BarberClientEntry>[...(snapshot.data ?? <BarberClientEntry>[])]..sort((a, b) => b.visits.compareTo(a.visits));
            if (all.isEmpty) {
              return ListView(children: [
                const SizedBox(height: 100),
                Center(child: Text('Nenhum cliente cadastrado ainda.', style: TextStyle(color: palette.textFaint), textAlign: TextAlign.center)),
              ]);
            }

            // Only clients with an actual visit earn a podium spot — a
            // freshly registered client still shows up, just in the plain
            // list below rather than on the loyalty podium.
            final podium = all.where((c) => c.visits > 0).take(3).toList();
            final rest = all.where((c) => !podium.contains(c)).toList();
            final members = all.where((c) => c.subscription != null).toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                // A "who's a paying member" row, browsable like stories —
                // so the barber spots a subscriber before even opening the
                // full list, the same at-a-glance instinct as checking who's
                // online, repurposed for "who's already invested here".
                if (members.isNotEmpty) ...[
                  Row(
                    children: [
                      const Icon(Icons.workspace_premium_rounded, size: 15, color: Color(0xFFD4AF37)),
                      const SizedBox(width: 6),
                      Text('Membros ativos · ${members.length}', style: TextStyle(color: palette.textFaint, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.3)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 88,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: members.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (context, i) => RiseIn(delay: Duration(milliseconds: 40 * i), child: _MemberChip(entry: members[i], initials: _initials, palette: palette)),
                    ),
                  ),
                  const SizedBox(height: 22),
                ],
                if (podium.isNotEmpty) _Podium(entries: podium, initials: _initials, palette: palette),
                if (rest.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Text('Todos os clientes', style: TextStyle(color: palette.textFaint, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                  const SizedBox(height: 10),
                  ...rest.asMap().entries.map((entry) => RiseIn(
                        delay: Duration(milliseconds: 30 * entry.key),
                        child: _RankRow(position: podium.length + entry.key + 1, entry: entry.value, palette: palette),
                      )),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Podium extends StatelessWidget {
  final List<BarberClientEntry> entries;
  final String Function(String) initials;
  final AppPalette palette;

  const _Podium({required this.entries, required this.initials, required this.palette});

  @override
  Widget build(BuildContext context) {
    // Order visually as [2nd, 1st, 3rd] so the champion sits tallest in the middle.
    final first = entries.isNotEmpty ? entries[0] : null;
    final second = entries.length > 1 ? entries[1] : null;
    final third = entries.length > 2 ? entries[2] : null;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (second != null) Expanded(child: _PodiumSlot(entry: second, place: 2, height: 118, color: const Color(0xFF94A3B8), initials: initials, palette: palette)),
        if (first != null) Expanded(child: _PodiumSlot(entry: first, place: 1, height: 150, color: const Color(0xFFF59E0B), initials: initials, palette: palette)),
        if (third != null) Expanded(child: _PodiumSlot(entry: third, place: 3, height: 96, color: const Color(0xFFB07A4A), initials: initials, palette: palette)),
      ],
    );
  }
}

class _PodiumSlot extends StatelessWidget {
  final BarberClientEntry entry;
  final int place;
  final double height;
  final Color color;
  final String Function(String) initials;
  final AppPalette palette;

  const _PodiumSlot({required this.entry, required this.place, required this.height, required this.color, required this.initials, required this.palette});

  @override
  Widget build(BuildContext context) {
    final avatarUrl = resolveAssetUrl(entry.avatar);
    return RiseIn(
      delay: Duration(milliseconds: 120 * place),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (place == 1) const Icon(Icons.emoji_events_rounded, color: Color(0xFFF59E0B), size: 26),
            const SizedBox(height: 4),
            Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: place == 1 ? 62 : 52,
                  height: place == 1 ? 62 : 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: color, width: 2.5),
                    boxShadow: [BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 14)],
                  ),
                  child: CircleAvatar(
                    backgroundColor: palette.surfaceAlt,
                    backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                    child: avatarUrl == null ? Text(initials(entry.name), style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.bold)) : null,
                  ),
                ),
                Positioned(
                  bottom: -4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
                    child: Text('$place°', style: TextStyle(color: contrastingTextColor(color), fontSize: 10, fontWeight: FontWeight.w900)),
                  ),
                ),
                if (entry.subscription != null)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(color: _colorFromHex(entry.subscription!.planColor), shape: BoxShape.circle, border: Border.all(color: palette.bg, width: 2)),
                      child: const Icon(Icons.workspace_premium_rounded, size: 10, color: Colors.white),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Text(entry.name.split(' ').first, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 12.5), maxLines: 1, overflow: TextOverflow.ellipsis),
            Text('${entry.visits} visitas', style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Container(
              height: height,
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [color.withValues(alpha: 0.35), color.withValues(alpha: 0.08)]),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RankRow extends StatelessWidget {
  final int position;
  final BarberClientEntry entry;
  final AppPalette palette;

  const _RankRow({required this.position, required this.entry, required this.palette});

  @override
  Widget build(BuildContext context) {
    final avatarUrl = resolveAssetUrl(entry.avatar);
    final membership = entry.subscription;
    final memberColor = membership != null ? _colorFromHex(membership.planColor) : null;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(14),
        border: memberColor != null ? Border.all(color: memberColor.withValues(alpha: 0.35)) : null,
      ),
      child: Row(
        children: [
          SizedBox(width: 26, child: Text('$position°', style: TextStyle(color: palette.textFaint, fontWeight: FontWeight.bold, fontSize: 13))),
          const SizedBox(width: 6),
          Container(
            padding: EdgeInsets.all(memberColor != null ? 2 : 0),
            decoration: memberColor != null ? BoxDecoration(shape: BoxShape.circle, border: Border.all(color: memberColor, width: 2)) : null,
            child: CircleAvatar(
              radius: 18,
              backgroundColor: palette.surfaceAlt,
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
              child: avatarUrl == null ? Text(initials(entry.name), style: TextStyle(color: palette.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)) : null,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis),
                if (membership != null)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.workspace_premium_rounded, size: 11, color: memberColor),
                      const SizedBox(width: 3),
                      Flexible(child: Text(membership.planName, style: TextStyle(color: memberColor, fontSize: 10.5, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis)),
                    ],
                  ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(entry.visits == 0 ? 'Sem visitas' : '${entry.visits} visitas', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 12.5)),
              if (entry.visits > 0) Text('R\$ ${entry.totalSpent.toStringAsFixed(2)}', style: TextStyle(color: palette.textFaint, fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }

  String initials(String name) => name.trim().isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase();
}

class _MemberChip extends StatelessWidget {
  final BarberClientEntry entry;
  final String Function(String) initials;
  final AppPalette palette;
  const _MemberChip({required this.entry, required this.initials, required this.palette});

  @override
  Widget build(BuildContext context) {
    final avatarUrl = resolveAssetUrl(entry.avatar);
    final color = _colorFromHex(entry.subscription!.planColor);
    return SizedBox(
      width: 68,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(2.5),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: SweepGradient(colors: [color, Color.lerp(color, Colors.white, 0.4)!, color]),
            ),
            child: CircleAvatar(
              radius: 24,
              backgroundColor: palette.surfaceAlt,
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
              child: avatarUrl == null ? Text(initials(entry.name), style: TextStyle(color: palette.textSecondary, fontSize: 13, fontWeight: FontWeight.bold)) : null,
            ),
          ),
          const SizedBox(height: 5),
          Text(entry.name.split(' ').first, style: TextStyle(color: palette.textPrimary, fontSize: 10.5, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
