import 'dart:math' as math;

int timeToMinutes(String time) {
  final parts = time.split(':');
  return int.parse(parts[0]) * 60 + int.parse(parts[1]);
}

String formatFreeHours(int totalMinutes) {
  final clamped = totalMinutes < 0 ? 0 : totalMinutes;
  final h = clamped ~/ 60;
  final m = clamped % 60;
  if (h == 0 && m == 0) return '0h';
  return m == 0 ? '${h}h' : '${h}h${m.toString().padLeft(2, '0')}';
}

class TimeRange {
  final int start;
  final int end;
  const TimeRange(this.start, this.end);
}

/// Gaps in [rangeStart, rangeEnd) not covered by any busy interval — mirrors
/// the same free-segment math the web dashboard uses, so "Xh livres" means
/// exactly the same thing on the phone as it does on the desktop.
List<TimeRange> freeSegments(int rangeStart, int rangeEnd, List<TimeRange> busy) {
  final sorted = [...busy]..sort((a, b) => a.start.compareTo(b.start));
  final free = <TimeRange>[];
  var cursor = rangeStart;
  for (final b in sorted) {
    final start = math.max(b.start, rangeStart);
    final end = math.min(b.end, rangeEnd);
    if (start >= end) continue;
    if (start > cursor) free.add(TimeRange(cursor, start));
    cursor = math.max(cursor, end);
  }
  if (cursor < rangeEnd) free.add(TimeRange(cursor, rangeEnd));
  return free;
}
