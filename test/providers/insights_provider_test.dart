import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:mystasis/core/models/llm_summary_model.dart';
import 'package:mystasis/core/services/api_client.dart';
import 'package:mystasis/core/services/llm_service.dart';
import 'package:mystasis/providers/insights_provider.dart';

class MockLlmService extends Mock implements LlmService {}

void main() {
  late MockLlmService mockService;
  late InsightsProvider provider;

  final testNudge = LlmSummaryModel(
    id: 'nudge-1',
    content: 'Remember to stay hydrated today!',
    type: SummaryType.wellnessNudge,
    generatedAt: DateTime(2026, 3, 14),
    disclaimer: 'This is not medical advice.',
  );

  final testNudgeWithStructuredData = LlmSummaryModel(
    id: 'nudge-2',
    content: 'Your HRV has been trending up this week.',
    type: SummaryType.wellnessNudge,
    generatedAt: DateTime(2026, 3, 14),
    disclaimer: 'This is not medical advice.',
    structuredData: const StructuredData(
      recommendations: ['Keep up your sleep routine', 'Stay active'],
      questionsForDoctor: ['Ask about HRV targets'],
    ),
  );

  setUp(() {
    mockService = MockLlmService();
    provider = InsightsProvider(llmService: mockService);
  });

  group('generateNudge', () {
    test('should set isLoadingNudge to true while loading', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenAnswer((_) async => testNudge);

      bool wasLoadingDuringCall = false;
      provider.addListener(() {
        if (provider.isLoadingNudge) wasLoadingDuringCall = true;
      });

      await provider.generateNudge('user-1');

      expect(wasLoadingDuringCall, isTrue);
      expect(provider.isLoadingNudge, isFalse);
    });

    test('should store result in currentNudge on success', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenAnswer((_) async => testNudge);

      await provider.generateNudge('user-1');

      expect(provider.currentNudge, equals(testNudge));
      expect(provider.nudgeError, isNull);
    });

    test('should store nudge with structured data', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenAnswer((_) async => testNudgeWithStructuredData);

      await provider.generateNudge('user-1');

      expect(provider.currentNudge, equals(testNudgeWithStructuredData));
      expect(
          provider.currentNudge!.structuredData!.recommendations, hasLength(2));
    });

    test('should set nudgeError on UnauthorizedException (falls to generic handler)', () async {
      // UnauthorizedException is now handled by the ApiClient interceptor,
      // but if it somehow reaches the provider, the generic catch handles it.
      when(() => mockService.generateNudge('user-1'))
          .thenThrow(UnauthorizedException('expired'));

      await provider.generateNudge('user-1');

      expect(provider.currentNudge, isNull);
      expect(provider.nudgeError, 'Failed to generate insights. Please try again.');
      expect(provider.isLoadingNudge, isFalse);
    });

    test('should set nudgeError on NetworkException', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenThrow(NetworkException('no connection'));

      await provider.generateNudge('user-1');

      expect(provider.currentNudge, isNull);
      expect(
          provider.nudgeError, 'Unable to connect. Please check your network.');
    });

    test('should set nudgeError on generic exception', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenThrow(Exception('something broke'));

      await provider.generateNudge('user-1');

      expect(provider.currentNudge, isNull);
      expect(provider.nudgeError,
          'Failed to generate insights. Please try again.');
    });

    test('should replace previous nudge on new call', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenAnswer((_) async => testNudge);

      await provider.generateNudge('user-1');
      expect(provider.currentNudge!.id, 'nudge-1');

      when(() => mockService.generateNudge('user-1'))
          .thenAnswer((_) async => testNudgeWithStructuredData);

      await provider.generateNudge('user-1');
      expect(provider.currentNudge!.id, 'nudge-2');
    });

    test('should clear previous error on new call', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenThrow(Exception('fail'));
      await provider.generateNudge('user-1');
      expect(provider.nudgeError, isNotNull);

      when(() => mockService.generateNudge('user-1'))
          .thenAnswer((_) async => testNudge);
      await provider.generateNudge('user-1');
      expect(provider.nudgeError, isNull);
    });
  });

  group('clearNudge', () {
    test('should reset nudge state', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenAnswer((_) async => testNudge);

      await provider.generateNudge('user-1');
      expect(provider.currentNudge, isNotNull);

      provider.clearNudge();

      expect(provider.currentNudge, isNull);
      expect(provider.nudgeError, isNull);
    });
  });

  group('generateSummary', () {
    test('should not affect nudge state', () async {
      when(() => mockService.generateNudge('user-1'))
          .thenAnswer((_) async => testNudge);
      await provider.generateNudge('user-1');

      final summary = LlmSummaryModel(
        id: 'summary-1',
        content: 'Weekly summary content',
        type: SummaryType.weeklySummary,
        generatedAt: DateTime(2026, 3, 14),
        disclaimer: 'Not medical advice.',
      );
      when(() => mockService.generateSummary('user-1', SummaryType.weeklySummary))
          .thenAnswer((_) async => summary);

      await provider.generateSummary('user-1', SummaryType.weeklySummary);

      // Nudge should still be intact
      expect(provider.currentNudge!.id, 'nudge-1');
    });
  });
}
