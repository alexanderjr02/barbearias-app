import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'gestor_new_appointment_screen.dart';
import 'gestor_repository.dart';
import 'widgets/barber_colors.dart';
import 'widgets/barber_day_timeline.dart';
import 'widgets/team_day_timeline.dart';

const _statusLabels = {
  'SCHEDULED': 'Agendado',
  'CONFIRMED': 'Confirmado',
  'IN_PROGRESS': 'Em andamento',
  'COMPLETED': 'Concluído',
  'CANCELLED': 'Cancelado',
  'NO_SHOW': 'Não compareceu',
};

const _weekdaysLong = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];
const _months = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/// The gestor's agenda: a compact date strip that expands into a full month
/// grid (tapping a day auto-collapses it back to reveal the agenda), a
/// horizontal "pulse" strip of barber tabs (activity ring showing how busy
/// each one is), and a full-width, swipeable per-barber day timeline below —
/// mirrors the web dashboard's Dia view but adapted for a single-column
/// phone screen instead of squeezing every barber into a sideways strip.
class GestorAgendaScreen extends StatefulWidget {
  const GestorAgendaScreen({super.key});

  @override
  State<GestorAgendaScreen> createState() => _GestorAgendaScreenState();
}

class _GestorAgendaScreenState extends State<GestorAgendaScreen> {
  final _repository = GestorRepository();
  String? _barbershopId;

  CalendarFormat _format = CalendarFormat.week;
  DateTime _focusedDay = _dateOnly(DateTime.now());
  DateTime _selectedDay = _dateOnly(DateTime.now());
  String _statusFilter = 'all';
  bool _searchOpen = false;
  String _search = '';

  Map<DateTime, List<GestorAppointment>> _eventsByDay = {};
  bool _loading = true;
  String? _error;

  List<GestorStaff> _staffList = [];
  List<StaffDaySchedule> _daySchedule = [];
  bool _loadingSchedule = false;

