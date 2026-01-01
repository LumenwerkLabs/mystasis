import 'package:flutter/material.dart';
import 'core/theme/theme.dart';

void main() {
  runApp(const MystasisApp());
}

class MystasisApp extends StatelessWidget {
  const MystasisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mystasis',
      debugShowCheckedModeBanner: false,
      theme: MystasisTheme.light(),
      home: const Placeholder(),
    );
  }
}
