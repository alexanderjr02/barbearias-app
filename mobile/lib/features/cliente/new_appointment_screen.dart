import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import '../../core/widgets/br_phone_formatter.dart';
import '../../core/widgets/cortix_date_picker.dart';
import '../auth/session_provider.dart';
import 'booking_repository.dart';
import 'client_repository.dart';

class NewAppointmentScreen extends StatefulWidget {
  const NewAppointmentScreen({super.key, this.referencePhoto});

  /// Pre-attached cut photo when the client came from "quero esse de novo".
  final String? referencePhoto;

  @override
  State<NewAppointmentScreen> createState() => _NewAppointmentScreenState();
}

class _NewAppointmentScreenState extends State<NewAppointmentScreen> {
  final _repository = BookingRepository();
  final _phoneController = TextEditingController();
  final _phoneFocus = FocusNode();
  bool _phoneTouched = false;

  // If the client already has a phone on file, we skip asking for it again —
  // shown instead as a confirmed chip they can tap to override just for this
  // booking. Only offer "save for next time" when there was nothing on file.
  bool _hasSavedPhone = false;
  bool _phoneConfirmed = false;
  bool _savePhoneToProfile = true;

  List<ClientBarbershop> _barbershops = [];
  BarbershopDetail? _detail;
  ClientBarbershop? _selectedShop;
  ServiceOption? _selectedService;
  StaffOption? _selectedStaff;
  DateTime? _selectedDate;
  String? _selectedTime;
  DaySlots? _daySlots;

  bool _loadingShops = true;
  bool _loadingDetail = false;
  bool _loadingSlots = false;
  bool _submitting = false;
  String? _error;
  String? _reference;
  final _clientRepo = ClientRepository();

