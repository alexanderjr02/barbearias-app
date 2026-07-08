import 'package:flutter/material.dart';
import 'gestor_repository.dart';

/// Shared barbershop branding state (name/logo/coverImage/color) for the
/// Gestor shell. Dashboard and Configurações both read from here instead of
/// each holding their own fetch — the shell's tabs stay alive in an
/// IndexedStack, so a plain per-screen Future never refetches when the
/// gestor edits branding on one tab and switches back to another.
class BrandController extends ChangeNotifier {
  final _repository = GestorRepository();
  BarbershopProfile? profile;
  bool loading = false;

  Future<void> refresh() async {
    loading = true;
    notifyListeners();
    try {
      profile = await _repository.barbershop();
    } catch (_) {
      // keep the last known profile on a failed refresh
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}
