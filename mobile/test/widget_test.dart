import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cortix_mobile/main.dart';

void main() {
  testWidgets('App boots and shows a splash while restoring session', (WidgetTester tester) async {
    await tester.pumpWidget(const CortixApp());

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
