import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/core/models/paginated_response.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/health_data_service.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';

class MockHealthDataService extends Mock implements HealthDataService {}

void main() {
  late MockHealthDataService mockService;
  late BiomarkersProvider provider;

  final testBiomarkers = [
    BiomarkerModel(
      id: '1',
      userId: 'u1',
      type: 'HEART_RATE_VARIABILITY',
      value: 55.0,
      unit: 'ms',
      timestamp: DateTime(2026, 3, 14, 10, 30),
    ),
    BiomarkerModel(
      id: '2',
      userId: 'u1',
      type: 'RESTING_HEART_RATE',
      value: 62.0,
      unit: 'bpm',
      timestamp: DateTime(2026, 3, 14, 8, 0),
    ),
    BiomarkerModel(
      id: '3',
      userId: 'u1',
      type: 'STEPS',
      value: 8500.0,
      unit: 'steps',
      timestamp: DateTime(2026, 3, 13, 23, 59),
    ),
    BiomarkerModel(
      id: '4',
      userId: 'u1',
      type: 'HEART_RATE_VARIABILITY',
      value: 48.0,
      unit: 'ms',
      timestamp: DateTime(2026, 3, 13, 10, 0),
    ),
  ];

  setUp(() {
    mockService = MockHealthDataService();
    provider = BiomarkersProvider(healthDataService: mockService);
  });

  group('BiomarkersProvider', () {
    group('initial state', () {
      test('should have empty biomarkers list', () {
        expect(provider.biomarkers, isEmpty);
      });

      test('should not be loading', () {
        expect(provider.isLoading, isFalse);
      });

      test('should have no error message', () {
        expect(provider.errorMessage, isNull);
      });
    });

    group('loadBiomarkers', () {
      test('should set biomarkers from service on success', () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenAnswer((_) async => PaginatedResponse(
                  data: testBiomarkers,
                  total: testBiomarkers.length,
                  page: 1,
                  limit: 100,
                ));

        await provider.loadBiomarkers('u1');

        expect(provider.biomarkers, equals(testBiomarkers));
        expect(provider.isLoading, isFalse);
        expect(provider.errorMessage, isNull);
      });

      test('should call service with limit of 100', () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenAnswer((_) async => PaginatedResponse(
                  data: [],
                  total: 0,
                  page: 1,
                  limit: 100,
                ));

        await provider.loadBiomarkers('u1');

        verify(() => mockService.getBiomarkers('u1', limit: 100)).called(1);
      });

      test('should skip if already loaded for the same userId', () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenAnswer((_) async => PaginatedResponse(
                  data: testBiomarkers,
                  total: testBiomarkers.length,
                  page: 1,
                  limit: 100,
                ));

        await provider.loadBiomarkers('u1');
        await provider.loadBiomarkers('u1');

        // Should only be called once since the second call is skipped
        verify(() => mockService.getBiomarkers('u1', limit: 100)).called(1);
      });

      test('should reload when called with a different userId', () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenAnswer((_) async => PaginatedResponse(
                  data: testBiomarkers,
                  total: testBiomarkers.length,
                  page: 1,
                  limit: 100,
                ));

        await provider.loadBiomarkers('u1');
        await provider.loadBiomarkers('u2');

        verify(() => mockService.getBiomarkers('u1', limit: 100)).called(1);
        verify(() => mockService.getBiomarkers('u2', limit: 100)).called(1);
      });

      test('should set error message on UnauthorizedException (falls to generic handler)', () async {
        // UnauthorizedException is now handled by ApiClient interceptor.
        // If it reaches the provider, the generic catch handles it.
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenThrow(
                const UnauthorizedException('Session expired'));

        await provider.loadBiomarkers('u1');

        expect(provider.errorMessage,
            equals('Failed to load biomarkers.'));
        expect(provider.isLoading, isFalse);
        expect(provider.biomarkers, isEmpty);
      });

      test('should set error message on NetworkException', () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenThrow(const NetworkException('No connection'));

        await provider.loadBiomarkers('u1');

        expect(provider.errorMessage,
            equals('Unable to connect. Please check your network.'));
        expect(provider.isLoading, isFalse);
        expect(provider.biomarkers, isEmpty);
      });

      test('should set generic error message on unexpected exception',
          () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenThrow(Exception('Something went wrong'));

        await provider.loadBiomarkers('u1');

        expect(
            provider.errorMessage, equals('Failed to load biomarkers.'));
        expect(provider.isLoading, isFalse);
        expect(provider.biomarkers, isEmpty);
      });

      test('should notify listeners when loading starts and finishes',
          () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenAnswer((_) async => PaginatedResponse(
                  data: testBiomarkers,
                  total: testBiomarkers.length,
                  page: 1,
                  limit: 100,
                ));

        final loadingStates = <bool>[];
        provider.addListener(() {
          loadingStates.add(provider.isLoading);
        });

        await provider.loadBiomarkers('u1');

        // First notification: isLoading = true, second: isLoading = false
        expect(loadingStates, equals([true, false]));
      });
    });

    group('reloadBiomarkers', () {
      test('should force reload even if same userId', () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenAnswer((_) async => PaginatedResponse(
                  data: testBiomarkers,
                  total: testBiomarkers.length,
                  page: 1,
                  limit: 100,
                ));

        await provider.loadBiomarkers('u1');
        await provider.reloadBiomarkers('u1');

        // Should be called twice: initial load + forced reload
        verify(() => mockService.getBiomarkers('u1', limit: 100)).called(2);
      });
    });

    group('latestByType', () {
      test('should return most recent biomarker per type', () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenAnswer((_) async => PaginatedResponse(
                  data: testBiomarkers,
                  total: testBiomarkers.length,
                  page: 1,
                  limit: 100,
                ));

        await provider.loadBiomarkers('u1');

        final latest = provider.latestByType;

        // Should have 3 types: HRV, RESTING_HEART_RATE, STEPS
        expect(latest.length, equals(3));

        // For HRV, the latest should be the one from Mar 14 (value 55.0)
        final latestHrv = latest.firstWhere(
            (b) => b.type == 'HEART_RATE_VARIABILITY');
        expect(latestHrv.value, equals(55.0));
        expect(latestHrv.id, equals('1'));
      });

      test('should return empty list when no biomarkers loaded', () {
        expect(provider.latestByType, isEmpty);
      });
    });

    group('groupedByType', () {
      test('should group biomarkers by type', () async {
        when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
            .thenAnswer((_) async => PaginatedResponse(
                  data: testBiomarkers,
                  total: testBiomarkers.length,
                  page: 1,
                  limit: 100,
                ));

        await provider.loadBiomarkers('u1');

        final grouped = provider.groupedByType;

        expect(grouped.keys.length, equals(3));
        expect(grouped['HEART_RATE_VARIABILITY']!.length, equals(2));
        expect(grouped['RESTING_HEART_RATE']!.length, equals(1));
        expect(grouped['STEPS']!.length, equals(1));
      });

      test('should return empty map when no biomarkers loaded', () {
        expect(provider.groupedByType, isEmpty);
      });
    });
  });
}
