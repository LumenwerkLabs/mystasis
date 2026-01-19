import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mystasis/core/models/user_model.dart';
import 'package:mystasis/core/services/auth_service.dart';

/// Provider for managing authentication state throughout the app
class AuthProvider extends ChangeNotifier {
  final AuthService _authService;

  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;
  StreamSubscription<UserModel?>? _authStateSubscription;

  AuthProvider({AuthService? authService})
      : _authService = authService ?? AuthService() {
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
    String? firstName,
    String? lastName,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authService.signUp(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      );
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
      await _authService.signIn(
        email: email,
        password: password,
      );
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

  /// Map error codes to user-friendly messages
  String _getErrorMessage(String code) {
    switch (code) {
      case 'email-already-in-use':
        return 'An account already exists with this email.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'weak-password':
        return 'Password must be at least 6 characters.';
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
