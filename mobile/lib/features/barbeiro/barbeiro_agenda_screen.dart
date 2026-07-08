import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/cortix_theme.dart';
import 'barber_repository.dart';

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

/// Same month/week calendar pattern as the Gestor agenda, scoped to the
/// logged-in barber's own appointments — plus the status actions
/// (Não veio / Concluir) and client-history sheet that used to live inline
/// in the home screen's flat list.
class BarbeiroAgendaScreen extends StatefulWidget {
  const BarbeiroAgendaScreen({super.key});

  @override
  State<BarbeiroAgendaScreen> createState() => _BarbeiroAgendaScreenState();
}

class _BarbeiroAgendaScreenState extends State<BarbeiroAgendaScreen> {
  final _repository = BarberRepository();

  CalendarFormat _format = CalendarFormat.week;
  DateTime _focusedDay = _dateOnly(DateTime.now());
  DateTime _selectedDay = _dateOnly(DateTime.now());
  String _statusFilter = 'all';
  bool _searchOpen = false;
  String _search = '';

  Map<DateTime, List<BarberAppointment>> _eventsByDay = {};
  bool _loading = true;
  String? _error;

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);
  static String _dateKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void initState() {
    super.initState();
    _load(_focusedDay);
  }

  Future<void> _load(DateTime aroundDay) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rangeStart = DateTime(aroundDay.year, aroundDay.month - 1, 1);
      final rangeEnd = DateTime(aroundDay.year, aroundDay.month + 2, 0);
      final list = await _repository.myAppointments(from: _dateKey(rangeStart), to: _dateKey(rangeEnd));
      final map = <DateTime, List<BarberAppointment>>{};
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

  List<BarberAppointment> _eventsFor(DateTime day) => _eventsByDay[_dateOnly(day)] ?? const [];

  Color _statusColor(String status) {
    return appointmentStatusColor(status, AppPalette.of(context));
  }

  String _selectedDayLabel() {
    final d = _selectedDay;
    final today = _dateOnly(DateTime.now());
    if (d == today) return 'Hoje';
    if (d == today.add(const Duration(days: 1))) return 'Amanhã';
    if (d == today.subtract(const Duration(days: 1))) return 'Ontem';
    return '${_weekdaysLong[d.weekday % 7]}, ${d.day} de ${_months[d.month - 1]}';
  }

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    } catch (_) {
      return isoDate;
    }
  }

  Future<void> _setStatus(BarberAppointment apt, String status) async {
    try {
      await _repository.updateStatus(apt.id, status);
      _load(_focusedDay);
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  void _showClientHistory(BarberAppointment apt) {
    final future = _repository.clientHistory(apt.id);
    final palette = AppPalette.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: palette.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => FutureBuilder<ClientHistory>(
          future: future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('Erro: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent)));
            }
            final history = snapshot.data!;
            final accent = Theme.of(context).colorScheme.primary;
            return ListView(
              controller: scrollController,
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(color: palette.border, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                Text(history.clientName, style: TextStyle(color: palette.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(
                  '${history.totalVisits} ${history.totalVisits == 1 ? 'visita concluída' : 'visitas concluídas'} · R\$ ${history.totalSpent.toStringAsFixed(2)} gastos',
                  style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 18),
                Text('Histórico', style: TextStyle(color: palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 10),
                ...history.visits.map(
                  (v) => Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: palette.surfaceAlt, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${v.serviceName} · com ${v.staffName}', style: TextStyle(color: palette.textPrimary, fontSize: 13)),
                              const SizedBox(height: 2),
                              Text('${_formatDate(v.date)} · ${v.startTime}', style: TextStyle(color: palette.textSecondary, fontSize: 12)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('R\$ ${v.totalPrice.toStringAsFixed(2)}', style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(v.status, style: TextStyle(color: _statusColor(v.status), fontSize: 10, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
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
            },
          ),
        ],
      ),
      body: Column(
        children: [
          TableCalendar<BarberAppointment>(
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
            onDaySelected: (selected, focused) => setState(() {
              _selectedDay = _dateOnly(selected);
              _focusedDay = focused;
            }),
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
          Divider(height: 1, color: palette.border),
          if (_loading && _eventsByDay.isEmpty)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null && _eventsByDay.isEmpty)
            Expanded(child: Center(child: Text('Erro: $_error', style: const TextStyle(color: Colors.redAccent))))
          else ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_selectedDayLabel(), style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.bold, fontSize: 14.5)),
                  if (_loading) const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                ],
              ),
            ),
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: ['all', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) {
                  final selected = _statusFilter == s;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _statusFilter = s),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: selected ? accent.withValues(alpha: 0.18) : palette.surfaceAlt,
                          borderRadius: BorderRadius.circular(20),
                          border: selected ? Border.all(color: accent.withValues(alpha: 0.5)) : null,
                        ),
                        child: Text(
                          s == 'all' ? 'Todos' : _statusLabels[s] ?? s,
                          style: TextStyle(color: selected ? palette.textPrimary : palette.textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: dayEvents.isEmpty
                  ? Center(child: Text('Nenhum agendamento neste dia.', style: TextStyle(color: palette.textFaint)))
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      itemCount: dayEvents.length,
                      itemBuilder: (context, index) {
                        final apt = dayEvents[index];
                        final canAct = apt.status == 'SCHEDULED' || apt.status == 'CONFIRMED';
                        return RiseIn(
                          delay: Duration(milliseconds: 20 * index),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            decoration: BoxDecoration(color: palette.surface, borderRadius: BorderRadius.circular(16)),
                            clipBehavior: Clip.antiAlias,
                            child: IntrinsicHeight(
                              child: Row(
                                children: [
                                  Container(width: 4, color: _statusColor(apt.status).withValues(alpha: 0.7)),
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => _showClientHistory(apt),
                                      child: Padding(
                                        padding: const EdgeInsets.all(14),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Row(
                                                    children: [
                                                      SizedBox(width: 42, child: Text(apt.startTime, style: TextStyle(color: palette.textPrimary, fontSize: 13, fontWeight: FontWeight.bold))),
                                                      Expanded(child: Text(apt.clientName, style: TextStyle(color: palette.textPrimary, fontWeight: FontWeight.w600, fontSize: 14), overflow: TextOverflow.ellipsis)),
                                                    ],
                                                  ),
                                                ),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                  decoration: BoxDecoration(color: _statusColor(apt.status).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                                                  child: Text(_statusLabels[apt.status] ?? apt.status, style: TextStyle(color: _statusColor(apt.status), fontSize: 10.5, fontWeight: FontWeight.w700)),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Padding(
                                              padding: const EdgeInsets.only(left: 42),
                                              child: Text('${apt.serviceName} · R\$ ${apt.totalPrice.toStringAsFixed(2)}', style: TextStyle(color: palette.textSecondary, fontSize: 12.5)),
                                            ),
                                            if (canAct) ...[
                                              const SizedBox(height: 10),
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: OutlinedButton(
                                                      onPressed: () => _setStatus(apt, 'NO_SHOW'),
                                                      style: OutlinedButton.styleFrom(foregroundColor: Colors.redAccent),
                                                      child: const Text('Não veio'),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Expanded(
                                                    child: ElevatedButton(
                                                      onPressed: () => _setStatus(apt, 'COMPLETED'),
                                                      style: ElevatedButton.styleFrom(backgroundColor: accent),
                                                      child: Text('Concluir', style: TextStyle(color: contrastingTextColor(accent))),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ],
      ),
    );
  }
}
