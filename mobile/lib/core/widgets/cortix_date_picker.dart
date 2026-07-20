import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Calendário próprio, em bottom sheet.
///
/// O `showDatePicker` do Material carrega a cara do Material 2 e ignora a cor
/// da marca da barbearia — num app white-label isso aparece feio na hora. Este
/// aqui herda o acento, abre de baixo (onde o polegar está) e, quando o
/// intervalo é longo, deixa saltar direto para o ano: escolher 1995 paginando
/// mês a mês são 370 toques.
Future<DateTime?> showCortixDatePicker({
  required BuildContext context,
  required DateTime initialDate,
  required DateTime firstDate,
  required DateTime lastDate,
  String title = 'Escolha a data',
}) {
  return showModalBottomSheet<DateTime>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _CortixDatePicker(
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
      title: title,
    ),
  );
}

class _CortixDatePicker extends StatefulWidget {
  final DateTime initialDate, firstDate, lastDate;
  final String title;
  const _CortixDatePicker({
    required this.initialDate,
    required this.firstDate,
    required this.lastDate,
    required this.title,
  });

  @override
  State<_CortixDatePicker> createState() => _CortixDatePickerState();
}

class _CortixDatePickerState extends State<_CortixDatePicker> {
  late DateTime _selected;
  late DateTime _month;
  bool _pickingYear = false;

  static const _monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  static const _weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  @override
  void initState() {
    super.initState();
    _selected = _clamp(widget.initialDate);
    _month = DateTime(_selected.year, _selected.month);
  }

  DateTime _clamp(DateTime d) {
    if (d.isBefore(widget.firstDate)) return widget.firstDate;
    if (d.isAfter(widget.lastDate)) return widget.lastDate;
    return d;
  }

  bool _sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  bool _enabled(DateTime d) {
    final day = DateTime(d.year, d.month, d.day);
    final first = DateTime(widget.firstDate.year, widget.firstDate.month, widget.firstDate.day);
    final last = DateTime(widget.lastDate.year, widget.lastDate.month, widget.lastDate.day);
    return !day.isBefore(first) && !day.isAfter(last);
  }

  bool get _canPrev => _month.isAfter(DateTime(widget.firstDate.year, widget.firstDate.month));
  bool get _canNext => _month.isBefore(DateTime(widget.lastDate.year, widget.lastDate.month));

  void _shiftMonth(int by) {
    setState(() => _month = DateTime(_month.year, _month.month + by));
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.primary;

    return Container(
      margin: const EdgeInsets.all(10),
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: palette.textFaint.withValues(alpha: 0.12)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Puxador — sinaliza que dá pra arrastar pra fechar.
            Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: palette.textFaint.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Text(widget.title,
                      style: TextStyle(
                        color: palette.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.4,
                      )),
                ),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: palette.bg,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.close_rounded, size: 17, color: palette.textSecondary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Cabeçalho do mês. Tocar no nome abre a lista de anos.
            Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _pickingYear = !_pickingYear),
                  child: Row(
                    children: [
                      Text(
                        _pickingYear ? 'Escolha o ano' : '${_monthNames[_month.month - 1]} ${_month.year}',
                        style: TextStyle(
                          color: palette.textPrimary,
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 4),
                      AnimatedRotation(
                        turns: _pickingYear ? 0.5 : 0,
                        duration: const Duration(milliseconds: 200),
                        child: Icon(Icons.expand_more_rounded, size: 19, color: accent),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                if (!_pickingYear) ...[
                  _NavBtn(icon: Icons.chevron_left_rounded, enabled: _canPrev, accent: accent, palette: palette, onTap: () => _shiftMonth(-1)),
                  const SizedBox(width: 6),
                  _NavBtn(icon: Icons.chevron_right_rounded, enabled: _canNext, accent: accent, palette: palette, onTap: () => _shiftMonth(1)),
                ],
              ],
            ),
            const SizedBox(height: 14),

            SizedBox(
              height: 280,
              child: _pickingYear
                  ? _yearGrid(palette, accent)
                  : Column(
                      children: [
                        Row(
                          children: [
                            for (final w in _weekdays)
                              Expanded(
                                child: Center(
                                  child: Text(w,
                                      style: TextStyle(
                                        color: palette.textFaint,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                      )),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Expanded(child: _dayGrid(palette, accent)),
                      ],
                    ),
            ),

            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop(_selected),
                style: FilledButton.styleFrom(
                  backgroundColor: accent,
                  foregroundColor: contrastingTextColor(accent),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                ),
                child: Text(
                  'Confirmar ${_selected.day.toString().padLeft(2, '0')}/${_selected.month.toString().padLeft(2, '0')}/${_selected.year}',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dayGrid(AppPalette palette, Color accent) {
    final first = DateTime(_month.year, _month.month, 1);
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final leading = first.weekday % 7; // domingo = 0
    final today = DateTime.now();
    final cells = leading + daysInMonth;

    return GridView.builder(
      padding: EdgeInsets.zero,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        mainAxisSpacing: 4,
        crossAxisSpacing: 4,
      ),
      itemCount: cells,
      itemBuilder: (context, i) {
        if (i < leading) return const SizedBox.shrink();
        final date = DateTime(_month.year, _month.month, i - leading + 1);
        final enabled = _enabled(date);
        final selected = _sameDay(date, _selected);
        final isToday = _sameDay(date, today);

        return GestureDetector(
          onTap: enabled ? () => setState(() => _selected = date) : null,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            decoration: BoxDecoration(
              color: selected ? accent : Colors.transparent,
              shape: BoxShape.circle,
              border: !selected && isToday ? Border.all(color: accent.withValues(alpha: 0.5), width: 1.5) : null,
            ),
            alignment: Alignment.center,
            child: Text(
              '${date.day}',
              style: TextStyle(
                color: selected
                    ? contrastingTextColor(accent)
                    : enabled
                        ? palette.textPrimary
                        : palette.textFaint.withValues(alpha: 0.3),
                fontSize: 14,
                fontWeight: selected || isToday ? FontWeight.w900 : FontWeight.w500,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _yearGrid(AppPalette palette, Color accent) {
    final years = [
      for (var y = widget.lastDate.year; y >= widget.firstDate.year; y--) y,
    ];
    return GridView.builder(
      padding: EdgeInsets.zero,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 2.1,
      ),
      itemCount: years.length,
      itemBuilder: (context, i) {
        final y = years[i];
        final selected = y == _month.year;
        return GestureDetector(
          onTap: () => setState(() {
            _month = DateTime(y, _month.month);
            _selected = _clamp(DateTime(y, _selected.month, _selected.day));
            _pickingYear = false;
          }),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? accent : palette.bg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('$y',
                style: TextStyle(
                  color: selected ? contrastingTextColor(accent) : palette.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 14.5,
                )),
          ),
        );
      },
    );
  }
}

class _NavBtn extends StatelessWidget {
  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;
  final Color accent;
  final AppPalette palette;
  const _NavBtn({
    required this.icon,
    required this.enabled,
    required this.onTap,
    required this.accent,
    required this.palette,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.all(5),
        decoration: BoxDecoration(
          color: palette.bg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 20, color: enabled ? accent : palette.textFaint.withValues(alpha: 0.35)),
      ),
    );
  }
}
