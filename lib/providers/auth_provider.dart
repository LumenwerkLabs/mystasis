import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/user_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/auth_service.dart';
import 'package:mystasis/core/services/users_service.dart';

/// Provider for managing authentication state throughout the app
class AuthProvider extends ChangeNotifier {
  final AuthService _authService;
  final UsersService _usersService;

  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;
  StreamSubscription<UserModel?>? _authStateSubscription;

  AuthProvider({
    AuthService? authService,
    UsersService? usersService,
  })  : _authService = authService ?? AuthService(),
        _usersService = usersService ?? UsersService() {
    _initAuthStateListener();
  }

  /// Initialize listener for auth state changes
  void _initAuthStateListener() {
    _authStateSubscription = _authService.authStateChanges.listen((user) {
      _user = user;
      notifyListeners();
    });
  }

  /// Current authenticated user
  UserModel? get user => _user;

  /// Whether an auth operation is in progress
  bool get isLoading => _isLoading;

  /// Error message from the last failed operation
  String? get errorMessage => _errorMessage;

  /// Whether the user is authenticated
  bool get isAuthenticated => _user != null;

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
        email: _user!.email,
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
      await _usersService.deleteUser(_user!.id);
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
