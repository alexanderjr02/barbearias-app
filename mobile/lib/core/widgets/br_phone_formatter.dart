import 'package:flutter/services.dart';

/// Live-formats digits into "(XX) XXXXX-XXXX" (or the 8-digit landline
/// variant) as the user types — small polish for any phone field in the app.
class BrPhoneFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '').substring(0, newValue.text.replaceAll(RegExp(r'\D'), '').length.clamp(0, 11));

    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i == 0) buffer.write('(');
      if (i == 2) buffer.write(') ');
      if (i == 7 && digits.length == 11) buffer.write('-');
      if (i == 6 && digits.length == 10) buffer.write('-');
      buffer.write(digits[i]);
    }

    final formatted = buffer.toString();
    return TextEditingValue(text: formatted, selection: TextSelection.collapsed(offset: formatted.length));
  }
}
