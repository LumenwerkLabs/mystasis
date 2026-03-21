import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/core/models/paginated_response.dart';
import 'package:mystasis/core/services/auth_service.dart';
import 'package:mystasis/core/services/biometric_auth_service.dart';
import 'package:mystasis/core/services/health_data_service.dart';
import 'package:mystasis/core/services/llm_service.dart';
import 'package:mystasis/core/services/storage_service.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/alerts_provider.dart';
import 'package:mystasis/providers/auth_provider.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/providers/insights_provider.dart';
import 'package:mystasis/screens/dashboard/screens/overview_screen.dart';

class MockHealthDataService extends Mock implements HealthDataService {}

class MockAuthService extends Mock implements AuthService {}

class MockLlmService extends Mock implements LlmService {}

class MockBiometricAuthService extends Mock implements BiometricAuthService {}

class MockStorageService extends Mock implements StorageService {}

void main() {
  late MockAuthService mockAuthService;
  late MockLlmService mockLlmService;
  late MockBiometricAuthService mockBiometricService;
  late MockStorageService mockStorageService;

  setUp(() {
    mockAuthService = MockAuthService();
    when(() => mockAuthService.authStateChanges)
        .thenAnswer((_) => const Stream.empty());
    when(() => mockAuthService.currentUser).thenReturn(null);

    mockLlmService = MockLlmService();

    mockBiometricService = MockBiometricAuthService();
    when(() => mockBiometricService.isAvailable())
        .thenAnswer((_) async => false);

    mockStorageService = MockStorageService();
    when(() => mockStorageService.getUserId())
        .thenAnswer((_) async => null);
    when(() => mockStorageService.isBiometricEnabled(userId: any(named: 'userId')))
        .thenAnswer((_) async => false);
  });

  Widget buildTestWidget({
    required BiomarkersProvider biomarkersProvider,
    String? patientId,
  }) {
    return MaterialApp(
      theme: MystasisTheme.light(),
      home: MultiProvider(
        providers: [
          ChangeNotifierProvider<BiomarkersProvider>.value(
              value: biomarkersProvider),
          ChangeNotifierProvider<InsightsProvider>(
              create: (_) => InsightsProvider(llmService: mockLlmService)),
          ChangeNotifierProvider<AuthProvider>(
              create: (_) => AuthProvider(
                    authService: mockAuthService,
                    biometricService: mockBiometricService,
                    storageService: mockStorageService,
                  )),
          ChangeNotifierProvider<AlertsProvider>(
              create: (_) => AlertsProvider()),
        ],
        child: Scaffold(body: OverviewScreen(patientId: patientId)),
      ),
    );
  }

  Future<BiomarkersProvider> createProviderWithBiomarkers(
      List<BiomarkerModel> biomarkers) async {
    final mockService = MockHealthDataService();
    when(() => mockService.getBiomarkers(any(), limit: any(named: 'limit')))
        .thenAnswer((_) async => PaginatedResponse(
              data: biomarkers,
              total: biomarkers.length,
              page: 1,
              limit: 100,
            ));
    final provider = BiomarkersProvider(healthDataService: mockService);
    await provider.loadBiomarkers('u1');
    return provider;
  }

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
  ];

  group('OverviewScreen', () {
    testWidgets('should show "No data available" when biomarkers are empty',
        (tester) async {
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      expect(find.text('No data available'), findsOneWidget);
    });

    testWidgets(
        'should show "Last updated" date when biomarkers exist',
        (tester) async {
      final provider = await createProviderWithBiomarkers(testBiomarkers);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      // The most recent timestamp is Mar 14, 2026 at 10:30 AM
      expect(find.text('Last updated: Mar 14, 2026 at 10:30 AM'),
          findsOneWidget);
    });

    testWidgets('should show biomarker count in quick stats', (tester) async {
      final provider = await createProviderWithBiomarkers(testBiomarkers);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      // 3 unique types tracked
      expect(find.text('3'), findsOneWidget);
      expect(find.text('Biomarkers Tracked'), findsOneWidget);
    });

    testWidgets(
        'should show "--" for HRV, HR, Sleep when those types are missing',
        (tester) async {
      // Only provide STEPS - no HRV, no HR, no Sleep
      final stepsOnly = [
        BiomarkerModel(
          id: '1',
          userId: 'u1',
          type: 'STEPS',
          value: 5000.0,
          unit: 'steps',
          timestamp: DateTime(2026, 3, 14),
        ),
      ];
      final provider = await createProviderWithBiomarkers(stepsOnly);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      // HRV, Resting HR, and Sleep should show "--"
      // (Steps shows "1" for count, and the three missing stats show "--")
      final dashFinder = find.text('--');
      expect(dashFinder, findsNWidgets(3));
    });

    testWidgets('should show real values when HRV and HR biomarkers are present',
        (tester) async {
      final provider = await createProviderWithBiomarkers(testBiomarkers);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      // HRV value: 55
      expect(find.text('55'), findsWidgets);
      // Resting HR value: 62
      expect(find.text('62'), findsWidgets);
    });

    testWidgets(
        'should show "No recent activity." when biomarkers are empty',
        (tester) async {
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      expect(find.text('No recent activity.'), findsOneWidget);
    });

    testWidgets(
        'should show recent biomarker entries in Recent Activity card',
        (tester) async {
      final provider = await createProviderWithBiomarkers(testBiomarkers);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      // Recent activity shows display name + value + unit format
      // "Heart Rate Variability: 55 ms"
      expect(
          find.text('Heart Rate Variability: 55 ms'), findsOneWidget);
      // "Resting Heart Rate: 62 bpm"
      expect(find.text('Resting Heart Rate: 62 bpm'), findsOneWidget);
      // "Steps: 8500 steps"
      expect(find.text('Steps: 8500 steps'), findsOneWidget);
    });

    testWidgets('should show "Patient Overview" heading', (tester) async {
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      expect(find.text('Patient Overview'), findsOneWidget);
    });

    testWidgets('should show "No biomarker data available." when empty',
        (tester) async {
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      expect(find.text('No biomarker data available.'), findsOneWidget);
    });

    testWidgets(
        'should show "No AI insights generated yet." when no insights exist',
        (tester) async {
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(biomarkersProvider: provider));
      await tester.pumpAndSettle();

      expect(find.text('No AI insights generated yet.'), findsOneWidget);
    });
  });
}
