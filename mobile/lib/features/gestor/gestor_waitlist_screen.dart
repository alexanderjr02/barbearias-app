import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/br_phone_formatter.dart';
import '../../core/widgets/form_sheet.dart';
import '../../core/widgets/skeleton.dart';
import 'gestor_repository.dart';

String _waiting(String iso) {
  final t = DateTime.tryParse(iso);
  if (t == null) return '';
  final m = DateTime.now().difference(t).inMinutes;
  if (m < 1) return 'agora mesmo';
  if (m < 60) return 'há ${m}min';
  final h = m ~/ 60;
  return 'há ${h}h${m % 60 != 0 ? ' ${m % 60}min' : ''}';
}

class GestorWaitlistScreen extends StatefulWidget {
  const GestorWaitlistScreen({super.key});

  @override
  State<GestorWaitlistScreen> createState() => _GestorWaitlistScreenState();
}

class _GestorWaitlistScreenState extends State<GestorWaitlistScreen> {
  final _repository = GestorRepository();
  late Future<List<WaitlistEntry>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.waitlist();
  }

  void _refresh() => setState(() => _future = _repository.waitlist());

  Future<void> _openAdd() async {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final noteCtrl = TextEditingController();
    final saved = await FormSheet.show(
      context,
      title: 'Adicionar à fila',
      submitLabel: 'Adicionar à fila',
      onSubmit: () async {
        if (nameCtrl.text.trim().isEmpty) throw Exception('Informe o nome.');
        if (phoneCtrl.text.replaceAll(RegExp(r'\D'), '').length < 10) throw Exception('Informe um telefone válido.');
        await _repository.addToWaitlist(
          clientName: nameCtrl.text.trim(),
          clientPhone: phoneCtrl.text.trim(),
          note: noteCtrl.text.trim(),
        );
      },
      children: [
        const FieldLabel('Nome do cliente'),
        CortixField(controller: nameCtrl, hint: 'Ex: Lucas Pereira'),
        const FieldLabel('Telefone / WhatsApp'),
        CortixField(controller: phoneCtrl, keyboardType: TextInputType.phone, hint: '(11) 99999-9999', inputFormatters: [BrPhoneFormatter()]),
        const FieldLabel('Observação (opcional)'),
        CortixField(controller: noteCtrl, hint: 'Ex: corte + barba, prefere o Rafael'),
      ],
    );
    if (saved == true) {
      _refresh();
      if (mounted) AppToast.success(context, 'Adicionado à fila');
    }
  }

  void _notify(WaitlistEntry e) {
    final firstName = e.clientName.split(' ').first;
    final msg = 'Olá, $firstName! Abriu um horário aqui na barbearia. Quer garantir? (${e.clientPhone})';
    Clipboard.setData(ClipboardData(text: msg));
    AppToast.success(context, 'Mensagem copiada — cole no WhatsApp');
  }

  Future<void> _remove(WaitlistEntry e) async {
    try {
      await _repository.removeFromWaitlist(e.id);
      _refresh();
    } catch (_) {
      if (mounted) AppToast.error(context, 'Falha ao remover');
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Fila de espera'), elevation: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAdd,
        backgroundColor: accent,
        icon: Icon(Icons.add, color: contrastingTextColor(accent)),
        label: Text('Adicionar', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: FutureBuilder<List<WaitlistEntry>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                itemCount: 5,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (_, _) => const SkeletonBox(height: 72, borderRadius: 14),
              );
            }
            if (snapshot.hasError) {
              return ListView(children: [const SizedBox(height: 80), Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent)))]);
            }
            final entries = snapshot.data ?? [];
            if (entries.isEmpty) {
              return ListView(
                children: [
                  const SizedBox(height: 100),
                  Icon(Icons.hourglass_empty_rounded, size: 44, color: palette.textFaint),
                  const SizedBox(height: 14),
                  Center(child: Text('Ninguém na fila', style: TextStyle(color: palette.textSecondary, fontWeight: FontWeight.w600))),
                  const SizedBox(height: 4),
                  Center(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 40), child: Text('Sem horário? Adicione o cliente aqui e avise quando abrir uma vaga.', textAlign: TextAlign.center, style: TextStyle(color: palette.textFaint, fontSize: 12.5)))),
                ],
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
              itemCount: entries.length,
              itemBuilder: (context, index) {
                final e = entries[index];
                return RiseIn(
                  delay: Duration(milliseconds: 20 * index),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                    child: Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), shape: BoxShape.circle, border: Border.all(color: accent.withValues(alpha: 0.3))),
                          alignment: Alignment.center,
                          child: Text('${index + 1}', style: TextStyle(color: accent, fontWeight: FontWeight.w900, fontSize: 13)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(e.clientName, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 2),
                              Text('${e.clientPhone} · ${_waiting(e.createdAt)}', style: TextStyle(color: palette.textFaint, fontSize: 11)),
                              if (e.note != null && e.note!.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(e.note!, style: TextStyle(color: palette.textSecondary, fontSize: 11.5), maxLines: 1, overflow: TextOverflow.ellipsis),
                                ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => _notify(e),
                          tooltip: 'Avisar no WhatsApp',
                          icon: const Icon(Icons.chat_rounded, color: Color(0xFF25D366), size: 20),
                        ),
                        IconButton(
                          onPressed: () => _remove(e),
                          tooltip: 'Atendido / remover',
                          icon: Icon(Icons.check_circle_outline_rounded, color: palette.textSecondary, size: 20),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
