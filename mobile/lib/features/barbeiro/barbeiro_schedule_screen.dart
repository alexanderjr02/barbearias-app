import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_toast.dart';
import '../auth/session_provider.dart';
import 'barber_repository.dart';

const _dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/// Real self-service autonomy for the barber over their own agenda: pick a
/// custom weekly schedule (or follow the shop's default), and block one-off
/// days (vacation, appointments, etc.) — no gestor needed. Mirrors the
/// "Horário" editor the gestor has for each barber on the web dashboard,
/// backed by the exact same GET/PUT /staff/{id}/availability and
/// GET/POST/DELETE /staff/{id}/time-off endpoints.
class BarbeiroScheduleScreen extends StatefulWidget {
  const BarbeiroScheduleScreen({super.key});

  @override
  State<BarbeiroScheduleScreen> createState() => _BarbeiroScheduleScreenState();
}

class _BarbeiroScheduleScreenState extends State<BarbeiroScheduleScreen> {
  final _repository = BarberRepository();
  final _reasonController = TextEditingController();

  StaffSchedule? _schedule;
  List<TimeOffEntry> _timeOff = [];
  DateTime? _blockDate;
  bool _loading = true;
  bool _saving = false;
  bool _blocking = false;
  String? _error;
  String? _blockError;

  String? get _staffId => context.read<SessionProvider>().session?.staffId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final staffId = _staffId;
    if (staffId == null) {
      setState(() {
        _loading = false;
        _error = 'Nenhum perfil de barbeiro vinculado a esta conta.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([_repository.mySchedule(staffId), _repository.myTimeOff(staffId)]);
      if (!mounted) return;
      setState(() {
        _schedule = results[0] as StaffSchedule;
        _timeOff = results[1] as List<TimeOffEntry>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Erro ao carregar horário';
      });
    }
  }

  void _updateDay(int dayOfWeek, ScheduleDay Function(ScheduleDay) update) {
    final schedule = _schedule;
    if (schedule == null) return;
    setState(() {
      final newDays = schedule.days.map((d) => d.dayOfWeek == dayOfWeek ? update(d) : d).toList();
      _schedule = StaffSchedule(days: newDays, shopHours: schedule.shopHours);
    });
  }

  Future<void> _saveSchedule() async {
    final staffId = _staffId;
    final schedule = _schedule;
    if (staffId == null || schedule == null) return;
    setState(() => _saving = true);
    try {
      await _repository.saveSchedule(staffId, schedule.days);
      if (!mounted) return;
      AppToast.success(context, 'Horário salvo!');
    } on ApiException catch (e) {
      if (mounted) AppToast.error(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickBlockDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(context: context, initialDate: now, firstDate: now, lastDate: now.add(const Duration(days: 365)));
    if (picked != null) setState(() => _blockDate = picked);
  }

  Future<void> _addBlock() async {
    final staffId = _staffId;
    final date = _blockDate;
    if (staffId == null || date == null) return;
    setState(() {
      _blocking = true;
      _blockError = null;
    });
    try {
      final dateStr = '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      await _repository.addTimeOff(staffId, date: dateStr, reason: _reasonController.text.trim());
      final list = await _repository.myTimeOff(staffId);
      if (!mounted) return;
      setState(() {
        _timeOff = list;
        _blockDate = null;
        _reasonController.clear();
        _blocking = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _blocking = false;
        _blockError = e.message;
      });
    }
  }

  Future<void> _removeBlock(TimeOffEntry entry) async {
    final staffId = _staffId;
    if (staffId == null) return;
    try {
      await _repository.removeTimeOff(staffId, entry.id);
      if (!mounted) return;
      setState(() => _timeOff = _timeOff.where((t) => t.id != entry.id).toList());
    } on ApiException catch (e) {
      if (mounted) AppToast.error(context, e.message);
    }
  }

  // StaffTimeOff.date is a UTC-midnight instant — format it in UTC so it
  // doesn't silently shift a day back for negative-offset timezones.
  String _formatBlockedDate(String iso) {
    final d = DateTime.parse(iso).toUtc();
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  Future<void> _pickTime(ScheduleDay day, {required bool isStart}) async {
    final current = isStart ? day.startTime : day.endTime;
    final parts = current.split(':').map(int.parse).toList();
    final picked = await showTimePicker(context: context, initialTime: TimeOfDay(hour: parts[0], minute: parts[1]));
    if (picked == null) return;
    final formatted = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    _updateDay(day.dayOfWeek, (d) => ScheduleDay(
          dayOfWeek: d.dayOfWeek,
          mode: d.mode,
          startTime: isStart ? formatted : d.startTime,
          endTime: isStart ? d.endTime : formatted,
        ));
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(backgroundColor: palette.bg, title: const Text('Meus horários')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _schedule == null
              ? Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(child: Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: palette.textFaint))),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  children: [
                    Text('Horário semanal', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text('Escolha os dias e horários em que você atende.', style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
                    const SizedBox(height: 14),
                    ..._schedule!.days.map((day) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(14)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(_dayNames[day.dayOfWeek], style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5)),
                                  _ModeToggle(
                                    mode: day.mode,
                                    accent: accent,
                                    palette: palette,
                                    onChanged: (mode) => _updateDay(day.dayOfWeek, (d) => ScheduleDay(dayOfWeek: d.dayOfWeek, mode: mode, startTime: d.startTime, endTime: d.endTime)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              if (day.mode == 'default') Text(_schedule!.describeDefault(day.dayOfWeek), style: TextStyle(color: palette.textFaint, fontSize: 12)),
                              if (day.mode == 'closed') Text('Você não atende nesse dia', style: TextStyle(color: palette.textFaint, fontSize: 12)),
                              if (day.mode == 'custom')
                                Row(
                                  children: [
                                    _TimeChip(label: day.startTime, palette: palette, onTap: () => _pickTime(day, isStart: true)),
                                    Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text('até', style: TextStyle(color: palette.textFaint, fontSize: 12))),
                                    _TimeChip(label: day.endTime, palette: palette, onTap: () => _pickTime(day, isStart: false)),
                                  ],
                                ),
                            ],
                          ),
                        )),
                    const SizedBox(height: 6),
                    SizedBox(
                      height: 46,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _saveSchedule,
                        style: ElevatedButton.styleFrom(backgroundColor: accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                        child: _saving
                            ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: contrastingTextColor(accent)))
                            : Text('Salvar horário semanal', style: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text('Folgas e bloqueios', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text('Bloqueie dias específicos (férias, consultas...).', style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: _pickBlockDate,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(10)),
                              child: Row(
                                children: [
                                  Icon(Icons.event_busy_outlined, size: 16, color: palette.textSecondary),
                                  const SizedBox(width: 8),
                                  Text(
                                    _blockDate == null
                                        ? 'Escolher data'
                                        : '${_blockDate!.day.toString().padLeft(2, '0')}/${_blockDate!.month.toString().padLeft(2, '0')}/${_blockDate!.year}',
                                    style: TextStyle(color: _blockDate == null ? palette.textFaint : palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 44,
                          child: ElevatedButton(
                            onPressed: _blockDate == null || _blocking ? null : _addBlock,
                            style: ElevatedButton.styleFrom(backgroundColor: palette.surfaceAlt, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                            child: _blocking
                                ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: palette.textPrimary))
                                : Row(children: [Icon(Icons.add, size: 16, color: palette.textPrimary), const SizedBox(width: 4), Text('Bloquear', style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600))]),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _reasonController,
                      style: TextStyle(color: palette.textPrimary, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Motivo (opcional)',
                        hintStyle: TextStyle(color: palette.textFaint, fontSize: 13),
                        filled: true,
                        fillColor: palette.surfaceAlt,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    if (_blockError != null) ...[
                      const SizedBox(height: 8),
                      Text(_blockError!, style: const TextStyle(color: Colors.redAccent, fontSize: 12.5)),
                    ],
                    const SizedBox(height: 16),
                    if (_timeOff.isEmpty) Text('Nenhuma folga marcada.', style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
                    ..._timeOff.map((t) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(12)),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(_formatBlockedDate(t.date), style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                                    if (t.reason != null && t.reason!.isNotEmpty) Text(t.reason!, style: TextStyle(color: palette.textFaint, fontSize: 11.5)),
                                  ],
                                ),
                              ),
                              IconButton(icon: const Icon(Icons.delete_outline, size: 18), color: palette.textFaint, onPressed: () => _removeBlock(t)),
                            ],
                          ),
                        )),
                  ],
                ),
    );
  }
}

class _ModeToggle extends StatelessWidget {
  final String mode;
  final Color accent;
  final AppPalette palette;
  final ValueChanged<String> onChanged;

  const _ModeToggle({required this.mode, required this.accent, required this.palette, required this.onChanged});

  static const _options = [('default', 'Padrão'), ('custom', 'Próprio'), ('closed', 'Folga')];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: _options.map((opt) {
          final selected = mode == opt.$1;
          return GestureDetector(
            onTap: () => onChanged(opt.$1),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(color: selected ? accent : Colors.transparent, borderRadius: BorderRadius.circular(6)),
              child: Text(opt.$2, style: TextStyle(color: selected ? contrastingTextColor(accent) : palette.textSecondary, fontSize: 11, fontWeight: FontWeight.w700)),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _TimeChip extends StatelessWidget {
  final String label;
  final AppPalette palette;
  final VoidCallback onTap;

  const _TimeChip({required this.label, required this.palette, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(8)),
        child: Text(label, style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
