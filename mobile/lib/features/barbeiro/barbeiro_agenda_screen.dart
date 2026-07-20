import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../auth/session_provider.dart';
import '../../core/widgets/app_toast.dart';
import '../gestor/gestor_repository.dart';
import '../gestor/widgets/barber_day_timeline.dart';
import 'barber_repository.dart';
import 'barbeiro_new_appointment_screen.dart';
import 'barbeiro_schedule_screen.dart';
import 'finalize_appointment_screen.dart';

const _statusLabels = {
  'SCHEDULED': 'Agendado',
  'CONFIRMED': 'Confirmado',
  'IN_PROGRESS': 'Em andamento',
  'COMPLETED': 'Concluído',
  'CANCELLED': 'Cancelado',
  'NO_SHOW': 'Não compareceu',
};

const _weekdaysLong = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const _months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/// The barbeiro's own agenda — the same rich, full-day timeline the gestor
/// gets (hour grid, shaded free time, live "now" line, tap-a-block detail)
/// but scoped to a single column, since there's only ever one barber here:
/// the one holding the phone. The one thing the gestor's view doesn't have:
/// tapping directly on a free block opens booking already pre-filled with
/// that date and time, so seeing an opening and filling it is one tap
/// instead of a full wizard started from a blank slate.
class BarbeiroAgendaScreen extends StatefulWidget {
  const BarbeiroAgendaScreen({super.key});

  @override
  State<BarbeiroAgendaScreen> createState() => _BarbeiroAgendaScreenState();
}

class _BarbeiroAgendaScreenState extends State<BarbeiroAgendaScreen> {
  final _repository = GestorRepository();
  final _barber = BarberRepository();

  CalendarFormat _format = CalendarFormat.week;
  DateTime _focusedDay = _dateOnly(DateTime.now());
  DateTime _selectedDay = _dateOnly(DateTime.now());
  String _statusFilter = 'all';
  bool _searchOpen = false;
  String _search = '';

  String? _barbershopId;
  GestorStaff? _self;

  Map<DateTime, List<GestorAppointment>> _eventsByDay = {};
  bool _loading = true;
  String? _error;

