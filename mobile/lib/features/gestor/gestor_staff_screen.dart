import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/rukz_theme.dart';
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
              RukzField(controller: nameCtrl, hint: 'Ex: João Silva'),
              const FieldLabel('Cargo'),
              RukzField(controller: roleCtrl, hint: 'BARBER'),
              const FieldLabel('Especialidades'),
              RukzField(controller: specialtiesCtrl, hint: 'Degradê, Navalhado'),
              const FieldLabel('Comissão (%)'),
              RukzField(controller: commissionCtrl, keyboardType: TextInputType.number),
              if (editing != null) ...[
                const FieldLabel('Status'),
                RukzChoiceRow(
                  value: isActive ? 'true' : 'false',
                  options: const [('true', 'Ativo'), ('false', 'Inativo')],
                  onChanged: (v) => setSheetState(() => isActive = v == 'true'),
                ),
              ],
              if (needsLoginFields) ...[
                const SizedBox(height: 12),
                Text('Opcional: crie um acesso para esse barbeiro usar o app rukz.', style: TextStyle(color: AppPalette.of(context).textFaint, fontSize: 11.5)),
                const FieldLabel('E-mail de acesso'),
                RukzField(controller: emailCtrl, keyboardType: TextInputType.emailAddress, hint: 'barbeiro@email.com'),
                const FieldLabel('Senha de acesso'),
                RukzField(controller: passwordCtrl, obscureText: true, hint: 'Mínimo 8 caracteres'),
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
            // Tipo explicito: sem ele a lista vira List<dynamic>, e somar campo
            // dynamic devolve num, o analyze passa e o compilador do web quebra.
            final staff = <GestorStaff>[...(snapshot.data ?? [])]..sort((a, b) => b.monthRevenue.compareTo(a.monthRevenue));

            // Mesma leitura do painel web: o mes primeiro (e assim que comissao
            // fecha), depois barbeiro por barbeiro.
            final ativos = staff.where((s) => s.isActive).toList();
            final receitaMes = ativos.fold<double>(0, (a, s) => a + s.monthRevenue);
            final cortesMes = ativos.fold<int>(0, (a, s) => a + s.monthAppointments);
            final comissoes = ativos.fold<double>(0, (a, s) => a + s.monthRevenue * s.commissionRate);
            final ocupacao = ativos.isEmpty ? 0 : (ativos.fold<int>(0, (a, s) => a + s.occupancy) / ativos.length).round();
            final hojeDia = DateTime.now().weekday % 7;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                // Indicadores do mes
                Container(
                  decoration: BoxDecoration(
                    color: palette.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: palette.border),
                  ),
                  child: Column(
                    children: [
                      Row(children: [
                        Expanded(child: _KpiEquipe(rotulo: 'Receita da equipe', valor: _money(receitaMes), nota: '$cortesMes corte${cortesMes == 1 ? '' : 's'} no mês', palette: palette)),
                        Container(width: 1, height: 52, color: palette.border),
                        Expanded(child: _KpiEquipe(rotulo: 'Comissões a pagar', valor: _money(comissoes), nota: 'sobre o concluído', palette: palette)),
                      ]),
                      Divider(height: 1, color: palette.border),
                      Row(children: [
                        Expanded(child: _KpiEquipe(rotulo: 'Cortes no mês', valor: '$cortesMes', nota: ativos.isEmpty ? 'sem barbeiro ativo' : 'média de ${(cortesMes / ativos.length).toStringAsFixed(1).replaceAll('.', ',')} por barbeiro', palette: palette)),
                        Container(width: 1, height: 52, color: palette.border),
                        Expanded(child: _KpiEquipe(rotulo: 'Ocupação média', valor: '$ocupacao%', nota: '${100 - ocupacao}% ainda livre', palette: palette)),
                      ]),
                    ],
                  ),
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
                  final isTop = i == 0 && member.monthRevenue > 0 && member.isActive;
                  final pico = member.last7.isEmpty ? 1 : member.last7.reduce((a, b) => a > b ? a : b).clamp(1, 999);
                  return RiseIn(
                    delay: Duration(milliseconds: 30 * i),
                    child: GestureDetector(
                      onTap: () => _openForm(editing: member),
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: palette.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: member.isActive ? palette.border : palette.border.withValues(alpha: 0.5)),
                        ),
                        child: Opacity(
                          opacity: member.isActive ? 1 : 0.55,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Identificacao
                              Row(
                                children: [
                                  Container(
                                    width: 46,
                                    height: 46,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: accent,
                                      borderRadius: BorderRadius.circular(14),
                                      image: avatarUrl != null ? DecorationImage(image: NetworkImage(avatarUrl), fit: BoxFit.cover) : null,
                                    ),
                                    child: avatarUrl != null
                                        ? null
                                        : Text(_initials(member.name),
                                            style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.w900, fontSize: 15)),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(children: [
                                          Flexible(
                                            child: Text(member.name,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
                                          ),
                                          if (isTop) ...[
                                            const SizedBox(width: 6),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: accent.withValues(alpha: 0.14),
                                                borderRadius: BorderRadius.circular(20),
                                                border: Border.all(color: accent.withValues(alpha: 0.4)),
                                              ),
                                              child: Text('TOP', style: TextStyle(color: accent, fontSize: 9.5, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                                            ),
                                          ],
                                        ]),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${_rotuloCargo(member.role)} · ${member.hasLogin ? 'App ativo' : 'Sem app'}${member.isActive ? '' : ' · Inativo'}',
                                          style: TextStyle(
                                            color: member.hasLogin ? const Color(0xFF34D399) : palette.textFaint,
                                            fontSize: 11.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(Icons.chevron_right_rounded, size: 20, color: palette.textFaint),
                                ],
                              ),

                              // Numeros do mes
                              const SizedBox(height: 12),
                              Container(
                                decoration: BoxDecoration(
                                  color: palette.bg,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: palette.border),
                                ),
                                child: Row(children: [
                                  Expanded(child: _CelulaMes(rotulo: 'Cortes', valor: '${member.monthAppointments}', palette: palette)),
                                  Container(width: 1, height: 38, color: palette.border),
                                  Expanded(child: _CelulaMes(rotulo: 'Receita', valor: _money(member.monthRevenue), palette: palette)),
                                  Container(width: 1, height: 38, color: palette.border),
                                  Expanded(child: _CelulaMes(rotulo: 'Comissão ${(member.commissionRate * 100).round()}%', valor: _money(member.monthRevenue * member.commissionRate), palette: palette, destaque: accent)),
                                ]),
                              ),

                              // Ocupacao
                              const SizedBox(height: 12),
                              Row(children: [
                                Text('Ocupação da agenda', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                                const Spacer(),
                                Text('${member.occupancy}%', style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w800)),
                              ]),
                              const SizedBox(height: 6),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: LinearProgressIndicator(
                                  value: (member.occupancy / 100).clamp(0.0, 1.0),
                                  minHeight: 5,
                                  backgroundColor: palette.surfaceAlt,
                                  valueColor: AlwaysStoppedAnimation(accent),
                                ),
                              ),

                              // Ritmo da semana
                              if (member.last7.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                Row(children: [
                                  Text('Últimos 7 dias', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                                  const Spacer(),
                                  if (member.avgRating != null)
                                    Text('${member.avgRating!.toStringAsFixed(1).replaceAll('.', ',')} · ',
                                        style: TextStyle(color: accent, fontSize: 11.5, fontWeight: FontWeight.w700)),
                                  Text('${member.clientsCount} cliente${member.clientsCount == 1 ? '' : 's'}',
                                      style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                                ]),
                                const SizedBox(height: 7),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: List.generate(member.last7.length, (d) {
                                    final qtd = member.last7[d];
                                    return Expanded(
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 2.5),
                                        child: Column(
                                          children: [
                                            Container(
                                              height: qtd > 0 ? 12 + (qtd / pico) * 22 : 12,
                                              decoration: BoxDecoration(
                                                color: qtd > 0 ? accent : palette.surfaceAlt,
                                                borderRadius: BorderRadius.circular(5),
                                              ),
                                            ),
                                            const SizedBox(height: 5),
                                            Text(_diasCurtos[(hojeDia - 6 + d + 7) % 7],
                                                style: TextStyle(color: palette.textFaint, fontSize: 9.5)),
                                          ],
                                        ),
                                      ),
                                    );
                                  }),
                                ),
                              ],
                            ],
                          ),
                        ),
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

