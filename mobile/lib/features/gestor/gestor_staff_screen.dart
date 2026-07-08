import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/photo_picker_tile.dart';
import 'gestor_repository.dart';

class GestorStaffScreen extends StatefulWidget {
  const GestorStaffScreen({super.key});

  @override
  State<GestorStaffScreen> createState() => _GestorStaffScreenState();
}

class _GestorStaffScreenState extends State<GestorStaffScreen> {
  final _repository = GestorRepository();
  late Future<List<GestorStaff>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.staff();
  }

  void _refresh() => setState(() => _future = _repository.staff());

  String _initials(String name) => name.trim().isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase();

  Future<void> _openForm({GestorStaff? editing}) async {
    final nameCtrl = TextEditingController(text: editing?.name);
    final roleCtrl = TextEditingController(text: editing?.role ?? 'BARBER');
    final specialtiesCtrl = TextEditingController(text: editing?.specialties ?? '');
    final commissionCtrl = TextEditingController(text: editing != null ? (editing.commissionRate * 100).round().toString() : '40');
    final emailCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();
    String? avatar = editing?.avatar;
    bool isActive = editing?.isActive ?? true;
    final needsLoginFields = editing == null || !editing.hasLogin;

    final saved = await FormSheet.show(
      context,
      title: editing != null ? 'Editar barbeiro' : 'Adicionar barbeiro',
      submitLabel: editing != null ? 'Salvar alterações' : 'Adicionar barbeiro',
      onSubmit: () async {
        if (nameCtrl.text.trim().isEmpty) throw Exception('Informe o nome do barbeiro.');
        final commission = (double.tryParse(commissionCtrl.text) ?? 40) / 100;
        if (editing != null) {
          await _repository.updateStaff(
            editing.id,
            name: nameCtrl.text.trim(),
            role: roleCtrl.text.trim().isEmpty ? 'BARBER' : roleCtrl.text.trim(),
            specialties: specialtiesCtrl.text.trim().isEmpty ? null : specialtiesCtrl.text.trim(),
            commissionRate: commission,
            avatar: avatar,
            isActive: isActive,
            email: needsLoginFields ? emailCtrl.text.trim() : null,
            password: needsLoginFields ? passwordCtrl.text : null,
          );
        } else {
          await _repository.createStaff(
            name: nameCtrl.text.trim(),
            role: roleCtrl.text.trim().isEmpty ? 'BARBER' : roleCtrl.text.trim(),
            specialties: specialtiesCtrl.text.trim().isEmpty ? null : specialtiesCtrl.text.trim(),
            commissionRate: commission,
            avatar: avatar,
            email: emailCtrl.text.trim().isEmpty ? null : emailCtrl.text.trim(),
            password: passwordCtrl.text.isEmpty ? null : passwordCtrl.text,
          );
        }
      },
      children: [
        StatefulBuilder(
          builder: (context, setSheetState) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const FieldLabel('Foto de perfil'),
              PhotoPickerTile(imageUrl: avatar, upload: _repository.uploadImage, placeholderIcon: Icons.person_outline, onChanged: (url) => setSheetState(() => avatar = url)),
              const FieldLabel('Nome'),
              CortixField(controller: nameCtrl, hint: 'Ex: João Silva'),
              const FieldLabel('Cargo'),
              CortixField(controller: roleCtrl, hint: 'BARBER'),
              const FieldLabel('Especialidades'),
              CortixField(controller: specialtiesCtrl, hint: 'Degradê, Navalhado'),
              const FieldLabel('Comissão (%)'),
              CortixField(controller: commissionCtrl, keyboardType: TextInputType.number),
              if (editing != null) ...[
                const FieldLabel('Status'),
                CortixChoiceRow(
                  value: isActive ? 'true' : 'false',
                  options: const [('true', 'Ativo'), ('false', 'Inativo')],
                  onChanged: (v) => setSheetState(() => isActive = v == 'true'),
                ),
              ],
              if (needsLoginFields) ...[
                const SizedBox(height: 12),
                Text('Opcional: crie um acesso para esse barbeiro usar o app CORTIX.', style: TextStyle(color: AppPalette.of(context).textFaint, fontSize: 11.5)),
                const FieldLabel('E-mail de acesso'),
                CortixField(controller: emailCtrl, keyboardType: TextInputType.emailAddress, hint: 'barbeiro@email.com'),
                const FieldLabel('Senha de acesso'),
                CortixField(controller: passwordCtrl, obscureText: true, hint: 'Mínimo 8 caracteres'),
              ] else
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text('Este barbeiro já tem acesso ao app com o e-mail cadastrado.', style: TextStyle(color: Colors.green.shade400, fontSize: 11.5)),
                ),
            ],
          ),
        ),
      ],
    );
    if (saved == true) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Equipe'), elevation: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(),
        backgroundColor: accent,
        icon: Icon(Icons.add, color: contrastingTextColor(accent)),
        label: Text('Adicionar', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<GestorStaff>>(
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
            final staff = [...(snapshot.data ?? [])]..sort((a, b) => b.revenue.compareTo(a.revenue));
            final totalRevenue = staff.fold<double>(0, (a, s) => a + s.revenue);

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _MiniStat(label: 'barbeiros', value: '${staff.length}', icon: Icons.badge_outlined, palette: palette),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _MiniStat(label: 'receita/mês', value: 'R\$${totalRevenue.toStringAsFixed(0)}', icon: Icons.payments_outlined, palette: palette, iconColor: palette.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (staff.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 40),
                    child: Center(child: Text('Nenhum barbeiro cadastrado ainda.', style: TextStyle(color: palette.textFaint))),
                  ),
                ...staff.asMap().entries.map((entry) {
                  final i = entry.key;
                  final member = entry.value;
                  final avatarUrl = resolveAssetUrl(member.avatar);
                  final isTop = i == 0 && member.revenue > 0;
                  return RiseIn(
                    delay: Duration(milliseconds: 30 * i),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: palette.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: isTop ? Border.all(color: accent.withValues(alpha: 0.4)) : null,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 22,
                                backgroundColor: palette.surfaceAlt,
                                backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                                child: avatarUrl == null ? Text(_initials(member.name), style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.bold)) : null,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(child: Text(member.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5), overflow: TextOverflow.ellipsis)),
                                        if (isTop) ...[
                                          const SizedBox(width: 6),
                                          const Icon(Icons.emoji_events_rounded, color: Color(0xFFF5C518), size: 15),
                                        ],
                                        if (!member.isActive) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                            decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(8)),
                                            child: Text('Inativo', style: TextStyle(color: palette.textFaint, fontSize: 9)),
                                          ),
                                        ],
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        Text(member.role, style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                                        if (member.avgRating != null) ...[
                                          const SizedBox(width: 6),
                                          const Icon(Icons.star, size: 11, color: Colors.amber),
                                          Text(' ${member.avgRating!.toStringAsFixed(1)}', style: const TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.w600)),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: () => _openForm(editing: member),
                                icon: Icon(Icons.edit_outlined, size: 18, color: palette.textSecondary),
                                tooltip: 'Editar',
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              _MetricPill(icon: Icons.content_cut, label: '${member.appointmentsCount} cortes', palette: palette),
                              const SizedBox(width: 8),
                              _MetricPill(icon: Icons.attach_money, label: 'R\$${member.revenue.toStringAsFixed(0)}', palette: palette),
                              const SizedBox(width: 8),
                              _MetricPill(icon: Icons.percent, label: '${(member.commissionRate * 100).toStringAsFixed(0)}%', palette: palette),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _MetricPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final AppPalette palette;
  final Color? color;

  const _MetricPill({required this.icon, required this.label, required this.palette, this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(10)),
        child: Column(
          children: [
            Icon(icon, size: 14, color: color ?? palette.textSecondary),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: color ?? palette.textPrimary, fontSize: 11, fontWeight: FontWeight.w700)),
          ],
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
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 11)),
        ],
      ),
    );
  }
}
