import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/user_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/auth_service.dart';
import 'package:mystasis/core/services/biometric_auth_service.dart';
import 'package:mystasis/core/services/storage_service.dart';
import 'package:mystasis/core/services/users_service.dart';

/// Provider for managing authentication state throughout the app
class AuthProvider extends ChangeNotifier {
  final AuthService _authService;
  final UsersService _usersService;
  final BiometricAuthService _biometricService;
  final StorageService _storageService;

  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  StreamSubscription<UserModel?>? _authStateSubscription;

  AuthProvider({
    AuthService? authService,
    UsersService? usersService,
    BiometricAuthService? biometricService,
    StorageService? storageService,
  })  : _authService = authService ?? AuthService(),
        _usersService = usersService ?? UsersService(),
        _biometricService = biometricService ?? BiometricAuthService(),
        _storageService = storageService ?? StorageService() {
    _initAuthStateListener();
    _initBiometricState();
  }

  /// Initialize listener for auth state changes
  void _initAuthStateListener() {
    _authStateSubscription = _authService.authStateChanges.listen((user) {
      _user = user;
      if (user != null) {
        _refreshBiometricState();
      }
      notifyListeners();
    });
  }

  /// Initialize biometric availability and enrollment state.
  Future<void> _initBiometricState() async {
    _biometricAvailable = await _biometricService.isAvailable();
    if (_biometricAvailable) {
      // Try to load enrollment for stored user (before login)
      final userId = await _storageService.getUserId();
      if (userId != null) {
        _biometricEnabled =
            await _storageService.isBiometricEnabled(userId: userId);
      }
    }
    notifyListeners();
  }

  /// Refresh biometric enabled state for the current user.
  Future<void> _refreshBiometricState() async {
    if (!_biometricAvailable || _user == null) return;
    _biometricEnabled =
        await _storageService.isBiometricEnabled(userId: _user!.id);
    notifyListeners();
  }

  /// Current authenticated user
  UserModel? get user => _user;

  /// Whether an auth operation is in progress
  bool get isLoading => _isLoading;

  /// Error message from the last failed operation
  String? get errorMessage => _errorMessage;

  /// Whether the user is authenticated
  bool get isAuthenticated => _user != null;

  /// Whether the device supports biometric authentication
  bool get biometricAvailable => _biometricAvailable;

  /// Whether the user has enabled biometric sign-in
  bool get biometricEnabled => _biometricEnabled;