  final PageController _pageController = PageController(viewportFraction: 1);
  final ScrollController _tabScrollController = ScrollController();
  int _currentPage = 0;

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);
  static String _dateKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void initState() {
    super.initState();
    _load(_focusedDay);
    _loadDaySchedule(_selectedDay);
  }

  @override
  void dispose() {
    _pageController.dispose();
    _tabScrollController.dispose();
    super.dispose();
  }

  void _shiftFocused(int direction) {
    final next = _format == CalendarFormat.month
        ? DateTime(_focusedDay.year, _focusedDay.month + direction, 1)
        : _focusedDay.add(Duration(days: 7 * direction));
    setState(() => _focusedDay = next);
    _load(next);
  }

  void _goToPage(int index) {
    setState(() => _currentPage = index);
    if (_pageController.hasClients) {
      _pageController.animateToPage(index, duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic);
    }
    if (_tabScrollController.hasClients) {
      final target = (index * 86.0 - 100).clamp(0.0, _tabScrollController.position.maxScrollExtent);
      _tabScrollController.animateTo(target, duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic);
    }
  }

  Future<void> _load(DateTime aroundDay) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final barbershopId = _barbershopId ?? (await _repository.me()).barbershopId;
      _barbershopId = barbershopId;
      if (_staffList.isEmpty) {
        final staff = await _repository.staff();
        _staffList = staff.where((s) => s.isActive).toList();
      }
      final rangeStart = DateTime(aroundDay.year, aroundDay.month - 1, 1);
      final rangeEnd = DateTime(aroundDay.year, aroundDay.month + 2, 0);
      final list = await _repository.appointments(barbershopId, from: _dateKey(rangeStart), to: _dateKey(rangeEnd));
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

  List<GestorAppointment> _eventsFor(DateTime day) => _eventsByDay[_dateOnly(day)] ?? const [];

  String _selectedDayLabel() {
    final d = _selectedDay;
    final today = _dateOnly(DateTime.now());
    if (d == today) return 'Hoje';
    if (d == today.add(const Duration(days: 1))) return 'Amanhã';
    if (d == today.subtract(const Duration(days: 1))) return 'Ontem';
    return '${_weekdaysLong[d.weekday % 7]}, ${d.day} de ${_months[d.month - 1]}';
  }

  String _monthYearLabel() => '${_months[_focusedDay.month - 1]} de ${_focusedDay.year}';

  Future<void> _loadDaySchedule(DateTime day) async {
    setState(() => _loadingSchedule = true);
    try {
      final schedule = await _repository.dayScheduleFor(_dateKey(day));
      if (!mounted) return;
      setState(() {
        _daySchedule = schedule;
        _loadingSchedule = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingSchedule = false);
    }
  }

  void _openFilterSheet() {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    final searched = _eventsFor(_selectedDay).where((a) {
      return _search.isEmpty ||
          a.clientName.toLowerCase().contains(_search.toLowerCase()) ||
          a.serviceName.toLowerCase().contains(_search.toLowerCase()) ||
          a.staffName.toLowerCase().contains(_search.toLowerCase());
    }).toList();
    final counts = <String, int>{'all': searched.length};
    for (final s in _statusLabels.keys) {
      counts[s] = searched.where((a) => a.status == s).length;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: palette.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => SafeArea(
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
                    decoration: BoxDecoration(
                      color: selected ? accent.withValues(alpha: 0.12) : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
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
    );
  }

  Future<void> _openNewAppointment() async {
    final created = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => const GestorNewAppointmentScreen()));
    if (created == true) {
      _load(_focusedDay);
      _loadDaySchedule(_selectedDay);
    }
  }

  void _showAppointmentDetail(GestorAppointment apt) {
    final palette = AppPalette.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
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
            _DetailRow(label: 'Barbeiro', value: apt.staffName, palette: palette),
            _DetailRow(label: 'Horário', value: '${apt.startTime} – ${apt.endTime}', palette: palette),
            _DetailRow(label: 'Status', value: _statusLabels[apt.status] ?? apt.status, palette: palette, valueColor: appointmentStatusColor(apt.status, palette)),
            _DetailRow(label: 'Valor', value: 'R\$ ${apt.totalPrice.toStringAsFixed(2)}', palette: palette, valueColor: Theme.of(context).colorScheme.primary),
          ],
        ),
      ),
    );
  }

  /// The mobile-native take on the web's "all barbers at once" agenda: each
  /// barber gets a full, legible page — reached by swiping the timeline
  /// below or tapping their card here. The card doubles as a status pulse
  /// (activity ring showing busy vs. free share of the day) and as a tab.
  Widget _barberTabStrip(AppPalette palette, Color accent) {
    if (_loadingSchedule && _daySchedule.isEmpty) {
      return const SizedBox(height: 108, child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))));
    }
    final orderedIds = _staffList.map((s) => s.id).toList();
    final dayApts = _eventsFor(_selectedDay);

    final cards = _staffList.map((member) {
      final schedule = _daySchedule.where((s) => s.staffId == member.id).cast<StaffDaySchedule?>().firstWhere((_) => true, orElse: () => null);
      final isOff = schedule == null || !schedule.isOpen;
      final offLabel = schedule?.source == 'blocked' ? 'De folga' : 'Fechado';
      final memberApts = dayApts.where((a) => a.staffId == member.id && a.status != 'CANCELLED' && a.status != 'NO_SHOW').toList();

      var ratio = 0.0;
      var freeMinutes = 0;
      if (!isOff && schedule.openTime != null && schedule.closeTime != null) {
        final openMin = timeToMinutes(schedule.openTime!);
        final closeMin = timeToMinutes(schedule.closeTime!);
        final capacity = math.max(closeMin - openMin, 1);
        final busy = memberApts.map((a) => TimeRange(timeToMinutes(a.startTime), timeToMinutes(a.endTime.isEmpty ? a.startTime : a.endTime))).toList();
        final free = freeSegments(openMin, closeMin, busy);
        freeMinutes = free.fold(0, (acc, s) => acc + (s.end - s.start));
        ratio = ((capacity - freeMinutes) / capacity).clamp(0.0, 1.0);
      }

      final revenue = memberApts.fold<double>(0, (s, a) => s + a.totalPrice);
      return (member: member, isOff: isOff, offLabel: offLabel, count: memberApts.length, freeMinutes: freeMinutes, ratio: ratio, revenue: revenue);
    }).toList();

    final topEarnerId = cards.where((c) => c.revenue > 0).isEmpty
        ? null
        : cards.reduce((a, b) => a.revenue >= b.revenue ? a : b).member.id;

    return SizedBox(
      height: 108,
      child: ListView(
        controller: _tabScrollController,
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        children: cards.asMap().entries.map((entry) {
          final index = entry.key;
          final c = entry.value;
          final color = barberColorFor(orderedIds, c.member.id);
          final url = resolveAssetUrl(c.member.avatar);
          final selected = index == _currentPage;
          return GestureDetector(
            onTap: () => _goToPage(index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 78,
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
              decoration: BoxDecoration(
                color: selected ? accent.withValues(alpha: 0.14) : palette.surfaceAlt,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: selected ? accent.withValues(alpha: 0.7) : Colors.transparent, width: 1.4),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 44,
                    height: 44,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 44,
                          height: 44,
                          child: CircularProgressIndicator(
                            value: c.isOff ? 1 : c.ratio,
                            strokeWidth: 2.6,
                            backgroundColor: palette.border,
                            valueColor: AlwaysStoppedAnimation(c.isOff ? palette.border : color),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(4),
                          child: CircleAvatar(
                            radius: 17,
                            backgroundColor: palette.surface,
                            backgroundImage: url != null ? NetworkImage(url) : null,
                            child: url == null ? Text(c.member.name.isEmpty ? '?' : c.member.name[0].toUpperCase(), style: TextStyle(fontSize: 12, color: palette.textSecondary)) : null,
                          ),
                        ),
                        if (c.member.id == topEarnerId)
                          const Positioned(top: -2, right: -2, child: Icon(Icons.emoji_events, size: 13, color: Color(0xFFFBBF24))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(c.member.name.split(' ').first, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: palette.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(
                    c.isOff ? c.offLabel : '${c.count} · ${formatFreeHours(c.freeMinutes)}',
                    style: TextStyle(fontSize: 9, color: c.isOff ? palette.textFaint : palette.textSecondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    final dayEvents = _eventsFor(_selectedDay).where((a) {
      final matchStatus = _statusFilter == 'all' || a.status == _statusFilter;
      final matchSearch = _search.isEmpty ||
          a.clientName.toLowerCase().contains(_search.toLowerCase()) ||
          a.serviceName.toLowerCase().contains(_search.toLowerCase()) ||
          a.staffName.toLowerCase().contains(_search.toLowerCase());
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
                decoration: InputDecoration(hintText: 'Buscar cliente, serviço, barbeiro...', hintStyle: TextStyle(color: palette.textFaint, fontSize: 14), border: InputBorder.none),
              )
            : const Text('Agenda'),
        actions: [
          IconButton(
            icon: Icon(_searchOpen ? Icons.close : Icons.search),
            onPressed: () => setState(() {
              _searchOpen = !_searchOpen;
              if (!_searchOpen) _search = '';
            }),
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
        onPressed: _openNewAppointment,
        backgroundColor: accent,
        tooltip: 'Novo agendamento',
        child: Icon(Icons.add, color: contrastingTextColor(accent)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 8, 4),
            child: Row(
              children: [
                InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => _shiftFocused(-1),
                  child: Padding(padding: const EdgeInsets.all(6), child: Icon(Icons.chevron_left, color: palette.textSecondary, size: 20)),
                ),
                Expanded(
                  child: Text(
                    _monthYearLabel(),
                    style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
                InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => _shiftFocused(1),
                  child: Padding(padding: const EdgeInsets.all(6), child: Icon(Icons.chevron_right, color: palette.textSecondary, size: 20)),
                ),
                const SizedBox(width: 4),
                InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => setState(() => _format = _format == CalendarFormat.month ? CalendarFormat.week : CalendarFormat.month),
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: AnimatedRotation(
                      duration: const Duration(milliseconds: 260),
                      turns: _format == CalendarFormat.month ? 0.5 : 0,
                      child: Icon(Icons.keyboard_arrow_down_rounded, color: palette.textSecondary, size: 22),
                    ),
                  ),
                ),
              ],
            ),
          ),
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
              headerVisible: false,
              eventLoader: _eventsFor,
              startingDayOfWeek: StartingDayOfWeek.sunday,
              daysOfWeekHeight: 22,
              rowHeight: 44,
              onDaySelected: (selected, focused) {
                setState(() {
                  _selectedDay = _dateOnly(selected);
                  _focusedDay = focused;
                  // Selecting a day while the full month grid is open collapses
                  // it back to a single week — the same tap that answers "what's
                  // on this day" also clears the screen space to show it.
                  _format = CalendarFormat.week;
                });
                _loadDaySchedule(_dateOnly(selected));
              },
              onPageChanged: (focused) {
                _focusedDay = focused;
                _load(focused);
              },
              calendarBuilders: CalendarBuilders<GestorAppointment>(
                markerBuilder: (context, day, events) {
                  if (events.isEmpty) return null;
                  final orderedIds = _staffList.map((s) => s.id).toList();
                  final staffIds = events.map((e) => e.staffId).toSet().toList();
                  return Positioned(
                    bottom: 2,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: staffIds.take(4).map((id) {
                        return Container(
                          width: 4.5,
                          height: 4.5,
                          margin: const EdgeInsets.symmetric(horizontal: 1),
                          decoration: BoxDecoration(color: barberColorFor(orderedIds, id), shape: BoxShape.circle),
                        );
                      }).toList(),
                    ),
                  );
                },
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
              ),
            ),
          ),
          Divider(height: 1, color: palette.border),
          if (_loading && _eventsByDay.isEmpty)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null && _eventsByDay.isEmpty)
            Expanded(child: Center(child: Text('Erro: $_error', style: const TextStyle(color: Colors.redAccent))))
          else if (_staffList.isEmpty)
            Expanded(child: Center(child: Text('Nenhum barbeiro ativo.', style: TextStyle(color: palette.textFaint))))
          else ...[
            if (_staffList.length > 1) _barberTabStrip(palette, accent),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
              child: Row(
                children: [
                  Expanded(child: Text(_selectedDayLabel(), style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5))),
                  if (_loading) const Padding(padding: EdgeInsets.only(right: 10), child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))),
                  GestureDetector(
                    onTap: _openFilterSheet,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(6),
                          child: Icon(Icons.tune_rounded, size: 18, color: _statusFilter != 'all' ? accent : palette.textSecondary),
                        ),
                        if (_statusFilter != 'all')
                          Positioned(top: 4, right: 4, child: Container(width: 6, height: 6, decoration: BoxDecoration(color: accent, shape: BoxShape.circle))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Builder(builder: (context) {
                final orderedIds = _staffList.map((s) => s.id).toList();
                final page = _currentPage.clamp(0, _staffList.length - 1);
                if (page != _currentPage) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted) setState(() => _currentPage = page);
                  });
                }
                return PageView.builder(
                  controller: _pageController,
                  itemCount: _staffList.length,
                  onPageChanged: (index) {
                    setState(() => _currentPage = index);
                    if (_tabScrollController.hasClients) {
                      final target = (index * 86.0 - 100).clamp(0.0, _tabScrollController.position.maxScrollExtent);
                      _tabScrollController.animateTo(target, duration: const Duration(milliseconds: 260), curve: Curves.easeOutCubic);
                    }
                  },
                  itemBuilder: (context, index) {
                    final member = _staffList[index];
                    final schedule = _daySchedule.where((s) => s.staffId == member.id).cast<StaffDaySchedule?>().firstWhere((_) => true, orElse: () => null);
                    final memberApts = dayEvents.where((a) => a.staffId == member.id).toList();
                    return BarberDayTimeline(
                      date: _selectedDay,
                      staff: member,
                      color: barberColorFor(orderedIds, member.id),
                      schedule: schedule,
                      appointments: memberApts,
                      onTapAppointment: _showAppointmentDetail,
                    );
                  },
                );
              }),
            ),
          ],
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
