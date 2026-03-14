import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// Import the classes that will be implemented
// These imports will fail until the classes are created
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/storage_service.dart';

/// Mock for the HTTP client
class MockHttpClient extends Mock implements HttpClientWrapper {}

/// Mock for StorageService
class MockStorageService extends Mock implements StorageService {}

/// Fake classes for registerFallbackValue
class FakeUri extends Fake implements Uri {}

void main() {
  setUpAll(() {
    registerFallbackValue(FakeUri());
  });

  group('ApiClient', () {
    late ApiClient apiClient;
    late MockHttpClient mockHttpClient;
    late MockStorageService mockStorageService;

    const baseUrl = 'https://api.mystasis.com';

    setUp(() {
      mockHttpClient = MockHttpClient();
      mockStorageService = MockStorageService();
      apiClient = ApiClient(
        baseUrl: baseUrl,
        httpClient: mockHttpClient,
        storageService: mockStorageService,
      );
    });

    group('GET requests', () {
      test('should add Authorization header when token exists', () async {
        // Arrange
        const token = 'valid_jwt_token';
        const endpoint = '/auth/me';
        final responseData = {'id': 'user_1', 'email': 'test@example.com'};

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => token);
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 200,
              body: responseData,
            ));

        // Act
        await apiClient.get(endpoint);

        // Assert
        verify(() => mockHttpClient.get(
              Uri.parse('$baseUrl$endpoint'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $token',
              },
            )).called(1);
      });

      test('should not add Authorization header when no token exists', () async {
        // Arrange
        const endpoint = '/public/health';

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 200,
              body: {'status': 'ok'},
            ));

        // Act
        await apiClient.get(endpoint);

        // Assert
        verify(() => mockHttpClient.get(
              Uri.parse('$baseUrl$endpoint'),
              headers: {'Content-Type': 'application/json'},
            )).called(1);
      });

      test('should return parsed JSON body on successful response', () async {
        // Arrange
        const endpoint = '/auth/me';
        final expectedData = {'id': 'user_1', 'email': 'test@example.com'};

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 200,
              body: expectedData,
            ));

        // Act
        final result = await apiClient.get(endpoint);

        // Assert
        expect(result, equals(expectedData));
      });

      test('should throw UnauthorizedException on 401 response', () async {
        // Arrange
        const endpoint = '/auth/me';

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'expired_token');
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': 'Unauthorized'},
            ));

        // Act & Assert
        expect(
          () => apiClient.get(endpoint),
          throwsA(isA<UnauthorizedException>()),
        );
      });

      test('should throw ServerException on 500 response', () async {
        // Arrange
        const endpoint = '/auth/me';

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 500,
              body: {'message': 'Internal Server Error'},
            ));

        // Act & Assert
        expect(
          () => apiClient.get(endpoint),
          throwsA(isA<ServerException>()),
        );
      });

      test('should throw NetworkException on SocketException', () async {
        // Arrange
        const endpoint = '/auth/me';

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenThrow(const SocketException('No internet connection'));

        // Act & Assert
        expect(
          () => apiClient.get(endpoint),
          throwsA(isA<NetworkException>()),
        );
      });

      test('should throw NetworkException on timeout', () async {
        // Arrange
        const endpoint = '/auth/me';

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenThrow(TimeoutException('Request timed out'));

        // Act & Assert
        expect(
          () => apiClient.get(endpoint),
          throwsA(isA<NetworkException>()),
        );
      });
    });

    group('POST requests', () {
      test('should send JSON body correctly', () async {
        // Arrange
        const endpoint = '/auth/login';
        final requestBody = {'email': 'test@example.com', 'password': 'secret'};
        final responseData = {
          'access_token': 'new_token',
          'user': {'id': 'user_1'},
        };

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 200,
              body: responseData,
            ));

        // Act
        await apiClient.post(endpoint, body: requestBody);

        // Assert
        verify(() => mockHttpClient.post(
              Uri.parse('$baseUrl$endpoint'),
              headers: {'Content-Type': 'application/json'},
              body: requestBody,
            )).called(1);
      });

      test('should add Authorization header when token exists for POST', () async {
        // Arrange
        const endpoint = '/biomarkers';
        const token = 'auth_token';
        final requestBody = {'type': 'HRV', 'value': 65};

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => token);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 201,
              body: {'id': 'biomarker_1'},
            ));

        // Act
        await apiClient.post(endpoint, body: requestBody);

        // Assert
        verify(() => mockHttpClient.post(
              Uri.parse('$baseUrl$endpoint'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $token',
              },
              body: requestBody,
            )).called(1);
      });

      test('should return parsed JSON body on successful POST', () async {
        // Arrange
        const endpoint = '/auth/register';
        final requestBody = {
          'email': 'new@example.com',
          'password': 'password123',
          'firstName': 'John',
        };
        final expectedResponse = {
          'access_token': 'new_token',
          'user': {'id': 'user_1', 'email': 'new@example.com'},
        };

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 201,
              body: expectedResponse,
            ));

        // Act
        final result = await apiClient.post(endpoint, body: requestBody);

        // Assert
        expect(result, equals(expectedResponse));
      });

      test('should throw BadRequestException on 400 response', () async {
        // Arrange
        const endpoint = '/auth/register';
        final requestBody = {'email': 'invalid'};

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 400,
              body: {'message': 'Invalid email format'},
            ));

        // Act & Assert
        expect(
          () => apiClient.post(endpoint, body: requestBody),
          throwsA(isA<BadRequestException>()),
        );
      });

      test('should throw ConflictException on 409 response', () async {
        // Arrange
        const endpoint = '/auth/register';
        final requestBody = {
          'email': 'existing@example.com',
          'password': 'password123',
        };

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 409,
              body: {'message': 'Email already exists'},
            ));

        // Act & Assert
        expect(
          () => apiClient.post(endpoint, body: requestBody),
          throwsA(isA<ConflictException>()),
        );
      });

      test('should throw UnauthorizedException on 401 POST response', () async {
        // Arrange
        const endpoint = '/auth/login';
        final requestBody = {
          'email': 'test@example.com',
          'password': 'wrong_password',
        };

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': 'Invalid credentials'},
            ));

        // Act & Assert
        expect(
          () => apiClient.post(endpoint, body: requestBody),
          throwsA(isA<UnauthorizedException>()),
        );
      });

      test('should throw ServerException on 500 POST response', () async {
        // Arrange
        const endpoint = '/auth/register';
        final requestBody = {'email': 'test@example.com', 'password': '123456'};

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 500,
              body: {'message': 'Internal Server Error'},
            ));

        // Act & Assert
        expect(
          () => apiClient.post(endpoint, body: requestBody),
          throwsA(isA<ServerException>()),
        );
      });

      test('should throw NetworkException on network error during POST', () async {
        // Arrange
        const endpoint = '/auth/register';
        final requestBody = {'email': 'test@example.com', 'password': '123456'};

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenThrow(const SocketException('Network unavailable'));

        // Act & Assert
        expect(
          () => apiClient.post(endpoint, body: requestBody),
          throwsA(isA<NetworkException>()),
        );
      });
    });

    group('Error handling', () {
      test('should include error message from response body', () async {
        // Arrange
        const endpoint = '/auth/login';
        const errorMessage = 'Invalid email or password';

        when(() => mockStorageService.getToken()).thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': errorMessage},
            ));

        // Act & Assert
        expect(
          () => apiClient.post(endpoint, body: {}),
          throwsA(
            isA<UnauthorizedException>()
                .having((e) => e.message, 'message', contains(errorMessage)),
          ),
        );
      });

      test('should handle response without message field', () async {
        // Arrange
        const endpoint = '/auth/me';

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 404,
              body: {'error': 'Not found'},
            ));

        // Act & Assert
        expect(
          () => apiClient.get(endpoint),
          throwsA(isA<ApiException>()),
        );
      });

      test('should handle malformed JSON response', () async {
        // Arrange
        const endpoint = '/auth/me';

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenThrow(FormatException('Invalid JSON'));

        // Act & Assert
        expect(
          () => apiClient.get(endpoint),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('DELETE requests', () {
      test('should send DELETE request with auth header', () async {
        // Arrange
        const endpoint = '/auth/session';
        const token = 'auth_token';

        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => token);
        when(() => mockHttpClient.delete(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 204,
              body: null,
            ));

        // Act
        await apiClient.delete(endpoint);

        // Assert
        verify(() => mockHttpClient.delete(
              Uri.parse('$baseUrl$endpoint'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $token',
              },
            )).called(1);
      });
    });

    group('tryRefreshToken', () {
      test('should refresh token when stored refresh token exists and server returns 200', () async {
        // Arrange
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockStorageService.saveToken(any()))
            .thenAnswer((_) async {});
        when(() => mockStorageService.saveRefreshToken(any()))
            .thenAnswer((_) async {});
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 200,
              body: {
                'access_token': 'new_access_token',
                'refresh_token': 'new_refresh_token',
              },
            ));

        // Act
        final result = await apiClient.tryRefreshToken();

        // Assert
        expect(result, isTrue);
        verify(() => mockStorageService.saveToken('new_access_token')).called(1);
        verify(() => mockStorageService.saveRefreshToken('new_refresh_token')).called(1);
      });

      test('should return false and call onSessionExpired when no refresh token stored', () async {
        // Arrange
        var sessionExpiredCalled = false;
        apiClient.setSessionExpiredCallback(() {
          sessionExpiredCalled = true;
        });
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => null);

        // Act
        final result = await apiClient.tryRefreshToken();

        // Assert
        expect(result, isFalse);
        expect(sessionExpiredCalled, isTrue);
      });

      test('should return false and call onSessionExpired when refresh token is empty', () async {
        // Arrange
        var sessionExpiredCalled = false;
        apiClient.setSessionExpiredCallback(() {
          sessionExpiredCalled = true;
        });
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => '');

        // Act
        final result = await apiClient.tryRefreshToken();

        // Assert
        expect(result, isFalse);
        expect(sessionExpiredCalled, isTrue);
      });

      test('should return false when server returns non-200 status', () async {
        // Arrange
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': 'Invalid refresh token'},
            ));

        // Act
        final result = await apiClient.tryRefreshToken();

        // Assert
        expect(result, isFalse);
      });

      test('should return false when response missing access_token', () async {
        // Arrange
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 200,
              body: {
                'refresh_token': 'new_refresh_token',
              },
            ));

        // Act
        final result = await apiClient.tryRefreshToken();

        // Assert
        expect(result, isFalse);
      });

      test('should return false when HTTP call throws', () async {
        // Arrange
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenThrow(Exception('Network error'));

        // Act
        final result = await apiClient.tryRefreshToken();

        // Assert
        expect(result, isFalse);
      });

      test('should call onSessionExpired only once across multiple failures', () async {
        // Arrange
        var sessionExpiredCount = 0;
        apiClient.setSessionExpiredCallback(() {
          sessionExpiredCount++;
        });
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => null);

        // Act
        await apiClient.tryRefreshToken();
        await apiClient.tryRefreshToken();
        await apiClient.tryRefreshToken();

        // Assert
        expect(sessionExpiredCount, equals(1));
      });
    });

    group('refresh queue (concurrent 401s)', () {
      test('should queue concurrent refresh requests and resolve all when refresh succeeds', () async {
        // Arrange
        final completer = Completer<HttpResponse>();
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockStorageService.saveToken(any()))
            .thenAnswer((_) async {});
        when(() => mockStorageService.saveRefreshToken(any()))
            .thenAnswer((_) async {});
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) => completer.future);

        // Act - launch 3 concurrent refresh calls
        final future1 = apiClient.tryRefreshToken();
        final future2 = apiClient.tryRefreshToken();
        final future3 = apiClient.tryRefreshToken();

        // Complete the refresh with success
        completer.complete(HttpResponse(
          statusCode: 200,
          body: {
            'access_token': 'new_access',
            'refresh_token': 'new_refresh',
          },
        ));

        final results = await Future.wait([future1, future2, future3]);

        // Assert
        expect(results, equals([true, true, true]));
        // HTTP post should be called only once
        verify(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).called(1);
      });

      test('should reject all queued requests on failure', () async {
        // Arrange
        final completer = Completer<HttpResponse>();
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) => completer.future);

        // Act - launch 3 concurrent refresh calls
        final future1 = apiClient.tryRefreshToken();
        final future2 = apiClient.tryRefreshToken();
        final future3 = apiClient.tryRefreshToken();

        // Complete the refresh with failure
        completer.complete(HttpResponse(
          statusCode: 401,
          body: {'message': 'Invalid refresh token'},
        ));

        final results = await Future.wait([future1, future2, future3]);

        // Assert
        expect(results, equals([false, false, false]));
      });
    });

    group('skipRefresh flag', () {
      test('should bypass refresh on 401 with skipRefresh true', () async {
        // Arrange
        const endpoint = '/auth/logout';
        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': 'Unauthorized'},
            ));

        // Act & Assert
        expect(
          () => apiClient.post(endpoint, body: {}, skipRefresh: true),
          throwsA(isA<UnauthorizedException>()),
        );
        // Verify no refresh attempt was made
        verifyNever(() => mockStorageService.getRefreshToken());
      });

      test('should return normally on success with skipRefresh true', () async {
        // Arrange
        const endpoint = '/auth/logout';
        final responseData = {'message': 'ok'};
        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 200,
              body: responseData,
            ));

        // Act
        final result = await apiClient.post(endpoint, body: {}, skipRefresh: true);

        // Assert
        expect(result, equals(responseData));
      });
    });

    group('_executeWithRefresh retry', () {
      test('should retry GET after successful refresh on 401', () async {
        // Arrange
        var getCallCount = 0;
        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockStorageService.saveToken(any()))
            .thenAnswer((_) async {});
        when(() => mockStorageService.saveRefreshToken(any()))
            .thenAnswer((_) async {});

        // Mock GET: first call returns 401, second returns 200
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async {
          getCallCount++;
          if (getCallCount == 1) {
            return HttpResponse(
              statusCode: 401,
              body: {'message': 'Token expired'},
            );
          }
          return HttpResponse(
            statusCode: 200,
            body: {'data': 'success'},
          );
        });

        // Mock refresh POST
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 200,
              body: {
                'access_token': 'new_access_token',
                'refresh_token': 'new_refresh_token',
              },
            ));

        // Act
        final result = await apiClient.get('/api/data');

        // Assert
        expect(result, equals({'data': 'success'}));
        expect(getCallCount, equals(2));
      });

      test('should retry POST after successful refresh on 401', () async {
        // Arrange
        var postCallCount = 0;
        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockStorageService.saveToken(any()))
            .thenAnswer((_) async {});
        when(() => mockStorageService.saveRefreshToken(any()))
            .thenAnswer((_) async {});

        // Mock POST: need to distinguish refresh from data POST by URL
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((invocation) async {
          final url = invocation.positionalArguments[0] as Uri;
          if (url.path.contains('/auth/refresh')) {
            return HttpResponse(
              statusCode: 200,
              body: {
                'access_token': 'new_access_token',
                'refresh_token': 'new_refresh_token',
              },
            );
          }
          postCallCount++;
          if (postCallCount == 1) {
            return HttpResponse(
              statusCode: 401,
              body: {'message': 'Token expired'},
            );
          }
          return HttpResponse(
            statusCode: 200,
            body: {'created': true},
          );
        });

        // Act
        final result = await apiClient.post('/api/data', body: {'key': 'value'});

        // Assert
        expect(result, equals({'created': true}));
        expect(postCallCount, equals(2));
      });

      test('should throw when refresh fails during retry', () async {
        // Arrange
        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => 'token');
        when(() => mockStorageService.getRefreshToken())
            .thenAnswer((_) async => 'valid_refresh_token');

        // Mock GET: returns 401
        when(() => mockHttpClient.get(
              any(),
              headers: any(named: 'headers'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': 'Token expired'},
            ));

        // Mock refresh POST: returns failure
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': 'Invalid refresh token'},
            ));

        // Act & Assert
        expect(
          () => apiClient.get('/api/data'),
          throwsA(isA<UnauthorizedException>()),
        );
      });
    });

    group('_noRefreshEndpoints', () {
      test('should not attempt refresh on 401 from /auth/login', () async {
        // Arrange
        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': 'Invalid credentials'},
            ));

        // Act & Assert
        expect(
          () => apiClient.post('/auth/login', body: {
            'email': 'test@example.com',
            'password': 'wrong',
          }),
          throwsA(isA<UnauthorizedException>()),
        );
        // Verify no refresh token lookup was attempted
        verifyNever(() => mockStorageService.getRefreshToken());
      });

      test('should not attempt refresh on 401 from /auth/register', () async {
        // Arrange
        when(() => mockStorageService.getToken())
            .thenAnswer((_) async => null);
        when(() => mockHttpClient.post(
              any(),
              headers: any(named: 'headers'),
              body: any(named: 'body'),
            )).thenAnswer((_) async => HttpResponse(
              statusCode: 401,
              body: {'message': 'Unauthorized'},
            ));

        // Act & Assert
        expect(
          () => apiClient.post('/auth/register', body: {
            'email': 'test@example.com',
            'password': 'pass123',
          }),
          throwsA(isA<UnauthorizedException>()),
        );
        // Verify no refresh token lookup was attempted
        verifyNever(() => mockStorageService.getRefreshToken());
      });
    });
  });
}
