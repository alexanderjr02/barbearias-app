import 'package:flutter/material.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import 'gestor_repository.dart';
import 'widgets/appointment_steps.dart';

String _dateKey(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

String _addMinutes(String time, int minutes) {
  final parts = time.split(':').map(int.parse).toList();
  final total = parts[0] * 60 + parts[1] + minutes;
  final h = (total ~/ 60) % 24;
  final m = total % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
}

/// The gestor's own booking flow — same step order as the web dashboard's
/// "Novo agendamento" modal (serviço → barbeiro → data/horário → cliente),
/// backed by the exact same real-availability endpoints, so a walk-in gets
/// booked the same way whether the gestor is at the counter or on the phone.
class GestorNewAppointmentScreen extends StatefulWidget {
  const GestorNewAppointmentScreen({super.key});

  @override
  State<GestorNewAppointmentScreen> createState() => _GestorNewAppointmentScreenState();
}

class _GestorNewAppointmentScreenState extends State<GestorNewAppointmentScreen> {
  final _repository = GestorRepository();
  int _step = 1;

  String? _barbershopId;
  List<GestorService> _services = [];
  List<GestorStaff> _staffList = [];
  bool _loadingOptions = true;
  String? _optionsError;

  GestorService? _service;
  GestorStaff? _staff;
  DateTime? _date;
  String? _time;

  GestorDaySlots? _daySlots;
  bool _loadingSlots = false;

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _submitting = false;
  String? _submitError;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _loadOptions();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    try {
      final me = await _repository.me();
      final services = await _repository.services();
      final staffList = await _repository.staff();
      if (!mounted) return;
      setState(() {
        _barbershopId = me.barbershopId;
        _services = services.where((s) => s.isActive).toList();
        _staffList = staffList.where((s) => s.isActive).toList();
        _loadingOptions = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingOptions = false;
        _optionsError = e is ApiException ? e.message : 'Erro ao carregar dados';
      });
    }
  }

  Future<void> _loadSlots() async {
    if (_barbershopId == null || _staff == null || _date == null || _service == null) return;
    setState(() {
      _loadingSlots = true;
      _daySlots = null;
      _time = null;
    });
    try {
      final slots = await _repository.slotsFor(
        barbershopId: _barbershopId!,
        staffId: _staff!.id,
        dateKey: _dateKey(_date!),
        duration: _service!.duration,
      );
      if (!mounted) return;
      setState(() {
        _daySlots = slots;
        _loadingSlots = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingSlots = false);
    }
  }

  void _pickService(GestorService s) => setState(() => _service = s);

  void _pickStaff(GestorStaff s) {
    setState(() => _staff = s);
    _loadSlots();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(context: context, initialDate: now, firstDate: now, lastDate: now.add(const Duration(days: 90)));
    if (picked != null) {
      setState(() => _date = picked);
      _loadSlots();
    }
  }

  bool get _canAdvance {
    if (_step == 1) return _service != null;
    if (_step == 2) return _staff != null;
    if (_step == 3) return _date != null && _time != null;
    if (_step == 4) return _nameController.text.trim().length >= 2 && _phoneController.text.trim().length >= 8;
    return false;
  }

  Future<void> _submit() async {
    if (!_canAdvance || _barbershopId == null) return;
    setState(() {
      _submitting = true;
      _submitError = null;
    });
    try {
      await _repository.createAppointment(
        barbershopId: _barbershopId!,
        staffId: _staff!.id,
        serviceId: _service!.id,
        dateKey: _dateKey(_date!),
        startTime: _time!,
        endTime: _addMinutes(_time!, _service!.duration),
        clientName: _nameController.text.trim(),
        clientPhone: _phoneController.text.trim(),
        totalPrice: _service!.price,
      );
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _done = true;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _submitError = e.message;
      });
    }
  }

  String _initials(String name) => name.trim().isEmpty ? '?' : name.trim().split(RegExp(r'\s+')).map((e) => e[0]).take(2).join().toUpperCase();

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        title: const Text('Novo agendamento'),
        bottom: _done
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(6),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Row(
                    children: [1, 2, 3, 4].map((s) {
                      final active = s <= _step;
                      return Expanded(
                        child: Container(
                          height: 3,
                          margin: const EdgeInsets.only(right: 4),
                          decoration: BoxDecoration(color: active ? accent : palette.surfaceAlt, borderRadius: BorderRadius.circular(2)),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
      ),
      body: _loadingOptions
          ? const Center(child: CircularProgressIndicator())
          : _optionsError != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_optionsError!, style: TextStyle(color: palette.textFaint), textAlign: TextAlign.center)))
              : _done
                  ? AppointmentDoneView(service: _service!, staff: _staff!, date: _date!, time: _time!, clientName: _nameController.text.trim(), onClose: () => Navigator.of(context).pop(true))
                  : SafeArea(
                      child: Column(
                        children: [
                          Expanded(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                              child: _buildStep(palette, accent, onAccent),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            child: Row(
                              children: [
                                if (_step > 1)
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: () => setState(() => _step -= 1),
                                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                                      child: const Text('Voltar'),
                                    ),
                                  ),
                                if (_step > 1) const SizedBox(width: 12),
                                Expanded(
                                  flex: 2,
                                  child: ElevatedButton(
                                    onPressed: !_canAdvance || _submitting
                                        ? null
                                        : () {
                                            if (_step < 4) {
                                              setState(() => _step += 1);
                                            } else {
                                              _submit();
                                            }
                                          },
                                    style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                                    child: _submitting
                                        ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: onAccent))
                                        : Text(_step < 4 ? 'Continuar' : 'Confirmar agendamento', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
    );
  }

  Widget _buildStep(AppPalette palette, Color accent, Color onAccent) {
    switch (_step) {
      case 1:
        return ServiceStep(services: _services, selected: _service, onSelect: _pickService, palette: palette, accent: accent);
      case 2:
        return StaffStep(staffList: _staffList, selected: _staff, onSelect: _pickStaff, palette: palette, accent: accent, onAccent: onAccent, initials: _initials);
      case 3:
        return DateTimeStep(
          date: _date,
          time: _time,
          daySlots: _daySlots,
          loadingSlots: _loadingSlots,
          onPickDate: _pickDate,
          onPickTime: (t) => setState(() => _time = t),
          palette: palette,
          accent: accent,
          onAccent: onAccent,
        );
      case 4:
      default:
        return ClientStep(
          nameController: _nameController,
          phoneController: _phoneController,
          service: _service!,
          staff: _staff!,
          date: _date!,
          time: _time!,
          error: _submitError,
          onChanged: () => setState(() {}),
          palette: palette,
          accent: accent,
        );
    }
  }
}
