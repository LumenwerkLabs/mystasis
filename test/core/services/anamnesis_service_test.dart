import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:mystasis/core/models/anamnesis_model.dart';
import 'package:mystasis/core/models/paginated_response.dart';
import 'package:mystasis/core/services/anamnesis_service.dart';
import 'package:mystasis/core/services/api_client.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient mockApiClient;
  late AnamnesisService service;

  final testRecordedAt = DateTime(2026, 3, 14, 10, 30);

  final testAnamnesisJson = {
    'id': 'anamnesis-1',
    'patientId': 'patient-1',
    'clinicianId': 'clinician-1',
    'rawTranscript': 'Patient reports persistent headaches for two weeks.',
    'chiefComplaint': 'Persistent headaches',
    'historyOfPresentIllness': 'Headaches started two weeks ago, daily, moderate severity.',
    'pastMedicalHistory': ['Hypertension diagnosed 2020'],
    'currentMedications': ['Lisinopril 10mg daily'],
    'allergies': ['Penicillin'],
    'familyHistory': ['Father: Type 2 Diabetes'],
    'reviewOfSystems': ['Neurological: headaches, no vision changes'],
    'socialHistory': ['Non-smoker', 'Moderate alcohol use'],
    'isReviewed': true,
    'recordedAt': testRecordedAt.toIso8601String(),
  };

  final testAnamnesis = AnamnesisModel(
    patientId: 'patient-1',
    clinicianId: 'clinician-1',
    rawTranscript: 'Patient reports persistent headaches for two weeks.',
    chiefComplaint: 'Persistent headaches',
    historyOfPresentIllness: 'Headaches started two weeks ago, daily, moderate severity.',
    pastMedicalHistory: ['Hypertension diagnosed 2020'],
    currentMedications: ['Lisinopril 10mg daily'],
    allergies: ['Penicillin'],
    familyHistory: ['Father: Type 2 Diabetes'],
    reviewOfSystems: ['Neurological: headaches, no vision changes'],
    socialHistory: ['Non-smoker', 'Moderate alcohol use'],
    isReviewed: true,
    recordedAt: testRecordedAt,
  );

  setUp(() {
    mockApiClient = MockApiClient();
    service = AnamnesisService(apiClient: mockApiClient);
  });

  group('AnamnesisService', () {
    group('create', () {
      test('should post anamnesis and return created model', () async {
        when(() => mockApiClient.post(any(), body: any(named: 'body')))
            .thenAnswer((_) async => testAnamnesisJson);

        final result = await service.create(testAnamnesis);

        expect(result.patientId, equals('patient-1'));
        expect(result.clinicianId, equals('clinician-1'));
        expect(result.chiefComplaint, equals('Persistent headaches'));
        expect(result.id, equals('anamnesis-1'));
        verify(() => mockApiClient.post('/anamnesis', body: any(named: 'body')))
            .called(1);
      });

      test('should propagate ApiException on failure', () async {
        when(() => mockApiClient.post(any(), body: any(named: 'body')))
            .thenThrow(const ServerException('Internal Server Error'));

        expect(
          () => service.create(testAnamnesis),
          throwsA(isA<ServerException>()),
        );
      });

      test('should propagate UnauthorizedException on 401', () async {
        when(() => mockApiClient.post(any(), body: any(named: 'body')))
            .thenThrow(const UnauthorizedException('Session expired'));

        expect(
          () => service.create(testAnamnesis),
          throwsA(isA<UnauthorizedException>()),
        );
      });
    });

    group('getForPatient', () {
      test('should fetch paginated anamneses with default params', () async {
        when(() => mockApiClient.get(any())).thenAnswer((_) async => {
              'data': [testAnamnesisJson],
              'total': 1,
              'page': 1,
              'limit': 20,
            });

        final result = await service.getForPatient('patient-1');

        expect(result, isA<PaginatedResponse<AnamnesisModel>>());
        expect(result.data.length, equals(1));
        expect(result.data.first.chiefComplaint, equals('Persistent headaches'));
        expect(result.total, equals(1));
        verify(() => mockApiClient.get('/anamnesis/patient/patient-1?page=1&limit=20'))
            .called(1);
      });

      test('should pass custom page and limit parameters', () async {
        when(() => mockApiClient.get(any())).thenAnswer((_) async => {
              'data': [],
              'total': 0,
              'page': 2,
              'limit': 10,
            });

        await service.getForPatient('patient-1', page: 2, limit: 10);

        verify(() => mockApiClient.get('/anamnesis/patient/patient-1?page=2&limit=10'))
            .called(1);
      });

      test('should return empty list when no anamneses exist', () async {
        when(() => mockApiClient.get(any())).thenAnswer((_) async => {
              'data': [],
              'total': 0,
              'page': 1,
              'limit': 20,
            });

        final result = await service.getForPatient('patient-1');

        expect(result.data, isEmpty);
        expect(result.total, equals(0));
      });

      test('should propagate NetworkException', () async {
        when(() => mockApiClient.get(any()))
            .thenThrow(const NetworkException('No connection'));

        expect(
          () => service.getForPatient('patient-1'),
          throwsA(isA<NetworkException>()),
        );
      });
    });

    group('getById', () {
      test('should fetch single anamnesis by id', () async {
        when(() => mockApiClient.get(any()))
            .thenAnswer((_) async => testAnamnesisJson);

        final result = await service.getById('anamnesis-1');

        expect(result.id, equals('anamnesis-1'));
        expect(result.chiefComplaint, equals('Persistent headaches'));
        verify(() => mockApiClient.get('/anamnesis/anamnesis-1')).called(1);
      });

      test('should propagate exception when not found', () async {
        when(() => mockApiClient.get(any()))
            .thenThrow(const ApiException('Not found', statusCode: 404));

        expect(
          () => service.getById('nonexistent'),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('update', () {
      test('should patch anamnesis and return updated model', () async {
        final updatedJson = Map<String, dynamic>.from(testAnamnesisJson)
          ..['chiefComplaint'] = 'Updated complaint';

        when(() => mockApiClient.patch(any(), body: any(named: 'body')))
            .thenAnswer((_) async => updatedJson);

        final result = await service.update(
          'anamnesis-1',
          {'chiefComplaint': 'Updated complaint'},
        );

        expect(result.chiefComplaint, equals('Updated complaint'));
        verify(() => mockApiClient.patch(
              '/anamnesis/anamnesis-1',
              body: {'chiefComplaint': 'Updated complaint'},
            )).called(1);
      });

      test('should update isReviewed flag', () async {
        final updatedJson = Map<String, dynamic>.from(testAnamnesisJson)
          ..['isReviewed'] = true;

        when(() => mockApiClient.patch(any(), body: any(named: 'body')))
            .thenAnswer((_) async => updatedJson);

        final result = await service.update(
          'anamnesis-1',
          {'isReviewed': true},
        );

        expect(result.isReviewed, isTrue);
      });

      test('should propagate ForbiddenException for non-clinicians', () async {
        when(() => mockApiClient.patch(any(), body: any(named: 'body')))
            .thenThrow(const ForbiddenException('Clinician access required'));

        expect(
          () => service.update('anamnesis-1', {'chiefComplaint': 'test'}),
          throwsA(isA<ForbiddenException>()),
        );
      });
    });

    group('delete', () {
      test('should call delete endpoint', () async {
        when(() => mockApiClient.delete(any()))
            .thenAnswer((_) async => null);

        await service.delete('anamnesis-1');

        verify(() => mockApiClient.delete('/anamnesis/anamnesis-1')).called(1);
      });

      test('should propagate ForbiddenException', () async {
        when(() => mockApiClient.delete(any()))
            .thenThrow(const ForbiddenException('Clinician access required'));

        expect(
          () => service.delete('anamnesis-1'),
          throwsA(isA<ForbiddenException>()),
        );
      });

      test('should propagate exception when not found', () async {
        when(() => mockApiClient.delete(any()))
            .thenThrow(const ApiException('Not found', statusCode: 404));

        expect(
          () => service.delete('nonexistent'),
          throwsA(isA<ApiException>()),
        );
      });
    });
  });
}
