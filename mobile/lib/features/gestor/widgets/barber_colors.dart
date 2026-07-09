import 'package:flutter/material.dart';

/// Stable per-barber color identity, mirroring the web dashboard's team
/// palette — so a barber's color means the same thing whether the gestor is
/// looking at the phone or the desktop. Cycles if there are more barbers
/// than colors.
const List<Color> barberColorPalette = [
  Color(0xFFFBBF24), // amber
  Color(0xFF38BDF8), // sky
  Color(0xFF34D399), // emerald
  Color(0xFFE879F9), // fuchsia
  Color(0xFFFB7185), // rose
  Color(0xFF22D3EE), // cyan
  Color(0xFFA78BFA), // violet
  Color(0xFFA3E635), // lime
];

Color barberColorFor(List<String> orderedStaffIds, String staffId) {
  final idx = orderedStaffIds.indexOf(staffId);
  return barberColorPalette[idx >= 0 ? idx % barberColorPalette.length : 0];
}