// Valor compacto: R$1.2k acima de mil, R$350 abaixo. Mantém o card enxuto.
String _money(double v) {
  if (v >= 1000) {
    final k = v / 1000;
    return 'R\$${k.toStringAsFixed(k >= 10 ? 0 : 1)}k';
  }
  return 'R\$${v.toStringAsFixed(0)}';
}

// Célula de estatística: valor em destaque, rótulo discreto embaixo. Sem caixa
// colorida nem ícone, três delas numa linha, separadas por um fio fino.

const _cargos = {'BARBER': 'Barbeiro', 'MANAGER': 'Gerente', 'OWNER': 'Dono', 'ASSISTANT': 'Auxiliar'};
String _rotuloCargo(String c) => _cargos[c.toUpperCase()] ?? c;

// Iniciais dos dias por getDay() (domingo = 0).
const _diasCurtos = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/// Indicador do mês na faixa do topo: rótulo, valor grande e uma nota curta
/// dizendo o que o número significa.
class _KpiEquipe extends StatelessWidget {
  final String rotulo;
  final String valor;
  final String nota;
  final AppPalette palette;

  const _KpiEquipe({required this.rotulo, required this.valor, required this.nota, required this.palette});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(rotulo, style: TextStyle(color: palette.textFaint, fontSize: 11)),
          const SizedBox(height: 3),
          Text(valor, style: TextStyle(color: palette.textPrimary, fontSize: 19, fontWeight: FontWeight.w900, letterSpacing: -0.4)),
          const SizedBox(height: 2),
          Text(nota, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: palette.textFaint, fontSize: 10)),
        ],
      ),
    );
  }
}

/// Uma das três células de número do mês dentro do cartão do barbeiro.
class _CelulaMes extends StatelessWidget {
  final String rotulo;
  final String valor;
  final AppPalette palette;
  final Color? destaque;

  const _CelulaMes({required this.rotulo, required this.valor, required this.palette, this.destaque});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(rotulo, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: palette.textFaint, fontSize: 10)),
          const SizedBox(height: 2),
          Text(valor, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: TextStyle(color: destaque ?? palette.textPrimary, fontSize: 14.5, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}
