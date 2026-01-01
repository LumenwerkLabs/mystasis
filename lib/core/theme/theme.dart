import 'package:flutter/material.dart';

class MystasisTheme {
  // 1. COLOR PALETTE (TOKENS)
  static const Color deepBioTeal = Color(0xFF2E7F7F); // primary
  static const Color softAlgae = Color(0xFF4A7B71); // secondary
  static const Color boneWhite = Color(0xFFF7F5EF); // scaffold bg
  static const Color mistGrey = Color(0xFFE0E8E8); // cards / surfaces
  static const Color cellularBlue = Color(0xFFA3C3D3); // charts / accents
  static const Color signalAmber = Color(0xFFE2C464); // warnings
  static const Color deepGraphite = Color(0xFF23313A); // text

  // Neutrals
  static const Color neutralGrey = Color(0xFF9BA6AD);
  static const Color errorRed = Color(0xFFB3261E);

  // 2. TEXT THEME (INTER)
  static TextTheme textTheme = TextTheme(
    // Mobile-first sizes; scale up slightly on larger screens via MediaQuery if needed
    headlineLarge: TextStyle(
      // H1
      fontSize: 24,
      fontWeight: FontWeight.w600, // SemiBold
      color: deepGraphite,
      height: 1.3,
    ),
    headlineMedium: TextStyle(
      // H2
      fontSize: 20,
      fontWeight: FontWeight.w600,
      color: deepGraphite,
      height: 1.35,
    ),
    headlineSmall: TextStyle(
      // H3
      fontSize: 18,
      fontWeight: FontWeight.w500, // Medium
      color: deepGraphite,
      height: 1.35,
    ),
    bodyLarge: TextStyle(
      // main body
      fontSize: 16,
      fontWeight: FontWeight.w400,
      color: deepGraphite,
      height: 1.5,
    ),
    bodyMedium: TextStyle(
      // secondary body
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: deepGraphite,
      height: 1.5,
    ),
    bodySmall: TextStyle(
      // meta / helper text
      fontSize: 13,
      fontWeight: FontWeight.w400,
      color: neutralGrey,
      height: 1.45,
    ),
    labelLarge: TextStyle(
      // primary button text
      fontSize: 16,
      fontWeight: FontWeight.w500,
      color: Colors.white,
      height: 1.3,
    ),
    labelMedium: TextStyle(
      // chips, small buttons, labels
      fontSize: 14,
      fontWeight: FontWeight.w500,
      color: deepGraphite,
      height: 1.3,
    ),
    labelSmall: TextStyle(
      // tiny labels
      fontSize: 12,
      fontWeight: FontWeight.w500,
      color: neutralGrey,
      height: 1.2,
    ),
  );

  // 3. THEMES (LIGHT – MVP)
  static ThemeData light() {
    final base = ThemeData.light();

    return base.copyWith(
      primaryColor: deepBioTeal,
      scaffoldBackgroundColor: boneWhite,
      canvasColor: boneWhite,
      cardColor: mistGrey,
      dividerColor: mistGrey.withValues(alpha: 0.6),

      colorScheme: ColorScheme(
        brightness: Brightness.light,
        primary: deepBioTeal,
        onPrimary: Colors.white,
        secondary: softAlgae,
        onSecondary: Colors.white,
        error: errorRed,
        onError: Colors.white,
        surface: boneWhite,
        onSurface: deepGraphite,
        surfaceContainer: mistGrey,
      ),

      textTheme: textTheme.apply(
        fontFamily: 'Inter', // make sure Inter is added in pubspec.yaml
      ),

      appBarTheme: AppBarTheme(
        elevation: 0,
        backgroundColor: boneWhite,
        foregroundColor: deepGraphite,
        centerTitle: false,
        titleTextStyle: textTheme.headlineMedium,
        iconTheme: const IconThemeData(color: deepGraphite),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: deepBioTeal,
          foregroundColor: Colors.white,
          textStyle: textTheme.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: deepBioTeal,
          textStyle: textTheme.labelMedium,
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: deepBioTeal,
          textStyle: textTheme.labelMedium,
          side: const BorderSide(color: deepBioTeal, width: 1.2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: mistGrey),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: mistGrey),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: deepBioTeal, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: errorRed),
        ),
        labelStyle: textTheme.labelSmall,
        hintStyle: textTheme.bodySmall,
      ),

      chipTheme: base.chipTheme.copyWith(
        backgroundColor: mistGrey,
        selectedColor: deepBioTeal.withValues(alpha: 0.12),
        labelStyle: textTheme.labelSmall,
        secondaryLabelStyle: textTheme.labelSmall?.copyWith(color: deepBioTeal),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),

      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        margin: const EdgeInsets.all(8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: deepGraphite,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),

      // Icon color defaults
      iconTheme: const IconThemeData(color: deepGraphite, size: 22),
    );
  }
}
