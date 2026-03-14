import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/core/models/biomarker_model.dart';
import 'package:mystasis/core/models/paginated_response.dart';
import 'package:mystasis/core/services/health_data_service.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/providers/biomarkers_provider.dart';
import 'package:mystasis/screens/dashboard/screens/wearables_screen.dart';

class MockHealthDataService extends Mock implements HealthDataService {}

void main() {
  Widget buildTestWidget({required BiomarkersProvider provider}) {
    return MaterialApp(
      theme: MystasisTheme.light(),
      home: Scaffold(
        body: ChangeNotifierProvider<BiomarkersProvider>.value(
          value: provider,
          child: const WearablesScreen(),
        ),
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

  group('WearablesScreen', () {
    // The WearablesScreen header Row needs a wider surface than the default 800px
    // to avoid overflow. We set the test surface to 1200x900.
    void setLargeSurface(WidgetTester tester) {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
    }

    tearDown(() {
      // Reset the test view after each test
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.clearAllTestValues();
    });

    testWidgets('should show "--" for heart rate when no HR data exists',
        (tester) async {
      setLargeSurface(tester);
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      // Heart Rate card, HRV card, and Activity card all show "--" for missing data
      final dashFinder = find.text('--');
      expect(dashFinder, findsWidgets);
    });

    testWidgets(
        'should show "No sleep data available." when no sleep biomarkers exist',
        (tester) async {
      setLargeSurface(tester);
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      expect(find.text('No sleep data available.'), findsOneWidget);
    });

    testWidgets(
        'should show "No HRV data available." when no HRV biomarkers exist',
        (tester) async {
      setLargeSurface(tester);
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      expect(find.text('No HRV data available.'), findsOneWidget);
    });

    testWidgets(
        'should show "No activity data available." when no activity biomarkers exist',
        (tester) async {
      setLargeSurface(tester);
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      expect(find.text('No activity data available.'), findsOneWidget);
    });

    testWidgets('should show real heart rate value when HR data exists',
        (tester) async {
      setLargeSurface(tester);
      final biomarkers = [
        BiomarkerModel(
          id: '1',
          userId: 'u1',
          type: 'HEART_RATE',
          value: 72.0,
          unit: 'bpm',
          timestamp: DateTime(2026, 3, 14, 10, 0),
        ),
      ];
      final provider = await createProviderWithBiomarkers(biomarkers);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      // The main large heart rate display and the "Latest" stat both show 72
      expect(find.text('72'), findsWidgets);
    });

    testWidgets('should show real HRV value when HRV data exists',
        (tester) async {
      setLargeSurface(tester);
      final biomarkers = [
        BiomarkerModel(
          id: '1',
          userId: 'u1',
          type: 'HEART_RATE_VARIABILITY',
          value: 55.0,
          unit: 'ms',
          timestamp: DateTime(2026, 3, 14, 10, 0),
        ),
      ];
      final provider = await createProviderWithBiomarkers(biomarkers);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      // HRV value of 55 displayed in the HRV card
      expect(find.text('55'), findsOneWidget);
    });

    testWidgets('should show real step count when steps data exists',
        (tester) async {
      setLargeSurface(tester);
      final biomarkers = [
        BiomarkerModel(
          id: '1',
          userId: 'u1',
          type: 'STEPS',
          value: 8500.0,
          unit: 'steps',
          timestamp: DateTime(2026, 3, 14, 10, 0),
        ),
      ];
      final provider = await createProviderWithBiomarkers(biomarkers);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      // 8500 steps formatted as "8.5k" by _formatNumber
      expect(find.text('8.5k'), findsOneWidget);
    });

    testWidgets('should show resting HR value in heart rate breakdown',
        (tester) async {
      setLargeSurface(tester);
      final biomarkers = [
        BiomarkerModel(
          id: '1',
          userId: 'u1',
          type: 'HEART_RATE',
          value: 72.0,
          unit: 'bpm',
          timestamp: DateTime(2026, 3, 14, 10, 0),
        ),
        BiomarkerModel(
          id: '2',
          userId: 'u1',
          type: 'RESTING_HEART_RATE',
          value: 58.0,
          unit: 'bpm',
          timestamp: DateTime(2026, 3, 14, 8, 0),
        ),
      ];
      final provider = await createProviderWithBiomarkers(biomarkers);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      // Resting HR: 58
      expect(find.text('58'), findsOneWidget);
      expect(find.text('Resting'), findsOneWidget);
    });

    testWidgets('should display the Wearables header', (tester) async {
      setLargeSurface(tester);
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      expect(find.text('Wearables'), findsOneWidget);
      expect(find.text('Connected devices and real-time health data'),
          findsOneWidget);
    });

    testWidgets('should show sleep duration when sleep data exists',
        (tester) async {
      setLargeSurface(tester);
      final biomarkers = [
        BiomarkerModel(
          id: '1',
          userId: 'u1',
          type: 'SLEEP_DURATION',
          value: 7.5,
          unit: 'hours',
          timestamp: DateTime(2026, 3, 14, 7, 0),
        ),
      ];
      final provider = await createProviderWithBiomarkers(biomarkers);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      // 7.5 hours formatted as "7h 30m" by _formatHours
      expect(find.text('7h 30m'), findsOneWidget);
    });

    testWidgets('should show connected devices section', (tester) async {
      setLargeSurface(tester);
      final provider = await createProviderWithBiomarkers([]);

      await tester.pumpWidget(buildTestWidget(provider: provider));
      await tester.pumpAndSettle();

      expect(find.text('Oura Ring Gen 3'), findsOneWidget);
      expect(find.text('Apple Health'), findsOneWidget);
      expect(find.text('Whoop 4.0'), findsOneWidget);
    });
  });
}
