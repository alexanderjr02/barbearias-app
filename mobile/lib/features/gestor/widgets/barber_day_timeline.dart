import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../gestor_repository.dart';
import 'team_day_timeline.dart';

const int _rangeStartHour = 7;
const int _rangeEndHour = 21;
const double _hourRowHeight = 64;

// A warm, non-brand palette reserved for client identity — distinct from the
// barber color set so the two never get confused at a glance.
const List<Color> _clientAvatarPalette = [
  Color(0xFFE07A5F),
  Color(0xFFD9A05B),
  Color(0xFF6DA34D),
  Color(0xFF3D9A94),
  Color(0xFF4A7FBF),
  Color(0xFF7C6FBF),
  Color(0xFFBF6FA0),
  Color(0xFFBF4F4F),
];

Color _avatarColorForName(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return _clientAvatarPalette.first;
  final hash = trimmed.codeUnits.fold<int>(0, (acc, c) => acc + c);
  return _clientAvatarPalette[hash % _clientAvatarPalette.length];
}

String _initialsFor(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return '?';
  final parts = trimmed.split(RegExp(r'\s+'));
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return (parts.first.substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
}

/// One barber's full day, full width — the same richness the web dashboard's
/// "Dia" column gives (hour grid, shaded free time, a live "now" line) but
/// laid out for a phone: roomy enough to actually read, one barber on screen
/// at a time. Meant to sit inside a PageView the gestor swipes through
/// instead of squeezing every barber into a sideways-scrolling strip.
class BarberDayTimeline extends StatelessWidget {
  final DateTime date;
  final GestorStaff staff;
  final Color color;
  final StaffDaySchedule? schedule;
  final List<GestorAppointment> appointments;
  final void Function(GestorAppointment) onTapAppointment;

  /// When set, free (open, unbooked) blocks become tappable and invoke this
  /// with the block's start-of-day minute — lets a screen jump straight into
  /// a pre-filled booking flow instead of making the barber pick a date and
  /// time from scratch after already seeing exactly where they're free.
  final void Function(int startMinuteOfDay)? onTapFreeSlot;

  const BarberDayTimeline({
    super.key,
    required this.date,
    required this.staff,
    required this.color,
    required this.schedule,
    required this.appointments,
    required this.onTapAppointment,
    this.onTapFreeSlot,
  });

  bool get _isToday {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final isOff = schedule == null || !schedule!.isOpen;
    final offLabel = schedule?.source == 'blocked'
        ? 'De folga hoje'
        : 'Fechado hoje';

    final dayApts = [...appointments]
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final activeApts = dayApts
        .where((a) => a.status != 'CANCELLED' && a.status != 'NO_SHOW')
        .toList();

    final rangeStartMin = _rangeStartHour * 60;
    final rangeEndMin = _rangeEndHour * 60;
    final now = DateTime.now();
    final nowMin = now.hour * 60 + now.minute;

    var freeBlocks = <TimeRange>[];
    var freeMinutes = 0;
    int? openMin;
    int? closeMin;
    if (!isOff && schedule!.openTime != null && schedule!.closeTime != null) {
      openMin = math.max(timeToMinutes(schedule!.openTime!), rangeStartMin);
      closeMin = math.min(timeToMinutes(schedule!.closeTime!), rangeEndMin);
      final busy = activeApts
          .map(
            (a) => TimeRange(
              timeToMinutes(a.startTime),
              timeToMinutes(a.endTime.isEmpty ? a.startTime : a.endTime),
            ),
          )
          .toList();
      freeBlocks = freeSegments(openMin, closeMin, busy);
      freeMinutes = freeBlocks.fold(0, (acc, s) => acc + (s.end - s.start));
    }

    String? liveChip;
    Color liveChipColor = palette.textFaint;
    if (_isToday && !isOff && openMin != null && closeMin != null) {
      if (nowMin < openMin || nowMin >= closeMin) {
        liveChip = 'Fora do expediente';
      } else {
        final currentlyBusy = activeApts.any(
          (a) =>
              timeToMinutes(a.startTime) <= nowMin &&
              timeToMinutes(a.endTime.isEmpty ? a.startTime : a.endTime) >
                  nowMin,
        );
        if (currentlyBusy) {
          final next = freeBlocks
              .where((s) => s.start >= nowMin)
              .cast<TimeRange?>()
              .firstWhere((_) => true, orElse: () => null);
          liveChip = next != null
              ? 'Livre às ${_fmt(next.start)}'
              : 'Ocupado até o fim do dia';
          liveChipColor = const Color(0xFFFBBF66);
        } else {
          liveChip = 'Livre agora';
          liveChipColor = const Color(0xFF3DDC84);
        }
      }
    }

    final url = resolveAssetUrl(staff.avatar);
    final bodyHeight = (_rangeEndHour - _rangeStartHour) * _hourRowHeight;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: palette.surfaceAlt,
                backgroundImage: url != null ? NetworkImage(url) : null,
                child: url == null
                    ? Text(
                        staff.name.isEmpty ? '?' : staff.name[0].toUpperCase(),
                        style: TextStyle(
                          fontSize: 16,
                          color: palette.textSecondary,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      staff.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: palette.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isOff
                          ? offLabel
                          : '${activeApts.length} agendamento${activeApts.length == 1 ? '' : 's'} · ${formatFreeHours(freeMinutes)} livres',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: palette.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (liveChip != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: liveChipColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    liveChip,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: liveChipColor,
                    ),
                  ),
                ),
            ],
          ),
        ),
        Divider(height: 1, color: palette.border),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 24),
            child: Stack(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 44,
                      child: Column(
                        children: List.generate(
                          _rangeEndHour - _rangeStartHour,
                          (i) {
                            final h = _rangeStartHour + i;
                            return SizedBox(
                              height: _hourRowHeight,
                              child: Align(
                                alignment: Alignment.topRight,
                                child: Padding(
                                  padding: const EdgeInsets.only(
                                    right: 6,
                                    top: 2,
                                  ),
                                  child: Text(
                                    '$h:00',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: palette.textFaint,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    Expanded(
                      child: SizedBox(
                        height: bodyHeight,
                        child: Stack(
                          children: [
                            Column(
                              children: List.generate(
                                _rangeEndHour - _rangeStartHour,
                                (_) => Container(
                                  height: _hourRowHeight,
                                  decoration: BoxDecoration(
                                    border: Border(
                                      top: BorderSide(
                                        color: palette.border,
                                        width: 0.6,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            for (final s in freeBlocks)
                              Builder(
                                builder: (context) {
                                  final blockHeight =
                                      (s.end - s.start) / 60 * _hourRowHeight;
                                  final tappable = onTapFreeSlot != null;
                                  final block = Container(
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: const Color(
                                        0xFF34D399,
                                      ).withValues(
                                        alpha: tappable ? 0.12 : 0.09,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                      border: tappable
                                          ? Border.all(
                                              color: const Color(
                                                0xFF34D399,
                                              ).withValues(alpha: 0.3),
                                              width: 1,
                                            )
                                          : null,
                                    ),
                                    child: tappable && blockHeight > 40
                                        ? Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(
                                                Icons.add_circle_outline,
                                                size: 14,
                                                color: Color(0xFF34D399),
                                              ),
                                              const SizedBox(width: 5),
                                              Text(
                                                'Agendar',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: const Color(
                                                    0xFF34D399,
                                                  ).withValues(alpha: 0.9),
                                                ),
                                              ),
                                            ],
                                          )
                                        : null,
                                  );
                                  return Positioned(
                                    top:
                                        (s.start - rangeStartMin) /
                                        60 *
                                        _hourRowHeight,
                                    left: 2,
                                    right: 8,
                                    height: blockHeight,
                                    child: tappable
                                        ? GestureDetector(
                                            // Where inside the block you tap
                                            // matters — jump to the time the
                                            // finger actually landed on
                                            // (snapped to the same 30 min
                                            // grid the booking slots use),
                                            // not just wherever this free
                                            // stretch happens to begin.
                                            onTapUp: (details) {
                                              final tappedMinute =
                                                  s.start +
                                                  (details.localPosition.dy /
                                                          _hourRowHeight *
                                                          60)
                                                      .round();
                                              final snapped =
                                                  ((tappedMinute / 30)
                                                              .round() *
                                                          30)
                                                      .clamp(
                                                        s.start,
                                                        s.end - 1,
                                                      );
                                              onTapFreeSlot!(snapped);
                                            },
                                            child: block,
                                          )
                                        : IgnorePointer(child: block),
                                  );
                                },
                              ),
                            for (final apt in dayApts)
                              Builder(
                                builder: (context) {
                                  final startMin = math.max(
                                    math.min(
                                      timeToMinutes(apt.startTime),
                                      rangeEndMin,
                                    ),
                                    rangeStartMin,
                                  );
                                  var endMin = timeToMinutes(
                                    apt.endTime.isEmpty
                                        ? apt.startTime
                                        : apt.endTime,
                                  );
                                  if (endMin <= startMin) {
                                    endMin = startMin + 30;
                                  }
                                  endMin = math.min(endMin, rangeEndMin);
                                  final top =
                                      (startMin - rangeStartMin) /
                                      60 *
                                      _hourRowHeight;
                                  final height = math.max(
                                    (endMin - startMin) / 60 * _hourRowHeight,
                                    46.0,
                                  );
                                  final aptColor = appointmentStatusColor(
                                    apt.status,
                                    palette,
                                  );
                                  final cancelled =
                                      apt.status == 'CANCELLED' ||
                                      apt.status == 'NO_SHOW';
                                  return Positioned(
                                    top: top,
                                    left: 2,
                                    right: 8,
                                    height: height,
                                    child: GestureDetector(
                                      onTap: () => onTapAppointment(apt),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: cancelled
                                              ? palette.surfaceAlt
                                              : color.withValues(alpha: 0.14),
                                          border: Border(
                                            left: BorderSide(
                                              color: cancelled
                                                  ? palette.border
                                                  : color,
                                              width: 3,
                                            ),
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
                                        ),
                                        child: Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.center,
                                          children: [
                                            _ClientAvatar(
                                              name: apt.clientName,
                                              photoUrl: resolveAssetUrl(
                                                apt.clientAvatar,
                                              ),
                                              ringColor: color,
                                              statusColor: aptColor,
                                              muted: cancelled,
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                mainAxisAlignment:
                                                    MainAxisAlignment.center,
                                                children: [
                                                  Text(
                                                    '${apt.startTime}–${apt.endTime}',
                                                    style: TextStyle(
                                                      fontSize: 10.5,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      color: palette.textFaint,
                                                    ),
                                                  ),
                                                  Text(
                                                    apt.clientName,
                                                    style: TextStyle(
                                                      fontSize: 13,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      color: cancelled
                                                          ? palette.textFaint
                                                          : palette.textPrimary,
                                                      decoration:
                                                          apt.status ==
                                                              'CANCELLED'
                                                          ? TextDecoration
                                                                .lineThrough
                                                          : null,
                                                    ),
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                  ),
                                                  if (height > 62)
                                                    Text(
                                                      apt.serviceName,
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        color: palette
                                                            .textSecondary,
                                                      ),
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                    ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            if (isOff)
                              Positioned.fill(
                                child: IgnorePointer(
                                  child: Center(
                                    child: Transform.rotate(
                                      angle: -0.2,
                                      child: Text(
                                        schedule?.source == 'blocked'
                                            ? 'FOLGA'
                                            : 'FECHADO',
                                        style: TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.bold,
                                          color: palette.textFaint.withValues(
                                            alpha: 0.5,
                                          ),
                                          letterSpacing: 2,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            if (_isToday &&
                                nowMin >= rangeStartMin &&
                                nowMin <= rangeEndMin)
                              Positioned(
                                top:
                                    (nowMin - rangeStartMin) /
                                    60 *
                                    _hourRowHeight,
                                left: 0,
                                right: 0,
                                child: IgnorePointer(
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 7,
                                        height: 7,
                                        decoration: const BoxDecoration(
                                          color: Colors.redAccent,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      Expanded(
                                        child: Container(
                                          height: 1.4,
                                          color: Colors.redAccent,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  static String _fmt(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
  }
}

/// A "who's-with-who" avatar for the appointment card: the client's own
/// photo (or a name-derived colored monogram when there isn't one) framed by
/// a ring in the barber's color — so a single glance tells you both who's
/// coming in and who's serving them — with a small status dot notched into
/// the corner, the way a messaging app shows presence. Three signals, one
/// shape, instead of a name and a stray dot spread across the card.
class _ClientAvatar extends StatelessWidget {
  final String name;
  final String? photoUrl;
  final Color ringColor;
  final Color statusColor;
  final bool muted;

  const _ClientAvatar({
    required this.name,
    required this.photoUrl,
    required this.ringColor,
    required this.statusColor,
    required this.muted,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    const size = 30.0;
    final fallback = ColoredBox(
      color: muted ? palette.border : _avatarColorForName(name),
      child: Center(
        child: Text(
          _initialsFor(name),
          style: const TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
    );
    return SizedBox(
      width: size + 8,
      height: size + 8,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: size,
            height: size,
            padding: const EdgeInsets.all(1.6),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: muted ? palette.border : ringColor,
                width: 2,
              ),
            ),
            child: ClipOval(
              child: photoUrl == null
                  ? fallback
                  : Image.network(
                      photoUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stack) => fallback,
                    ),
            ),
          ),
          Positioned(
            right: -2,
            bottom: -2,
            child: Container(
              width: 11,
              height: 11,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
                border: Border.all(color: palette.surface, width: 1.6),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