  /// Clear the current error message
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Sign up a new user
  Future<bool> signUp({
    required String email,
    required String password,
    required DateTime birthdate,
    String? firstName,
    String? lastName,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await _authService.signUp(
        email: email,
        password: password,
        birthdate: birthdate,
        firstName: firstName,
        lastName: lastName,
      );
      _user = user;
      _isLoading = false;
      notifyListeners();
      return true;
    } on AuthException catch (e) {
      _errorMessage = _getErrorMessage(e.code);
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An error occurred. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Sign in an existing user
  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await _authService.signIn(
        email: email,
        password: password,
      );
      _user = user;
      _isLoading = false;
      notifyListeners();
      return true;
    } on AuthException catch (e) {
      _errorMessage = _getErrorMessage(e.code);
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An error occurred. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Sign out the current user
  Future<void> signOut() async {
    try {
      await _authService.signOut();
    } catch (e) {
      // Ignore errors during sign out
    }
  }

  /// Check authentication status on app launch
  Future<void> checkAuthStatus() async {
    await _authService.checkAuthState();
  }

  /// Update the current user's profile (firstName, lastName).
  Future<bool> updateProfile({String? firstName, String? lastName}) async {
    if (_user == null) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final updated = await _usersService.updateUser(
        _user!.id,
        firstName: firstName,
        lastName: lastName,
      );
      _user = updated;
      _isLoading = false;
      notifyListeners();
      return true;
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Failed to update profile');
      _errorMessage = 'Failed to update profile.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Update data sharing consent preferences.
  Future<bool> updateConsent({
    bool? shareWithClinician,
    bool? anonymousResearch,
  }) async {
    return _updatePreferences(
      shareWithClinician: shareWithClinician,
      anonymousResearch: anonymousResearch,
    );
  }

  /// Update notification preferences.
  Future<bool> updateNotifications({
    bool? notifyLabResults,
    bool? notifyAppointments,
    bool? notifyHealthAlerts,
    bool? notifyWeeklyDigest,
  }) async {
    return _updatePreferences(
      notifyLabResults: notifyLabResults,
      notifyAppointments: notifyAppointments,
      notifyHealthAlerts: notifyHealthAlerts,
      notifyWeeklyDigest: notifyWeeklyDigest,
    );
  }

  /// Shared implementation for preference updates (consent + notifications).
  Future<bool> _updatePreferences({
    bool? shareWithClinician,
    bool? anonymousResearch,
    bool? notifyLabResults,
    bool? notifyAppointments,
    bool? notifyHealthAlerts,
    bool? notifyWeeklyDigest,
  }) async {
    if (_user == null) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final updated = await _usersService.updateUser(
        _user!.id,
        shareWithClinician: shareWithClinician,
        anonymousResearch: anonymousResearch,
        notifyLabResults: notifyLabResults,
        notifyAppointments: notifyAppointments,
        notifyHealthAlerts: notifyHealthAlerts,
        notifyWeeklyDigest: notifyWeeklyDigest,
      );
      _user = updated;
      _isLoading = false;
      notifyListeners();
      return true;
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Failed to update preferences');
      _errorMessage = 'Failed to update preferences.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Change the current user's password.
  /// Requires [currentPassword] for verification before setting [newPassword].
  Future<bool> changePassword(String currentPassword, String newPassword) async {
    if (_user == null) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _usersService.updateUser(
        _user!.id,
        password: newPassword,
        currentPassword: currentPassword,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } on BadRequestException {
      _errorMessage = 'Password does not meet requirements. Please try a different password.';
      _isLoading = false;
      notifyListeners();
      return false;
    } on UnauthorizedException {
      _errorMessage = 'Current password is incorrect.';
      _isLoading = false;
      notifyListeners();
      return false;
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Failed to change password');
      _errorMessage = 'Failed to change password.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Delete the current user's account and sign out.
  /// Requires [password] for re-authentication before deletion.
  Future<bool> deleteAccount(String password) async {
    if (_user == null) return false;

    // Verify password without creating a new session
    try {
      final isValid = await _authService.verifyPassword(
        password: password,
      );
      if (!isValid) {
        _errorMessage = 'Incorrect password. Account was not deleted.';
        notifyListeners();
        return false;
      }
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Failed to verify password for account deletion');
      _errorMessage = 'Failed to verify identity. Please try again.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final deletedUserId = _user!.id;
      await _usersService.deleteUser(deletedUserId);
      await _storageService.clearBiometricData(userId: deletedUserId);
      _biometricEnabled = false;
      _isLoading = false;
      // Sign out to clear tokens and redirect to login
      await signOut();
      return true;
    } on NetworkException {
      _errorMessage = 'Unable to connect. Please check your network.';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Failed to delete account');
      _errorMessage = 'Failed to delete account.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Sign in using biometric authentication (Face ID / Touch ID).
  /// Prompts biometric, then restores the session from stored tokens.
  Future<bool> signInWithBiometric() async {
    if (!_biometricAvailable || !_biometricEnabled) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final authenticated = await _biometricService.authenticate();
      if (!authenticated) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Biometric passed — restore session from stored tokens
      await _authService.checkAuthState();
      _isLoading = false;
      notifyListeners();
      return _user != null;
    } catch (e) {
      debugPrint('Failed biometric sign-in');
      _errorMessage = 'Biometric sign-in failed. Please use your password.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Enable or disable biometric sign-in.
  /// When enabling, requires biometric verification to confirm identity.
  Future<void> setBiometricEnabled(bool enabled) async {
    if (_user == null) return;

    if (enabled) {
      // Require biometric verification before enabling
      final authenticated = await _biometricService.authenticate(
        reason: 'Verify your identity to enable biometric sign-in',
      );
      if (!authenticated) return;
    }

    await _storageService.setBiometricEnabled(enabled, userId: _user!.id);
    _biometricEnabled = enabled;
    notifyListeners();
  }

  /// Get the user-facing label for the biometric type (e.g., "Face ID").
  Future<String> getBiometricLabel() async {
    return _biometricService.getBiometricLabel();
  }

  /// Check if biometric sign-in is possible right now
  /// (device supports it, user enrolled, and both tokens exist).
  Future<bool> canSignInWithBiometric() async {
    if (!_biometricAvailable || !_biometricEnabled) return false;
    final hasAccess = await _storageService.hasToken();
    final refreshToken = await _storageService.getRefreshToken();
    return hasAccess && refreshToken != null && refreshToken.isNotEmpty;
  }

  /// Whether we should prompt the user to enable biometric sign-in.
  /// True when: device supports biometric, user hasn't been asked yet,
  /// and biometric is not already enabled.
  Future<bool> shouldPromptForBiometric() async {
    if (!_biometricAvailable || _biometricEnabled || _user == null) return false;
    final alreadyPrompted =
        await _storageService.isBiometricPromptShown(userId: _user!.id);
    return !alreadyPrompted;
  }

  /// Mark the biometric prompt as shown so we don't ask again.
  Future<void> markBiometricPromptShown() async {
    if (_user == null) return;
    await _storageService.setBiometricPromptShown(userId: _user!.id);
  }

  /// Map error codes to user-friendly messages
  String _getErrorMessage(String code) {
    switch (code) {
      case 'email-already-in-use':
        return 'An account already exists with this email.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'weak-password':
        return 'Password must be at least 8 characters.';
      case 'user-not-found':
        return 'No account found with this email.';
      case 'wrong-password':
        return 'Incorrect password. Please try again.';
      case 'invalid-credential':
        return 'Invalid email or password.';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'validation-error':
        return 'Please check your input and try again.';
      case 'network-error':
        return 'Unable to connect. Please check your network connection.';
      case 'server-error':
        return 'An error occurred. Please try again.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  @override
  void dispose() {
    _authStateSubscription?.cancel();
    _authService.dispose();
    super.dispose();
  }
}
