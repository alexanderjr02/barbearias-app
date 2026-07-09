import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../auth/session_provider.dart';
import '../gestor/gestor_repository.dart';
import '../gestor/widgets/appointment_steps.dart';

String _dateKey(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

String _addMinutes(String time, int minutes) {
  final parts = time.split(':').map(int.parse).toList();
  final total = parts[0] * 60 + parts[1] + minutes;
  final h = (total ~/ 60) % 24;
  final m = total % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
}

String _minutesToTime(int minutes) {
  final h = (minutes ~/ 60) % 24;
  final m = minutes % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
}

/// The barbeiro's own booking flow — the same trusted engine as the gestor's
/// (real availability, real slots, same confirmation screen) but with the
/// staff-picking step removed entirely: a barber can only ever book time on
/// their own agenda, never anyone else's. When opened from a tap on a free
/// block in the timeline, [initialDate]/[initialStartMinute] skip straight
/// past the date picker with that slot pre-selected.
class BarbeiroNewAppointmentScreen extends StatefulWidget {
  final DateTime? initialDate;
  final int? initialStartMinute;

  const BarbeiroNewAppointmentScreen({super.key, this.initialDate, this.initialStartMinute});

  @override
  State<BarbeiroNewAppointmentScreen> createState() => _BarbeiroNewAppointmentScreenState();
}

class _BarbeiroNewAppointmentScreenState extends State<BarbeiroNewAppointmentScreen> {
  final _repository = GestorRepository();
  int _step = 1;

  String? _barbershopId;
  GestorStaff? _self;
  List<GestorService> _services = [];
  bool _loadingOptions = true;
  String? _optionsError;

  GestorService? _service;
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
    _date = widget.initialDate;
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
      final session = context.read<SessionProvider>().session;
      final staffId = session?.staffId;
      final me = await _repository.me();
      final services = await _repository.services();
      final staffList = await _repository.staff();
      final self = staffList.where((s) => s.id == staffId).cast<GestorStaff?>().firstWhere((_) => true, orElse: () => null);
      if (!mounted) return;
      setState(() {
        _barbershopId = me.barbershopId;
        _services = services.where((s) => s.isActive).toList();
        _self = self;
        _loadingOptions = false;
        _optionsError = self == null ? 'Não foi possível identificar seu cadastro de barbeiro.' : null;
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
    if (_barbershopId == null || _self == null || _date == null || _service == null) return;
    setState(() {
      _loadingSlots = true;
      _daySlots = null;
    });
    try {
      final slots = await _repository.slotsFor(
        barbershopId: _barbershopId!,
        staffId: _self!.id,
        dateKey: _dateKey(_date!),
        duration: _service!.duration,
      );
      if (!mounted) return;
      final wanted = widget.initialStartMinute != null ? _minutesToTime(widget.initialStartMinute!) : null;
      final preselect = wanted != null && slots.slots.any((s) => s.time == wanted && s.isAvailable) ? wanted : null;
      setState(() {
        _daySlots = slots;
        _time = preselect;
        _loadingSlots = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingSlots = false);
    }
  }

  void _pickService(GestorService s) {
    setState(() => _service = s);
    if (_date != null) _loadSlots();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(context: context, initialDate: _date ?? now, firstDate: now, lastDate: now.add(const Duration(days: 90)));
    if (picked != null) {
      setState(() => _date = picked);
      _loadSlots();
    }
  }

  bool get _canAdvance {
    if (_step == 1) return _service != null;
    if (_step == 2) return _date != null && _time != null;
    if (_step == 3) return _nameController.text.trim().length >= 2 && _phoneController.text.trim().length >= 8;
    return false;
  }

  Future<void> _submit() async {
    if (!_canAdvance || _barbershopId == null || _self == null) return;
    setState(() {
      _submitting = true;
      _submitError = null;
    });
    try {
      await _repository.createAppointment(
        barbershopId: _barbershopId!,
        staffId: _self!.id,
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

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);
    const totalSteps = 3;

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
                    children: List.generate(totalSteps, (i) => i + 1).map((s) {
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
                  ? AppointmentDoneView(service: _service!, staff: _self!, date: _date!, time: _time!, clientName: _nameController.text.trim(), onClose: () => Navigator.of(context).pop(true))
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
                                            if (_step < totalSteps) {
                                              setState(() => _step += 1);
                                            } else {
                                              _submit();
                                            }
                                          },
                                    style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                                    child: _submitting
                                        ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: onAccent))
                                        : Text(_step < totalSteps ? 'Continuar' : 'Confirmar agendamento', style: TextStyle(color: onAccent, fontWeight: FontWeight.bold)),
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
      case 3:
      default:
        return ClientStep(
          nameController: _nameController,
          phoneController: _phoneController,
          service: _service!,
          staff: _self!,
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
