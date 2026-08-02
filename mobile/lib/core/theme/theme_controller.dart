import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _prefsKey = 'rukz_theme_mode';
// Chave da marca antiga: lida como reserva pra quem ja tinha escolhido o tema
// nao voltar pro padrao depois do rebrand.
const _legacyPrefsKey = 'cortix_theme_mode';

/// Preferência de tema, persistida. Só Claro ou Escuro, a opção "Sistema"
/// saiu (dava mais confusão que ajuda). O padrão é Escuro, a identidade do
/// rukz; quem quiser claro troca no perfil.
class ThemeController extends ChangeNotifier {
  ThemeMode mode = ThemeMode.dark;

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    // Só 'light' vira claro. Qualquer outra coisa, inclusive o 'system'
    // gravado por versões antigas, cai no escuro padrão.
    final salvo = prefs.getString(_prefsKey) ?? prefs.getString(_legacyPrefsKey);
    mode = salvo == 'light' ? ThemeMode.light : ThemeMode.dark;
    if (prefs.getString(_prefsKey) == null && salvo != null) {
      await prefs.setString(_prefsKey, salvo);
      await prefs.remove(_legacyPrefsKey);
    }
    notifyListeners();
  }

  Future<void> setMode(ThemeMode newMode) async {
    // Nunca guarda 'system': o seletor não oferece mais essa opção.
    mode = newMode == ThemeMode.light ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, mode == ThemeMode.light ? 'light' : 'dark');
  }
}
