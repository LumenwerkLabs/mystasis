import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:mystasis/core/models/anamnesis_model.dart';
import 'package:mystasis/core/models/paginated_response.dart';
import 'package:mystasis/core/services/anamnesis_channel.dart';
import 'package:mystasis/core/services/anamnesis_service.dart';
import 'package:mystasis/providers/anamnesis_provider.dart';

class MockAnamnesisChannel extends Mock implements AnamnesisChannel {}

class MockAnamnesisService extends Mock implements AnamnesisService {}

class FakeAnamnesisModel extends Fake implements AnamnesisModel {}

void main() {
  late MockAnamnesisChannel mockChannel;
  late MockAnamnesisService mockService;
  late AnamnesisProvider provider;

  final testRecordedAt = DateTime(2026, 3, 14, 10, 30);

  final testAnamnesis = AnamnesisModel(
    id: 'anamnesis-1',
    patientId: 'patient-1',
    clinicianId: 'clinician-1',
    rawTranscript: 'Patient reports persistent headaches.',
    chiefComplaint: 'Persistent headaches',
    historyOfPresentIllness: 'Headaches for two weeks.',
    pastMedicalHistory: ['Hypertension'],
    currentMedications: ['Lisinopril 10mg'],
    allergies: ['Penicillin'],
    familyHistory: ['Father: Diabetes'],
    reviewOfSystems: ['Neurological: headaches'],
    socialHistory: ['Non-smoker'],
    isReviewed: false,
    recordedAt: testRecordedAt,
  );

  final testAnamnesis2 = AnamnesisModel(
    id: 'anamnesis-2',
    patientId: 'patient-1',
    clinicianId: 'clinician-1',
    rawTranscript: 'Follow-up consultation.',
    chiefComplaint: 'Follow-up headaches',
    historyOfPresentIllness: 'Headaches improving.',
    pastMedicalHistory: ['Hypertension'],
    currentMedications: ['Lisinopril 10mg'],
    allergies: ['Penicillin'],
    familyHistory: ['Father: Diabetes'],
    reviewOfSystems: ['Neurological: mild headaches'],
    socialHistory: ['Non-smoker'],
    isReviewed: true,
    recordedAt: DateTime(2026, 3, 15, 14, 0),
  );

  setUpAll(() {
    registerFallbackValue(FakeAnamnesisModel());
  });

  setUp(() {
    mockChannel = MockAnamnesisChannel();
    mockService = MockAnamnesisService();
    provider = AnamnesisProvider(
      channel: mockChannel,
      anamnesisService: mockService,
    );
  });

  tearDown(() {
    provider.dispose();
  });

  /// Helper to set up mocks for a full recording→structuring flow.
  void setUpRecordingMocks({
    String finalTranscript = 'Transcript text.',
    Map<String, dynamic>? structuredOutput,
  }) {
    when(() => mockChannel.requestMicrophonePermission())
        .thenAnswer((_) async => true);
    when(() => mockChannel.startTranscription(locale: any(named: 'locale')))
        .thenAnswer((_) async {});
    when(() => mockChannel.transcriptStream)
        .thenAnswer((_) => const Stream<TranscriptUpdate>.empty());
    when(() => mockChannel.resetTranscriptStream()).thenReturn(null);
    when(() => mockChannel.stopTranscription())
        .thenAnswer((_) async => finalTranscript);
    when(() => mockChannel.structureAnamnesis(any()))
        .thenAnswer((_) async => structuredOutput ?? {
              'chiefComplaint': 'Headaches',
              'historyOfPresentIllness': 'Two weeks.',
              'pastMedicalHistory': <String>[],
              'currentMedications': <String>[],
              'allergies': <String>[],
              'familyHistory': <String>[],
              'reviewOfSystems': <String>[],
              'socialHistory': <String>[],
            });
  }

  /// Helper to set up mocks for loadAnamneses.
  void setUpLoadMocks(List<AnamnesisModel> data) {
    when(() => mockService.getForPatient(
          any(),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        )).thenAnswer((_) async => PaginatedResponse(
          data: data,
          total: data.length,
          page: 1,
          limit: 20,
        ));
  }

  group('AnamnesisProvider', () {
    group('initial state', () {
      test('should be in idle state', () {
        expect(provider.state, equals(AnamnesisSessionState.idle));
      });

      test('should have empty live transcript', () {
        expect(provider.liveTranscript, isEmpty);
      });

      test('should have empty final transcript', () {
        expect(provider.finalTranscript, isEmpty);
      });

      test('should have no structured anamnesis', () {
        expect(provider.structuredAnamnesis, isNull);
      });

      test('should have no error message', () {
        expect(provider.errorMessage, isNull);
      });

      test('should not be recording', () {
        expect(provider.isRecording, isFalse);
      });

      test('should not be processing', () {
        expect(provider.isProcessing, isFalse);
      });

      test('should have empty saved anamneses', () {
        expect(provider.savedAnamneses, isEmpty);
      });

      test('should have zero recording duration', () {
        expect(provider.recordingDuration, equals(Duration.zero));
      });

      test('should not be loading history', () {
        expect(provider.isLoadingHistory, isFalse);
      });
    });

    group('checkAvailability', () {
      test('should update availability from channel', () async {
        const availability = AnamnesisAvailability(
          speechAvailable: true,
          foundationModelsAvailable: true,
        );
        when(() => mockChannel.checkAvailability())
            .thenAnswer((_) async => availability);

        await provider.checkAvailability();

        expect(provider.availability, isNotNull);
        expect(provider.availability!.speechAvailable, isTrue);
        expect(provider.availability!.foundationModelsAvailable, isTrue);
        expect(provider.availability!.isFullyAvailable, isTrue);
      });

      test('should notify listeners after checking availability', () async {
        const availability = AnamnesisAvailability(
          speechAvailable: false,
          foundationModelsAvailable: false,
        );
        when(() => mockChannel.checkAvailability())
            .thenAnswer((_) async => availability);

        var notified = false;
        provider.addListener(() => notified = true);

        await provider.checkAvailability();

        expect(notified, isTrue);
      });
    });

    group('startRecording', () {
      test('should transition to error when microphone permission denied',
          () async {
        when(() => mockChannel.requestMicrophonePermission())
            .thenAnswer((_) async => false);

        await provider.startRecording();

        expect(provider.state, equals(AnamnesisSessionState.error));
        expect(provider.errorMessage, contains('Microphone access'));
      });

      test('should transition to recording on success', () async {
        setUpRecordingMocks();

        await provider.startRecording();

        expect(provider.state, equals(AnamnesisSessionState.recording));
        expect(provider.isRecording, isTrue);
      });

      test('should reset state before starting', () async {
        setUpRecordingMocks();

        await provider.startRecording(patientId: 'patient-1');

        expect(provider.liveTranscript, isEmpty);
        expect(provider.finalTranscript, isEmpty);
        expect(provider.structuredAnamnesis, isNull);
        expect(provider.errorMessage, isNull);
      });

      test('should transition to error when startTranscription throws',
          () async {
        when(() => mockChannel.requestMicrophonePermission())
            .thenAnswer((_) async => true);
        when(() => mockChannel.startTranscription(locale: any(named: 'locale')))
            .thenThrow(Exception('Speech not available'));

        await provider.startRecording();

        expect(provider.state, equals(AnamnesisSessionState.error));
        expect(provider.errorMessage, contains('Failed to start recording'));
      });

      test('should track state transitions through listeners', () async {
        setUpRecordingMocks();

        final states = <AnamnesisSessionState>[];
        provider.addListener(() {
          states.add(provider.state);
        });

        await provider.startRecording();

        expect(states.first, equals(AnamnesisSessionState.requesting));
        expect(states.last, equals(AnamnesisSessionState.recording));
      });
    });

    group('stopRecording', () {
      test('should stop and transition to structuring then reviewing',
          () async {
        setUpRecordingMocks(
          finalTranscript: 'Patient reports headaches.',
          structuredOutput: {
            'chiefComplaint': 'Headaches',
            'historyOfPresentIllness': 'Two weeks of headaches.',
            'pastMedicalHistory': <String>[],
            'currentMedications': <String>[],
            'allergies': <String>[],
            'familyHistory': <String>[],
            'reviewOfSystems': <String>[],
            'socialHistory': <String>[],
          },
        );

        await provider.startRecording(patientId: 'patient-1');
        await provider.stopRecording();

        expect(provider.state, equals(AnamnesisSessionState.reviewing));
        expect(provider.hasResult, isTrue);
        expect(
            provider.finalTranscript, equals('Patient reports headaches.'));
        expect(provider.structuredAnamnesis, isNotNull);
        expect(
          provider.structuredAnamnesis!.chiefComplaint,
          equals('Headaches'),
        );
      });

      test('should transition to error when stop fails', () async {
        setUpRecordingMocks();
        // Override stopTranscription to throw
        when(() => mockChannel.stopTranscription())
            .thenThrow(Exception('Stop failed'));

        await provider.startRecording();
        await provider.stopRecording();

        expect(provider.state, equals(AnamnesisSessionState.error));
      });
    });

    group('saveAnamnesis', () {
      test('should save to backend and add to saved list', () async {
        final savedAnamnesis = testAnamnesis.copyWith(id: 'saved-1');
        when(() => mockService.create(any()))
            .thenAnswer((_) async => savedAnamnesis);
        setUpRecordingMocks();

        await provider.startRecording(patientId: 'patient-1');
        await provider.stopRecording();
        await provider.saveAnamnesis('patient-1', 'clinician-1');

        expect(provider.state, equals(AnamnesisSessionState.saved));
        expect(provider.savedAnamneses.length, equals(1));
        expect(provider.savedAnamneses.first.id, equals('saved-1'));
        verify(() => mockService.create(any())).called(1);
      });

      test('should do nothing if no structured anamnesis exists', () async {
        await provider.saveAnamnesis('patient-1', 'clinician-1');

        expect(provider.state, equals(AnamnesisSessionState.idle));
        verifyNever(() => mockService.create(any()));
      });

      test('should set error state when backend save fails', () async {
        when(() => mockService.create(any()))
            .thenThrow(Exception('Network error'));
        setUpRecordingMocks();

        await provider.startRecording(patientId: 'patient-1');
        await provider.stopRecording();
        await provider.saveAnamnesis('patient-1', 'clinician-1');

        expect(provider.state, equals(AnamnesisSessionState.error));
        expect(provider.errorMessage, contains('Failed to save'));
      });
    });

    group('saveAnamnesis without service', () {
      test('should save locally when no AnamnesisService provided', () async {
        final providerNoService = AnamnesisProvider(channel: mockChannel);
        setUpRecordingMocks();

        await providerNoService.startRecording(patientId: 'patient-1');
        await providerNoService.stopRecording();
        await providerNoService.saveAnamnesis('patient-1', 'clinician-1');

        expect(providerNoService.state, equals(AnamnesisSessionState.saved));
        expect(providerNoService.savedAnamneses.length, equals(1));

        providerNoService.dispose();
      });
    });

    group('loadAnamneses', () {
      test('should load anamneses from backend for patient', () async {
        setUpLoadMocks([testAnamnesis, testAnamnesis2]);

        await provider.loadAnamneses('patient-1');

        expect(provider.savedAnamneses.length, equals(2));
        expect(provider.isLoadingHistory, isFalse);
      });

      test('should set loading state during fetch', () async {
        setUpLoadMocks([testAnamnesis]);

        final loadingStates = <bool>[];
        provider.addListener(() {
          loadingStates.add(provider.isLoadingHistory);
        });

        await provider.loadAnamneses('patient-1');

        // First: isLoadingHistory = true, second: isLoadingHistory = false
        expect(loadingStates, equals([true, false]));
      });

      test('should set error message on load failure', () async {
        when(() => mockService.getForPatient(
              any(),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenThrow(Exception('Network error'));

        await provider.loadAnamneses('patient-1');

        expect(provider.errorMessage,
            contains('Failed to load anamnesis history'));
        expect(provider.isLoadingHistory, isFalse);
      });

      test('should do nothing when no service is configured', () async {
        final providerNoService = AnamnesisProvider(channel: mockChannel);

        await providerNoService.loadAnamneses('patient-1');

        expect(providerNoService.savedAnamneses, isEmpty);

        providerNoService.dispose();
      });
    });

    group('deleteAnamnesis', () {
      test('should delete from backend and remove from local list', () async {
        setUpLoadMocks([testAnamnesis, testAnamnesis2]);
        when(() => mockService.delete(any())).thenAnswer((_) async {});

        // Load first to populate list
        await provider.loadAnamneses('patient-1');
        expect(provider.savedAnamneses.length, equals(2));

        await provider.deleteAnamnesis('anamnesis-1');

        expect(provider.savedAnamneses.length, equals(1));
        expect(provider.savedAnamneses.first.id, equals('anamnesis-2'));
        verify(() => mockService.delete('anamnesis-1')).called(1);
      });

      test('should set error message on delete failure', () async {
        setUpLoadMocks([testAnamnesis]);
        when(() => mockService.delete(any()))
            .thenThrow(Exception('Delete failed'));

        await provider.loadAnamneses('patient-1');
        await provider.deleteAnamnesis('anamnesis-1');

        expect(provider.errorMessage, contains('Failed to delete'));
        // List should not be modified on failure
        expect(provider.savedAnamneses.length, equals(1));
      });

      test('should do nothing when no service is configured', () async {
        final providerNoService = AnamnesisProvider(channel: mockChannel);

        await providerNoService.deleteAnamnesis('anamnesis-1');

        expect(providerNoService.savedAnamneses, isEmpty);

        providerNoService.dispose();
      });
    });

    group('resetSession', () {
      test('should reset all session state to idle', () async {
        setUpRecordingMocks();

        await provider.startRecording(patientId: 'patient-1');
        expect(provider.state, equals(AnamnesisSessionState.recording));

        provider.resetSession();

        expect(provider.state, equals(AnamnesisSessionState.idle));
        expect(provider.liveTranscript, isEmpty);
        expect(provider.finalTranscript, isEmpty);
        expect(provider.structuredAnamnesis, isNull);
        expect(provider.errorMessage, isNull);
        expect(provider.recordingDuration, equals(Duration.zero));
      });
    });

    group('clearForPatient', () {
      test('should clear saved anamneses and reset session', () async {
        setUpLoadMocks([testAnamnesis]);

        await provider.loadAnamneses('patient-1');
        expect(provider.savedAnamneses.length, equals(1));

        provider.clearForPatient();

        expect(provider.savedAnamneses, isEmpty);
        expect(provider.state, equals(AnamnesisSessionState.idle));
      });
    });

    group('reStructure', () {
      test('should do nothing if final transcript is empty', () async {
        await provider.reStructure();

        expect(provider.state, equals(AnamnesisSessionState.idle));
      });
    });
  });
}
