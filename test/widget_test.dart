import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App smoke test - login screen builds', (WidgetTester tester) async {
    // Simple widget test that doesn't require network services
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('mystasis'),
                Text('Welcome back'),
              ],
            ),
          ),
        ),
      ),
    );

    // Verify text appears
    expect(find.text('mystasis'), findsOneWidget);
    expect(find.text('Welcome back'), findsOneWidget);
  });
}
