import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

/// Service for biometric authentication (Face ID / Touch ID on iOS).
///
/// Biometric auth gates access to stored credentials — it does not
/// replace backend authentication. The flow is:
/// 1. User logs in with email/password (normal flow)
/// 2. User enables biometric sign-in (stores enrollment flag)
/// 3. On next launch, if enrolled, app prompts biometric
/// 4. On success, app restores session from stored tokens
class BiometricAuthService {
  final LocalAuthentication _localAuth;

  BiometricAuthService({LocalAuthentication? localAuth})
      : _localAuth = localAuth ?? LocalAuthentication();

  /// Check if the device supports biometric authentication.
  /// Returns false on web and platforms without biometric hardware.
  Future<bool> isAvailable() async {
    if (kIsWeb) return false;
    try {
      final canCheck = await _localAuth.canCheckBiometrics;
      final isSupported = await _localAuth.isDeviceSupported();
      return canCheck && isSupported;
    } on PlatformException catch (e) {
      debugPrint('BiometricAuthService.isAvailable: ${e.code}');
      return false;
    }
  }

  /// Get the list of available biometric types (face, fingerprint, etc.).
  Future<List<BiometricType>> getAvailableBiometrics() async {
    if (kIsWeb) return [];
    try {
      return await _localAuth.getAvailableBiometrics();
    } on PlatformException catch (e) {
      debugPrint('BiometricAuthService.getAvailableBiometrics: ${e.code}');
      return [];
    }
  }

  /// Prompt the user for biometric authentication.
  /// Returns true if authentication succeeded, false otherwise.
  Future<bool> authenticate({
    String reason = 'Sign in to Mystasis',
  }) async {
    if (kIsWeb) return false;
    try {
      return await _localAuth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } on PlatformException catch (e) {
      debugPrint('BiometricAuthService.authenticate: ${e.code}');
      return false;
    }
  }

  /// Get a user-friendly label for the available biometric type.
  /// Returns "Face ID", "Touch ID", or "Biometrics" as appropriate.
  Future<String> getBiometricLabel() async {
    final biometrics = await getAvailableBiometrics();
    if (biometrics.contains(BiometricType.face)) {
      return 'Face ID';
    } else if (biometrics.contains(BiometricType.fingerprint)) {
      return 'Touch ID';
    }
    return 'Biometrics';
  }
}