  @override
  void initState() {
    super.initState();
    _reference = widget.referencePhoto;
    _loadBarbershops();
    _phoneFocus.addListener(() {
      if (!_phoneFocus.hasFocus && !_phoneTouched) setState(() => _phoneTouched = true);
    });

    final savedPhone = context.read<SessionProvider>().session?.phone?.trim();
    if (savedPhone != null && savedPhone.length >= 8) {
      _phoneController.text = savedPhone;
      _hasSavedPhone = true;
      _phoneConfirmed = true;
      // Tapping "Alterar" only overrides the number for this one booking —
      // don't silently rewrite their saved profile without the explicit
      // "salvar" checkbox, which only shows up when there was nothing saved.
      _savePhoneToProfile = false;
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _phoneFocus.dispose();
    super.dispose();
  }

  Future<void> _loadBarbershops() async {
    try {
      final shops = await _repository.myBarbershops();
      setState(() {
        _barbershops = shops;
        _loadingShops = false;
      });
      if (shops.length == 1) {
        _selectShop(shops.first);
      }
    } catch (e) {
      setState(() {
        _loadingShops = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _selectShop(ClientBarbershop shop) async {
    setState(() {
      _selectedShop = shop;
      _detail = null;
      _selectedService = null;
      _selectedStaff = null;
      _selectedDate = null;
      _selectedTime = null;
      _daySlots = null;
      _loadingDetail = true;
      _error = null;
    });
    try {
      final detail = await _repository.barbershopDetail(shop.slug);
      setState(() {
        _detail = detail;
        _loadingDetail = false;
        // A single barber is the common case for small shops — pick them
        // automatically so the client goes straight to choosing a service.
        if (detail.staff.length == 1) _selectedStaff = detail.staff.first;
      });
    } catch (e) {
      setState(() {
        _loadingDetail = false;
        _error = e.toString();
      });
    }
  }

  void _selectStaff(StaffOption staff) {
    setState(() {
      _selectedStaff = staff;
      _selectedService = null;
      _selectedTime = null;
      _daySlots = null;
    });
  }

  void _selectService(ServiceOption service) {
    setState(() => _selectedService = service);
    _loadSlots();
  }

  // Real, server-computed times for the chosen staff/date/service — respects
  // working hours, the staff's own days off, already-booked appointments,
  // and (for today) the current time. Replaces the old client-side
  // computation that only looked at the shop's generic weekly hours.
  Future<void> _loadSlots() async {
    final staff = _selectedStaff;
    final service = _selectedService;
    final date = _selectedDate;
    final shop = _selectedShop;
    if (staff == null || service == null || date == null || shop == null) return;

    setState(() {
      _loadingSlots = true;
      _daySlots = null;
      _selectedTime = null;
    });
    try {
      final result = await _repository.fetchSlots(
        barbershopId: shop.id,
        staffId: staff.id,
        date: date,
        duration: service.duration,
      );
      if (!mounted) return;
      setState(() {
        _daySlots = result;
        _loadingSlots = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingSlots = false;
        _error = e is ApiException ? e.message : 'Erro ao carregar horários';
      });
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showCortixDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
      title: 'Escolha o dia',
    );
    if (picked != null) _selectDate(picked);
  }

  void _selectDate(DateTime date) {
    setState(() {
      _selectedDate = date;
      _selectedTime = null; // o horário escolhido não vale para outro dia
    });
    _loadSlots();
  }

  bool get _canSubmit =>
      _selectedShop != null &&
      _selectedService != null &&
      _selectedStaff != null &&
      _selectedDate != null &&
      _selectedTime != null &&
      _phoneController.text.trim().length >= 8;

  Future<void> _joinWaitlist() async {
    final shop = _selectedShop;
    if (shop == null) return;
    try {
      await _repository.joinWaitlist(shop.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(behavior: SnackBarBehavior.floating, content: Text('Você entrou na fila! Avisamos se abrir um horário. 🔔')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(behavior: SnackBarBehavior.floating, content: Text('Não foi possível entrar na fila.')));
      }
    }
  }

  Future<void> _uploadReference() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1400, imageQuality: 88);
    if (file == null || !mounted) return;
    try {
      final url = await _clientRepo.uploadImage(file);
      if (mounted) setState(() => _reference = url);
    } catch (_) {}
  }

  Future<void> _pickFromWallet() async {
    List<CutPhoto> cuts;
    try {
      cuts = await _clientRepo.cuts();
    } catch (_) {
      return;
    }
    if (!mounted) return;
    if (cuts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sua Carteira de Cortes está vazia.')));
      return;
    }
    final palette = AppPalette.of(context);
    final picked = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Escolha da sua Carteira', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              children: [
                for (final c in cuts)
                  GestureDetector(
                    onTap: () => Navigator.of(sheetContext).pop(c.imageUrl),
                    child: ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(resolveAssetUrl(c.imageUrl) ?? c.imageUrl, fit: BoxFit.cover)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
    if (picked != null && mounted) setState(() => _reference = picked);
  }

  Future<void> _submit() async {
    final sessionProvider = context.read<SessionProvider>();
    final session = sessionProvider.session;
    if (!_canSubmit || session == null) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    final phone = _phoneController.text.trim();
    try {
      await _repository.createAppointment(
        barbershopId: _selectedShop!.id,
        staffId: _selectedStaff!.id,
        serviceId: _selectedService!.id,
        date: _selectedDate!,
        startTime: _selectedTime!,
        durationMinutes: _selectedService!.duration,
        clientName: session.name,
        clientPhone: phone,
        totalPrice: _selectedService!.price,
        referencePhoto: _reference,
      );
      // Remember the number for next time — only when it's new or changed,
      // and never lets a save failure block the booking that already went
      // through.
      if (_savePhoneToProfile && phone != (session.phone ?? '')) {
        unawaited(sessionProvider.updateProfile(phone: phone));
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Color _shopAccent(Color fallback) {
    final hex = _detail?.primaryColor;
    if (hex == null) return fallback;
    final cleaned = hex.replaceAll('#', '');
    if (cleaned.length != 6) return fallback;
    final value = int.tryParse(cleaned, radix: 16);
    return value == null ? fallback : Color(0xFF000000 | value);
  }

  String _initials(String name) => name.trim().isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase();

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = _shopAccent(Theme.of(context).colorScheme.primary);
    final onAccent = contrastingTextColor(accent);
    final labelStyle = TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15);
    final coverUrl = resolveAssetUrl(_detail?.coverImage);
    final logoUrl = resolveAssetUrl(_detail?.logo);

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        title: const Text('Novo agendamento'),
        actions: [
          if (_selectedShop != null)
            IconButton(
              tooltip: 'Avise-me se abrir horário',
              onPressed: _joinWaitlist,
              icon: const Icon(Icons.notifications_active_outlined),
            ),
        ],
      ),
      body: _loadingShops
          ? const Center(child: CircularProgressIndicator())
          : _barbershops.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'Você ainda não está cadastrado em nenhuma barbearia. Peça para o gestor te cadastrar primeiro.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: palette.textFaint),
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  children: [
                    if (_barbershops.length > 1) ...[
                      Text('Barbearia', style: labelStyle),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        children: _barbershops.map((s) {
                          final selected = _selectedShop?.id == s.id;
                          return GestureDetector(
                            onTap: () => _selectShop(s),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                              decoration: BoxDecoration(
                                color: selected ? accent.withValues(alpha: 0.18) : palette.surfaceAlt,
                                borderRadius: BorderRadius.circular(20),
                                border: selected ? Border.all(color: accent.withValues(alpha: 0.5)) : null,
                              ),
                              child: Text(s.name, style: TextStyle(color: selected ? palette.textPrimary : palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600)),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 20),
                    ],
                    if (_loadingDetail) const Center(child: CircularProgressIndicator()),
                    if (_detail != null) ...[
                      if (coverUrl != null || logoUrl != null) ...[
                        RiseIn(
                          child: Container(
                            height: 84,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(18),
                              image: coverUrl != null ? DecorationImage(image: NetworkImage(coverUrl), fit: BoxFit.cover, colorFilter: ColorFilter.mode(Colors.black.withValues(alpha: 0.35), BlendMode.darken)) : null,
                              color: coverUrl == null ? palette.surface : null,
                            ),
                            padding: const EdgeInsets.all(14),
                            alignment: Alignment.centerLeft,
                            child: Row(
                              children: [
                                if (logoUrl != null) ...[
                                  CircleAvatar(radius: 20, backgroundColor: palette.surfaceAlt, backgroundImage: NetworkImage(logoUrl)),
                                  const SizedBox(width: 12),
                                ],
                                Expanded(
                                  child: Text(
                                    _detail!.name,
                                    style: TextStyle(color: coverUrl != null ? Colors.white : palette.textPrimary, fontWeight: FontWeight.w800, fontSize: 16),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                      _StepLabel(
                        step: 1,
                        label: 'Escolha o profissional',
                        done: _selectedStaff != null,
                        palette: palette,
                        accent: accent,
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 140,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _detail!.staff.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 10),
                          itemBuilder: (context, i) {
                            final s = _detail!.staff[i];
                            return RiseIn(
                              delay: Duration(milliseconds: 30 * i),
                              child: _BarberCard(
                                staff: s,
                                selected: _selectedStaff?.id == s.id,
                                accent: accent,
                                palette: palette,
                                initials: _initials,
                                onTap: () => _selectStaff(s),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 22),
                      if (_selectedStaff == null)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Text('Escolha um profissional para ver os serviços disponíveis.', style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
                        )
                      else ...[
                        _StepLabel(
                          step: 2,
                          label: 'Serviços com ${_selectedStaff!.name.split(' ').first}',
                          done: _selectedService != null,
                          palette: palette,
                          accent: accent,
                        ),
                        const SizedBox(height: 12),
                        ..._detail!.services.asMap().entries.map((entry) {
                          final s = entry.value;
                          final selected = _selectedService?.id == s.id;
                          return RiseIn(
                            delay: Duration(milliseconds: 20 * entry.key),
                            child: _ServiceCard(
                              service: s,
                              selected: selected,
                              accent: accent,
                              palette: palette,
                              onTap: () => _selectService(s),
                            ),
                          );
                        }),
                      ],
                      const SizedBox(height: 12),
                      _StepLabel(
                        step: 3,
                        label: 'Data',
                        done: _selectedDate != null,
                        palette: palette,
                        accent: accent,
                        trailing: GestureDetector(
                          onTap: _pickDate,
                          child: Row(
                            children: [
                              Icon(Icons.calendar_month_rounded, size: 14, color: accent),
                              const SizedBox(width: 4),
                              Text('outra data',
                                  style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Tira de dias no lugar do botão "Escolher data": abrir um
                      // calendário modal para marcar "amanhã" é atrito puro, e é
                      // amanhã ou depois que quase todo agendamento cai.
                      _DayStrip(
                        selected: _selectedDate,
                        accent: accent,
                        palette: palette,
                        onSelect: _selectDate,
                      ),
                      if (_selectedDate != null) ...[
                        const SizedBox(height: 20),
                        _StepLabel(
                          step: 4,
                          label: 'Horário',
                          done: _selectedTime != null,
                          palette: palette,
                          accent: accent,
                          trailing: _daySlots?.isOpen == true && _daySlots?.openTime != null
                              ? Text('${_daySlots!.openTime} às ${_daySlots!.closeTime}',
                                  style: TextStyle(color: palette.textFaint, fontSize: 11.5))
                              : null,
                        ),
                        const SizedBox(height: 12),
                        Builder(builder: (context) {
                          if (_selectedStaff == null || _selectedService == null) {
                            return Text('Escolha um profissional e um serviço para ver os horários.', style: TextStyle(color: palette.textFaint));
                          }
                          if (_loadingSlots) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(vertical: 8),
                              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                            );
                          }
                          final daySlots = _daySlots;
                          if (daySlots == null) return const SizedBox.shrink();
                          if (!daySlots.isOpen) {
                            return Text(
                              daySlots.source == 'blocked' ? 'Esse profissional está de folga nesse dia.' : 'Fechado neste dia.',
                              style: TextStyle(color: palette.textFaint),
                            );
                          }
                          if (daySlots.slots.isEmpty) {
                            return Text('Nenhum horário disponível nesse dia.', style: TextStyle(color: palette.textFaint));
                          }
                          return Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: daySlots.slots.map((slot) {
                              final selected = _selectedTime == slot.time;
                              final disabled = !slot.isAvailable;
                              return GestureDetector(
                                onTap: disabled ? null : () => setState(() => _selectedTime = slot.time),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                                  decoration: BoxDecoration(
                                    color: disabled ? palette.surfaceAlt.withValues(alpha: 0.5) : (selected ? accent : palette.surfaceAlt),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    slot.time,
                                    style: TextStyle(
                                      color: disabled ? palette.textFaint : (selected ? onAccent : palette.textSecondary),
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      decoration: disabled ? TextDecoration.lineThrough : null,
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          );
                        }),
                      ],
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Text('Seu telefone', style: labelStyle),
                          if (!_phoneConfirmed) ...[
                            const SizedBox(width: 4),
                            Text('*', style: TextStyle(color: kDangerColor, fontWeight: FontWeight.bold, fontSize: 15)),
                          ],
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (_phoneConfirmed)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                          decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
                          child: Row(
                            children: [
                              Icon(Icons.check_circle_rounded, size: 18, color: accent),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(_phoneController.text, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600)),
                              ),
                              GestureDetector(
                                onTap: () => setState(() => _phoneConfirmed = false),
                                child: Text('Alterar', style: TextStyle(color: accent, fontWeight: FontWeight.w700, fontSize: 12.5)),
                              ),
                            ],
                          ),
                        )
                      else ...[
                        Builder(builder: (context) {
                          final invalid = _phoneTouched && _phoneController.text.trim().length < 8;
                          return TextField(
                            controller: _phoneController,
                            focusNode: _phoneFocus,
                            keyboardType: TextInputType.phone,
                            inputFormatters: [BrPhoneFormatter()],
                            style: TextStyle(color: palette.textPrimary),
                            decoration: InputDecoration(
                              hintText: '(11) 99999-9999',
                              hintStyle: TextStyle(color: palette.textFaint),
                              filled: true,
                              fillColor: palette.surfaceAlt,
                              helperText: invalid ? null : 'Obrigatório para confirmarmos o agendamento.',
                              helperStyle: TextStyle(color: palette.textFaint, fontSize: 11.5),
                              errorText: invalid ? 'Informe um telefone válido para continuar.' : null,
                              errorStyle: TextStyle(color: kDangerColor, fontSize: 11.5),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: accent, width: 1.5)),
                              errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: kDangerColor, width: 1.5)),
                              focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: kDangerColor, width: 1.5)),
                            ),
                            onChanged: (_) => setState(() {}),
                          );
                        }),
                        if (!_hasSavedPhone) ...[
                          const SizedBox(height: 10),
                          GestureDetector(
                            onTap: () => setState(() => _savePhoneToProfile = !_savePhoneToProfile),
                            child: Row(
                              children: [
                                Icon(
                                  _savePhoneToProfile ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                                  size: 19,
                                  color: _savePhoneToProfile ? accent : palette.textFaint,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text('Salvar no meu perfil para não precisar digitar de novo', style: TextStyle(color: palette.textSecondary, fontSize: 12.5)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                      const SizedBox(height: 18),
                      Row(children: [
                        Icon(Icons.auto_awesome_rounded, size: 15, color: accent),
                        const SizedBox(width: 6),
                        Text('Foto de referência (opcional)', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w700, fontSize: 13.5)),
                      ]),
                      const SizedBox(height: 4),
                      Text('Mostre ao barbeiro o corte que você quer.', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                      const SizedBox(height: 10),
                      if (_reference != null)
                        Stack(children: [
                          ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.network(resolveAssetUrl(_reference) ?? _reference!, height: 150, width: double.infinity, fit: BoxFit.cover)),
                          Positioned(
                            top: 6,
                            right: 6,
                            child: GestureDetector(
                              onTap: () => setState(() => _reference = null),
                              child: Container(padding: const EdgeInsets.all(4), decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle), child: const Icon(Icons.close, color: Colors.white, size: 16)),
                            ),
                          ),
                        ])
                      else
                        Row(children: [
                          Expanded(child: OutlinedButton.icon(onPressed: _uploadReference, icon: const Icon(Icons.upload_rounded, size: 18), label: const Text('Enviar foto'), style: OutlinedButton.styleFrom(foregroundColor: accent, side: BorderSide(color: palette.border)))),
                          const SizedBox(width: 10),
                          Expanded(child: OutlinedButton.icon(onPressed: _pickFromWallet, icon: const Icon(Icons.content_cut_rounded, size: 18), label: const Text('Da Carteira'), style: OutlinedButton.styleFrom(foregroundColor: accent, side: BorderSide(color: palette.border)))),
                        ]),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                      ],
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _canSubmit && !_submitting ? _submit : null,
                          style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                          child: _submitting
                              ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: onAccent))
                              : Text('Confirmar agendamento', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ],
                ),
    );
  }
}

/// A "barber card" — photo, first name, specialties tag — used for the
/// professional-picking step of the booking flow instead of a plain text
/// chip, so the client sees who they're actually booking with.
/// Etapa numerada, que vira um "check" quando resolvida.
///
/// Agendar é uma sequência (quem → o quê → quando), mas a tela mostrava só
/// quatro títulos soltos do mesmo tamanho. Numerar e marcar o que já foi
/// feito é o que transforma uma lista de campos num progresso visível — o
/// padrão de todo fluxo de reserva bom.
class _StepLabel extends StatelessWidget {
  final int step;
  final String label;
  final bool done;
  final AppPalette palette;
  final Color accent;
  final Widget? trailing;

  const _StepLabel({
    required this.step,
    required this.label,
    required this.done,
    required this.palette,
    required this.accent,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 240),
          width: 22,
          height: 22,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: done ? accent : accent.withValues(alpha: 0.14),
            border: done ? null : Border.all(color: accent.withValues(alpha: 0.35)),
          ),
          child: done
              ? Icon(Icons.check_rounded, size: 13, color: contrastingTextColor(accent))
              : Text('$step',
                  style: TextStyle(color: accent, fontSize: 11, fontWeight: FontWeight.w900)),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: palette.textPrimary,
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
        ),
        ?trailing,
      ],
    );
  }
}

/// Tira horizontal com os próximos dias.
///
/// O calendário modal continua existindo ("outra data"), mas escondido atrás
/// de um toque: a esmagadora maioria dos agendamentos é para hoje, amanhã ou
/// essa semana, e para esses o dia certo já está na tela.
class _DayStrip extends StatelessWidget {
  final DateTime? selected;
  final Color accent;
  final AppPalette palette;
  final ValueChanged<DateTime> onSelect;

  const _DayStrip({
    required this.selected,
    required this.accent,
    required this.palette,
    required this.onSelect,
  });

  static const _weekdays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  static const _days = 14;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return SizedBox(
      height: 74,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _days,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final date = today.add(Duration(days: i));
          final isSelected = selected != null &&
              selected!.year == date.year &&
              selected!.month == date.month &&
              selected!.day == date.day;

          return GestureDetector(
            onTap: () => onSelect(date),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 56,
              decoration: BoxDecoration(
                color: isSelected ? accent : palette.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected ? accent : palette.textFaint.withValues(alpha: 0.14),
                ),
                boxShadow: isSelected
                    ? [BoxShadow(color: accent.withValues(alpha: 0.3), blurRadius: 14, offset: const Offset(0, 6))]
                    : null,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    i == 0 ? 'HOJE' : _weekdays[date.weekday - 1],
                    style: TextStyle(
                      color: isSelected
                          ? contrastingTextColor(accent).withValues(alpha: 0.8)
                          : palette.textFaint,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    date.day.toString().padLeft(2, '0'),
                    style: TextStyle(
                      color: isSelected ? contrastingTextColor(accent) : palette.textPrimary,
                      fontSize: 19,
                      fontWeight: FontWeight.w900,
                      height: 1,
                      letterSpacing: -0.6,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _BarberCard extends StatelessWidget {
  final StaffOption staff;
  final bool selected;
  final Color accent;
  final AppPalette palette;
  final String Function(String) initials;
  final VoidCallback onTap;

  const _BarberCard({
    required this.staff,
    required this.selected,
    required this.accent,
    required this.palette,
    required this.initials,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final avatarUrl = resolveAssetUrl(staff.avatar);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        width: 92,
        padding: const EdgeInsets.fromLTRB(6, 10, 6, 10),
        decoration: BoxDecoration(
          gradient: selected
              ? LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [accent.withValues(alpha: 0.22), palette.surface],
                )
              : null,
          color: selected ? null : palette.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? accent : palette.textFaint.withValues(alpha: 0.12),
            width: selected ? 2 : 1,
          ),
          boxShadow: selected
              ? [BoxShadow(color: accent.withValues(alpha: 0.28), blurRadius: 18, offset: const Offset(0, 8))]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              alignment: Alignment.center,
              clipBehavior: Clip.none,
              children: [
                // A foto é o que o cliente realmente usa para escolher — ela
                // ganha anel da cor da marca quando selecionada, do mesmo jeito
                // que a logo da barbearia aparece no topo.
                Container(
                  padding: const EdgeInsets.all(2.5),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: selected
                          ? [accent, accent.withValues(alpha: 0.4)]
                          : [palette.textFaint.withValues(alpha: 0.22), palette.textFaint.withValues(alpha: 0.08)],
                    ),
                  ),
                  child: CircleAvatar(
                    radius: 25,
                    backgroundColor: palette.surfaceAlt,
                    backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                    child: avatarUrl == null
                        ? Text(initials(staff.name),
                            style: TextStyle(
                                color: selected ? accent : palette.textSecondary,
                                fontWeight: FontWeight.w900,
                                fontSize: 16))
                        : null,
                  ),
                ),
                if (selected)
                  Positioned(
                    bottom: -1,
                    right: 4,
                    child: Container(
                      padding: const EdgeInsets.all(3.5),
                      decoration: BoxDecoration(
                        color: accent,
                        shape: BoxShape.circle,
                        border: Border.all(color: palette.surface, width: 2.5),
                      ),
                      child: Icon(Icons.check_rounded, size: 11, color: contrastingTextColor(accent)),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 7),
            Text(
              staff.name.split(' ').first,
              style: TextStyle(
                color: selected ? accent : palette.textPrimary,
                fontWeight: FontWeight.w800,
                fontSize: 12.5,
                letterSpacing: -0.2,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (staff.specialties != null && staff.specialties!.trim().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text(
                  staff.specialties!,
                  style: TextStyle(color: palette.textFaint, fontSize: 9.5, height: 1.2),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// A richer service row (vs. a plain chip) — leading image/icon, name +
/// description, duration and price — shown once a barber is picked, framed
/// as "services with {barber}" even though the catalog itself isn't
/// filtered per barber server-side.
class _ServiceCard extends StatelessWidget {
  final ServiceOption service;
  final bool selected;
  final Color accent;
  final AppPalette palette;
  final VoidCallback onTap;

  const _ServiceCard({required this.service, required this.selected, required this.accent, required this.palette, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final imageUrl = resolveAssetUrl(service.image);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: palette.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? accent.withValues(alpha: 0.6) : Colors.transparent, width: 1.5),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: palette.surfaceAlt,
                borderRadius: BorderRadius.circular(10),
                image: imageUrl != null ? DecorationImage(image: NetworkImage(imageUrl), fit: BoxFit.cover) : null,
              ),
              child: imageUrl == null ? Icon(Icons.content_cut_rounded, size: 18, color: palette.textFaint) : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(service.name, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5), overflow: TextOverflow.ellipsis),
                  Text('${service.duration}min', style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                ],
              ),
            ),
            Text('R\$ ${service.price.toStringAsFixed(0)}', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 13.5)),
            const SizedBox(width: 10),
            if (selected)
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
                child: Icon(Icons.check, size: 13, color: contrastingTextColor(accent)),
              )
            else
              Icon(Icons.radio_button_unchecked, size: 20, color: palette.textFaint),
          ],
        ),
      ),
    );
  }
}