  StaffDaySchedule? _daySchedule;
  bool _loadingSchedule = false;

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);
  static String _dateKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void initState() {
    super.initState();
    _load(_focusedDay);
    _loadDaySchedule(_selectedDay);
  }

  Future<void> _load(DateTime aroundDay) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final session = context.read<SessionProvider>().session;
      final staffId = session?.staffId;
      final barbershopId = _barbershopId ?? (await _repository.me()).barbershopId;
      _barbershopId = barbershopId;
      if (_self == null && staffId != null) {
        final staffList = await _repository.staff();
        _self = staffList.where((s) => s.id == staffId).cast<GestorStaff?>().firstWhere((_) => true, orElse: () => null);
      }
      final rangeStart = DateTime(aroundDay.year, aroundDay.month - 1, 1);
      final rangeEnd = DateTime(aroundDay.year, aroundDay.month + 2, 0);
      final list = staffId == null
          ? <GestorAppointment>[]
          : await _repository.appointments(barbershopId, staffId: staffId, from: _dateKey(rangeStart), to: _dateKey(rangeEnd));
      final map = <DateTime, List<GestorAppointment>>{};
      for (final a in list) {
        final day = _dateOnly(DateTime.parse(a.date));
        map.putIfAbsent(day, () => []).add(a);
      }
      for (final entry in map.entries) {
        entry.value.sort((x, y) => x.startTime.compareTo(y.startTime));
      }
      if (mounted) {
        setState(() {
          _eventsByDay = map;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadDaySchedule(DateTime day) async {
    final session = context.read<SessionProvider>().session;
    final staffId = session?.staffId;
    if (staffId == null) return;
    setState(() => _loadingSchedule = true);
    try {
      final schedule = await _repository.dayScheduleFor(_dateKey(day));
      if (!mounted) return;
      setState(() {
        _daySchedule = schedule.where((s) => s.staffId == staffId).cast<StaffDaySchedule?>().firstWhere((_) => true, orElse: () => null);
        _loadingSchedule = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingSchedule = false);
    }
  }

  List<GestorAppointment> _eventsFor(DateTime day) => _eventsByDay[_dateOnly(day)] ?? const [];

  String _selectedDayLabel() {
    final d = _selectedDay;
    final today = _dateOnly(DateTime.now());
    if (d == today) return 'Hoje';
    if (d == today.add(const Duration(days: 1))) return 'Amanhã';
    if (d == today.subtract(const Duration(days: 1))) return 'Ontem';
    return '${_weekdaysLong[d.weekday % 7]}, ${d.day} de ${_months[d.month - 1]}';
  }

  Future<void> _openNewAppointment({DateTime? initialDate, int? initialStartMinute}) async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => BarbeiroNewAppointmentScreen(initialDate: initialDate, initialStartMinute: initialStartMinute)),
    );
    if (created == true) {
      _load(_focusedDay);
      _loadDaySchedule(_selectedDay);
    }
  }

  Future<void> _changeStatus(BuildContext sheetContext, GestorAppointment apt, String status) async {
    try {
      await _barber.updateStatus(apt.id, status);
      if (mounted && Navigator.of(sheetContext).canPop()) Navigator.of(sheetContext).pop();
      _load(_focusedDay);
      _loadDaySchedule(_selectedDay);
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível atualizar');
    }
  }

  Future<void> _openFinalize(BuildContext sheetContext, GestorAppointment apt) async {
    if (Navigator.of(sheetContext).canPop()) Navigator.of(sheetContext).pop();
    final done = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => FinalizeAppointmentScreen(
        appointmentId: apt.id,
        clientId: apt.clientId,
        clientName: apt.clientName,
        referencePhoto: apt.referencePhoto,
        existingResultPhoto: apt.resultPhoto,
        existingRecipe: apt.hasRecipe
            ? CutRecipe(machine: apt.recipeMachine, finish: apt.recipeFinish, products: apt.recipeProducts, notes: apt.recipeNotes)
            : null,
      ),
    ));
    if (done == true) {
      _load(_focusedDay);
      _loadDaySchedule(_selectedDay);
    }
  }

  void _showAppointmentDetail(GestorAppointment apt) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;
    final onAccent = contrastingTextColor(accent);
    String? aiResult;
    bool aiLoading = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheet) => ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
        child: SafeArea(
          child: SingleChildScrollView(
            child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2))),
            ),
            Text(apt.clientName, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
            const SizedBox(height: 4),
            Text(apt.clientPhone, style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
            const SizedBox(height: 14),
            _DetailRow(label: 'Serviço', value: apt.serviceName, palette: palette),
            _DetailRow(label: 'Horário', value: '${apt.startTime} – ${apt.endTime}', palette: palette),
            _DetailRow(label: 'Status', value: _statusLabels[apt.status] ?? apt.status, palette: palette, valueColor: appointmentStatusColor(apt.status, palette)),
            _DetailRow(label: 'Valor', value: 'R\$ ${apt.totalPrice.toStringAsFixed(2)}', palette: palette, valueColor: accent),
            // ---- Antes / Depois ----
            if ((apt.referencePhoto != null && apt.referencePhoto!.isNotEmpty) || (apt.resultPhoto != null && apt.resultPhoto!.isNotEmpty)) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(apt.resultPhoto != null ? Icons.compare_rounded : Icons.auto_awesome_rounded, size: 15, color: accent),
                  const SizedBox(width: 6),
                  Text(apt.resultPhoto != null ? 'Antes e depois' : 'Referência do cliente', style: TextStyle(color: palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (apt.referencePhoto != null && apt.referencePhoto!.isNotEmpty)
                    Expanded(child: _MiniPhoto(label: apt.resultPhoto != null ? 'Antes' : 'Referência', url: resolveAssetUrl(apt.referencePhoto) ?? apt.referencePhoto!, palette: palette)),
                  if (apt.referencePhoto != null && apt.referencePhoto!.isNotEmpty && apt.resultPhoto != null && apt.resultPhoto!.isNotEmpty)
                    const SizedBox(width: 8),
                  if (apt.resultPhoto != null && apt.resultPhoto!.isNotEmpty)
                    Expanded(child: _MiniPhoto(label: 'Depois', url: resolveAssetUrl(apt.resultPhoto) ?? apt.resultPhoto!, palette: palette)),
                ],
              ),
              // ---- IA lê a referência ----
              if (apt.referencePhoto != null && apt.referencePhoto!.isNotEmpty) ...[
                const SizedBox(height: 10),
                if (aiResult == null)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton.icon(
                      onPressed: aiLoading
                          ? null
                          : () async {
                              setSheet(() => aiLoading = true);
                              try {
                                final res = await _barber.analyzeReference(apt.referencePhoto!);
                                setSheet(() {
                                  aiLoading = false;
                                  aiResult = res ?? 'A análise por IA não está ativada nesta barbearia.';
                                });
                              } catch (_) {
                                setSheet(() {
                                  aiLoading = false;
                                  aiResult = 'Não foi possível analisar agora.';
                                });
                              }
                            },
                      icon: aiLoading
                          ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: accent))
                          : Icon(Icons.auto_awesome_rounded, size: 16, color: accent),
                      label: Text(aiLoading ? 'Analisando…' : 'Analisar com IA', style: TextStyle(color: accent, fontWeight: FontWeight.w700, fontSize: 12.5)),
                      style: OutlinedButton.styleFrom(side: BorderSide(color: accent.withValues(alpha: 0.5)), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                    ),
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: accent.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: accent.withValues(alpha: 0.25))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [Icon(Icons.auto_awesome_rounded, size: 14, color: accent), const SizedBox(width: 6), Text('Leitura da IA', style: TextStyle(color: accent, fontSize: 11.5, fontWeight: FontWeight.w800))]),
                        const SizedBox(height: 6),
                        Text(aiResult!, style: TextStyle(color: palette.textPrimary, fontSize: 12.5, height: 1.5)),
                      ],
                    ),
                  ),
              ],
            ],
            // ---- Receita registrada ----
            if (apt.hasRecipe) ...[
              const SizedBox(height: 16),
              Row(children: [Icon(Icons.receipt_long_rounded, size: 15, color: accent), const SizedBox(width: 6), Text('Receita do corte', style: TextStyle(color: palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w700))]),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
                child: Column(
                  children: [
                    for (final r in [
                      ['Laterais/máquina', apt.recipeMachine],
                      ['Acabamento/topo', apt.recipeFinish],
                      ['Produtos', apt.recipeProducts],
                      ['Observações', apt.recipeNotes],
                    ].where((r) => r[1] != null && r[1]!.isNotEmpty))
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(width: 108, child: Text(r[0]!, style: TextStyle(color: palette.textFaint, fontSize: 12))),
                            Expanded(child: Text(r[1]!, style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w500))),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
            if (apt.clientId != null)
              FutureBuilder<dynamic>(
                future: ApiClient.instance.get('/barber/client-preferences', query: {'clientId': apt.clientId}),
                builder: (context, snap) {
                  final p = snap.data as Map<String, dynamic>?;
                  if (p == null) return const SizedBox.shrink();
                  final chat = {'conversar': 'Adoro conversar', 'tanto_faz': 'Tanto faz', 'silencio': 'Prefiro silêncio'}[p['chat']];
                  final rows = <List<String>>[];
                  void add(String label, String? v) {
                    if (v != null && v.isNotEmpty) rows.add([label, v]);
                  }
                  add('Laterais/máquina', p['machine'] as String?);
                  add('Produtos', p['products'] as String?);
                  add('Alergias', p['allergies'] as String?);
                  add('Bebida', p['drink'] as String?);
                  add('Conversa', chat);
                  add('Observações', p['notes'] as String?);
                  if (rows.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 16),
                      Row(children: [Icon(Icons.badge_rounded, size: 15, color: accent), const SizedBox(width: 6), Text('Preferências do cliente', style: TextStyle(color: palette.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w700))]),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          children: [
                            for (final r in rows)
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 3),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    SizedBox(width: 108, child: Text(r[0], style: TextStyle(color: palette.textFaint, fontSize: 12))),
                                    Expanded(child: Text(r[1], style: TextStyle(color: palette.textPrimary, fontSize: 12.5, fontWeight: FontWeight.w500))),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            // ---- Ações de check-in ao vivo ----
            ..._statusActions(sheetContext, apt, palette, accent, onAccent),
          ],
        ),
      ),
            ),
          ),
        ),
      ),
    );
  }

  /// The live check-in ladder: Agendado → Chegou → Em atendimento → Finalizar.
  List<Widget> _statusActions(BuildContext sheetContext, GestorAppointment apt, AppPalette palette, Color accent, Color onAccent) {
    final s = apt.status;
    if (s == 'CANCELLED' || s == 'NO_SHOW') return const [];

    String? primaryLabel;
    IconData? primaryIcon;
    VoidCallback? primaryAction;
    var canNoShow = false;

    if (s == 'SCHEDULED' || s == 'CONFIRMED') {
      primaryLabel = 'Cliente chegou';
      primaryIcon = Icons.how_to_reg_rounded;
      primaryAction = () => _changeStatus(sheetContext, apt, 'ARRIVED');
      canNoShow = true;
    } else if (s == 'ARRIVED') {
      primaryLabel = 'Iniciar atendimento';
      primaryIcon = Icons.play_arrow_rounded;
      primaryAction = () => _changeStatus(sheetContext, apt, 'IN_PROGRESS');
      canNoShow = true;
    } else if (s == 'IN_PROGRESS') {
      primaryLabel = 'Finalizar atendimento';
      primaryIcon = Icons.check_circle_rounded;
      primaryAction = () => _openFinalize(sheetContext, apt);
    } else if (s == 'COMPLETED') {
      return [
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => _openFinalize(sheetContext, apt),
            icon: Icon(Icons.edit_rounded, size: 16, color: accent),
            label: Text('Editar resultado / receita', style: TextStyle(color: accent, fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(side: BorderSide(color: accent.withValues(alpha: 0.5)), padding: const EdgeInsets.symmetric(vertical: 13)),
          ),
        ),
      ];
    }

    return [
      const SizedBox(height: 20),
      if (primaryLabel != null)
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: primaryAction,
            icon: Icon(primaryIcon, size: 19, color: onAccent),
            label: Text(primaryLabel, style: TextStyle(color: onAccent, fontWeight: FontWeight.bold, fontSize: 14.5)),
            style: ElevatedButton.styleFrom(backgroundColor: accent, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
          ),
        ),
      if (canNoShow) ...[
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: TextButton(
            onPressed: () => _changeStatus(sheetContext, apt, 'NO_SHOW'),
            child: const Text('Cliente não veio', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600)),
          ),
        ),
      ],
    ];
  }

  void _openFilterSheet() {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    final searched = _eventsFor(_selectedDay).where((a) {
      return _search.isEmpty || a.clientName.toLowerCase().contains(_search.toLowerCase()) || a.serviceName.toLowerCase().contains(_search.toLowerCase());
    }).toList();
    final counts = <String, int>{'all': searched.length};
    for (final s in _statusLabels.keys) {
      counts[s] = searched.where((a) => a.status == s).length;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
          child: SafeArea(
            child: SingleChildScrollView(
              child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2))),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Filtrar por status', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
                  if (_statusFilter != 'all')
                    GestureDetector(
                      onTap: () {
                        setState(() => _statusFilter = 'all');
                        setSheetState(() {});
                      },
                      child: Text('Limpar', style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              ...['all', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((s) {
                final selected = _statusFilter == s;
                final dotColor = s == 'all' ? palette.textFaint : appointmentStatusColor(s, palette);
                final count = counts[s] ?? 0;
                return InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () {
                    setState(() => _statusFilter = s);
                    setSheetState(() {});
                    Navigator.of(sheetContext).pop();
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                    decoration: BoxDecoration(color: selected ? accent.withValues(alpha: 0.12) : Colors.transparent, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        Container(width: 9, height: 9, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            s == 'all' ? 'Todos' : _statusLabels[s] ?? s,
                            style: TextStyle(color: palette.textPrimary, fontSize: 14, fontWeight: selected ? FontWeight.w700 : FontWeight.w500),
                          ),
                        ),
                        Text('$count', style: TextStyle(color: palette.textFaint, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(width: 10),
                        Icon(Icons.check_circle_rounded, size: 18, color: selected ? accent : Colors.transparent),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
              ),
            ),
          ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    final dayEvents = _eventsFor(_selectedDay).where((a) {
      final matchStatus = _statusFilter == 'all' || a.status == _statusFilter;
      final matchSearch = _search.isEmpty || a.clientName.toLowerCase().contains(_search.toLowerCase()) || a.serviceName.toLowerCase().contains(_search.toLowerCase());
      return matchStatus && matchSearch;
    }).toList();

    return Scaffold(
      backgroundColor: palette.bg,
      appBar: AppBar(
        backgroundColor: palette.bg,
        elevation: 0,
        title: _searchOpen
            ? TextField(
                autofocus: true,
                onChanged: (v) => setState(() => _search = v),
                style: TextStyle(color: palette.textPrimary, fontSize: 15),
                decoration: InputDecoration(hintText: 'Buscar cliente ou serviço...', hintStyle: TextStyle(color: palette.textFaint, fontSize: 14), border: InputBorder.none),
              )
            : const Text('Minha agenda'),
        actions: [
          IconButton(
            icon: Icon(_searchOpen ? Icons.close : Icons.search),
            onPressed: () => setState(() {
              _searchOpen = !_searchOpen;
              if (!_searchOpen) _search = '';
            }),
          ),
          IconButton(
            icon: const Icon(Icons.schedule_outlined),
            tooltip: 'Meus horários',
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BarbeiroScheduleScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.today_outlined),
            tooltip: 'Hoje',
            onPressed: () {
              final today = _dateOnly(DateTime.now());
              setState(() {
                _selectedDay = today;
                _focusedDay = today;
              });
              _load(today);
              _loadDaySchedule(today);
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openNewAppointment(),
        backgroundColor: accent,
        tooltip: 'Novo agendamento',
        child: Icon(Icons.add, color: contrastingTextColor(accent)),
      ),
      body: Column(
        children: [
          AnimatedSize(
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeInOutCubic,
            alignment: Alignment.topCenter,
            child: TableCalendar<GestorAppointment>(
              locale: 'pt_BR',
              firstDay: DateTime.utc(2020, 1, 1),
              lastDay: DateTime.utc(2035, 12, 31),
              focusedDay: _focusedDay,
              currentDay: _dateOnly(DateTime.now()),
              selectedDayPredicate: (day) => isSameDay(day, _selectedDay),
              calendarFormat: _format,
              availableCalendarFormats: const {CalendarFormat.month: 'Mês', CalendarFormat.week: 'Semana'},
              eventLoader: _eventsFor,
              startingDayOfWeek: StartingDayOfWeek.sunday,
              daysOfWeekHeight: 22,
              rowHeight: 44,
              onDaySelected: (selected, focused) {
                setState(() {
                  _selectedDay = _dateOnly(selected);
                  _focusedDay = focused;
                  _format = CalendarFormat.week;
                });
                _loadDaySchedule(_dateOnly(selected));
              },
              onFormatChanged: (format) => setState(() => _format = format),
              onPageChanged: (focused) {
                _focusedDay = focused;
                _load(focused);
              },
              headerStyle: HeaderStyle(
                titleTextStyle: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                formatButtonTextStyle: TextStyle(color: palette.textPrimary, fontSize: 12, fontWeight: FontWeight.w700),
                formatButtonDecoration: BoxDecoration(border: Border.all(color: accent.withValues(alpha: 0.4)), borderRadius: BorderRadius.circular(8)),
                leftChevronIcon: Icon(Icons.chevron_left, color: palette.textSecondary),
                rightChevronIcon: Icon(Icons.chevron_right, color: palette.textSecondary),
                titleCentered: false,
              ),
              daysOfWeekStyle: DaysOfWeekStyle(
                weekdayStyle: TextStyle(color: palette.textFaint, fontSize: 11, fontWeight: FontWeight.w600),
                weekendStyle: TextStyle(color: palette.textFaint, fontSize: 11, fontWeight: FontWeight.w600),
              ),
              calendarStyle: CalendarStyle(
                outsideDaysVisible: false,
                defaultTextStyle: TextStyle(color: palette.textSecondary, fontSize: 13),
                weekendTextStyle: TextStyle(color: palette.textSecondary, fontSize: 13),
                todayDecoration: BoxDecoration(color: accent.withValues(alpha: 0.25), shape: BoxShape.circle),
                todayTextStyle: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold),
                selectedDecoration: BoxDecoration(color: accent, shape: BoxShape.circle),
                selectedTextStyle: TextStyle(color: contrastingTextColor(accent), fontWeight: FontWeight.bold),
                markerDecoration: BoxDecoration(color: accent, shape: BoxShape.circle),
                markersMaxCount: 3,
                markerSize: 4.5,
                markerMargin: const EdgeInsets.only(top: 2),
              ),
            ),
          ),
          Divider(height: 1, color: palette.border),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                Expanded(child: Text(_selectedDayLabel(), style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5))),
                if (_loading || _loadingSchedule) const Padding(padding: EdgeInsets.only(right: 10), child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))),
                GestureDetector(
                  onTap: _openFilterSheet,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Padding(padding: const EdgeInsets.all(6), child: Icon(Icons.tune_rounded, size: 18, color: _statusFilter != 'all' ? accent : palette.textSecondary)),
                      if (_statusFilter != 'all') Positioned(top: 4, right: 4, child: Container(width: 6, height: 6, decoration: BoxDecoration(color: accent, shape: BoxShape.circle))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (_error != null && _eventsByDay.isEmpty)
            Expanded(child: Center(child: Text('Erro: $_error', style: const TextStyle(color: Colors.redAccent))))
          else if (_self == null && !_loading)
            Expanded(child: Center(child: Text('Não foi possível carregar seu cadastro de barbeiro.', style: TextStyle(color: palette.textFaint))))
          else if (_self == null)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else
            Expanded(
              child: BarberDayTimeline(
                date: _selectedDay,
                staff: _self!,
                color: accent,
                schedule: _daySchedule,
                appointments: dayEvents,
                onTapAppointment: _showAppointmentDetail,
                onTapFreeSlot: (startMinute) => _openNewAppointment(initialDate: _selectedDay, initialStartMinute: startMinute),
              ),
            ),
        ],
      ),
    );
  }
}

class _MiniPhoto extends StatelessWidget {
  final String label;
  final String url;
  final AppPalette palette;
  const _MiniPhoto({required this.label, required this.url, required this.palette});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Stack(
        children: [
          Image.network(
            url,
            height: 190,
            width: double.infinity,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(height: 190, color: palette.surfaceAlt, alignment: Alignment.center, child: Text('—', style: TextStyle(color: palette.textFaint))),
          ),
          Positioned(
            left: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(20)),
              child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final AppPalette palette;
  final Color? valueColor;

  const _DetailRow({required this.label, required this.value, required this.palette, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: palette.textFaint, fontSize: 12.5)),
          Text(value, style: TextStyle(color: valueColor ?? palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}
