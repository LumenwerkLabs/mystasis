# Mystasis Frontend — CLAUDE.md

> **Location:** This file should be placed at `./CLAUDE.md` (project root)

## Project Identity

**Name:** mystasis-app  
**Path:** `./` (project root, Flutter frontend)  
**Stack:** Flutter (Dart) — shared codebase for mobile and web  
**Purpose:** Patient-facing mobile app and clinician web dashboard for viewing biomarker trends, health insights, and LLM-generated summaries from the Mystasis longevity platform.

**Related:** Backend is located at `./server/` with its own CLAUDE.md

---

## Quick Reference

| Action | Command |
|--------|---------|
| Get dependencies | `flutter pub get` |
| Run on device/emulator | `flutter run` |
| Run on web | `flutter run -d chrome` |
| Run tests | `flutter test` |
| Analyze code | `flutter analyze` |
| Format code | `dart format .` |
| Build APK | `flutter build apk` |
| Build iOS | `flutter build ios` |
| Build web | `flutter build web` |
| Seed database | `cd server && npx prisma db seed` |

---

## Architecture Overview

```
lib/
├── main.dart                      # App entry point (MultiProvider setup)
├── app.dart                       # MaterialApp configuration
├── core/
│   ├── theme/
│   │   └── theme.dart             # Design system: colors, typography, components
│   ├── constants/
│   │   └── api_endpoints.dart     # API URL constants + parameterized helpers
│   ├── models/
│   │   ├── biomarker_model.dart   # BiomarkerModel with reference ranges, status
│   │   ├── anamnesis_model.dart   # AnamnesisModel — structured clinical anamnesis
│   │   └── paginated_response.dart # Generic PaginatedResponse<T>
│   ├── services/
│   │   ├── api_client.dart        # HTTP client for backend communication
│   │   ├── auth_service.dart      # Token management
│   │   ├── anamnesis_channel.dart # MethodChannel/EventChannel bridge to native macOS
│   │   ├── anamnesis_service.dart  # Anamnesis CRUD + transcription token (backend API)
│   │   ├── health_data_service.dart # Biomarker CRUD (getBiomarkers, trends)
│   │   ├── storage_service.dart   # Local persistence
│   │   └── users_service.dart     # User/patient list fetching
│   ├── utils/                     # Shared utility functions
│   └── widgets/                   # Reusable UI components
├── providers/
│   ├── anamnesis_provider.dart    # AnamnesisProvider (recording + structuring state machine)
│   ├── biomarkers_provider.dart   # BiomarkersProvider (ChangeNotifier)
│   └── patients_provider.dart     # PatientsProvider (ChangeNotifier)
├── screens/
│   └── dashboard/
│       └── screens/
│           └── anamnesis_screen.dart # Anamnesis recording UI (clinician-only)
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   ├── widgets/
│   │   ├── controllers/           # State management (Riverpod/BLoC)
│   │   └── models/
│   ├── dashboard/
│   ├── biomarkers/
│   ├── insights/
│   ├── settings/
│   └── clinician/                 # Clinician-specific features (web)
└── shared/
    ├── models/                    # Domain models shared across features
    └── extensions/                # Dart extensions

macos/Runner/
├── Anamnesis/                     # Native macOS anamnesis services (Swift)
│   ├── TranscriptionService.swift           # Strategy protocol + data types
│   ├── OnDeviceTranscriptionService.swift   # Apple Speech framework (SpeechAnalyzer)
│   ├── ElevenLabsTranscriptionService.swift # Cloud transcription via ElevenLabs WebSocket
│   ├── AnamnesisStructuringService.swift    # Foundation Models (@Generable)
│   └── AnamnesisMethodChannel.swift         # Flutter MethodChannel/EventChannel bridge
├── AppDelegate.swift              # Registers AnamnesisMethodChannel
├── DebugProfile.entitlements      # Includes audio-input entitlement
└── Release.entitlements           # Includes audio-input entitlement
```

---

## Design System

**Location:** `lib/core/theme/theme.dart`

### Color Palette

| Token | Usage |
|-------|-------|
| `AppColors.primary` | Bio-inspired teal — primary actions, headers |
| `AppColors.secondary` | Green accent — success states, positive trends |
| `AppColors.surface` | Card backgrounds |
| `AppColors.error` | Alert states, negative trends |
| `AppColors.textPrimary` | Main text |
| `AppColors.textSecondary` | Supporting text, labels |

### Typography

| Style | Usage |
|-------|-------|
| `AppTextStyles.h1` | Screen titles |
| `AppTextStyles.h2` | Section headers |
| `AppTextStyles.body` | Body text |
| `AppTextStyles.caption` | Labels, timestamps |
| `AppTextStyles.button` | Button text |

**Font Family:** Inter (all weights loaded)

### Using Theme Tokens

```dart
// ✅ Correct: Use theme tokens
Container(
  color: Theme.of(context).colorScheme.surface,
  child: Text(
    'Biomarker Trend',
    style: Theme.of(context).textTheme.titleLarge,
  ),
)

// ❌ Wrong: Hardcoded values
Container(
  color: Color(0xFF1A1A1A),
  child: Text(
    'Biomarker Trend',
    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
  ),
)
```

---

## Feature Structure Pattern

Each feature follows this organization:

```
features/[feature]/
├── screens/
│   ├── [feature]_screen.dart      # Main screen widget
│   └── [feature]_detail_screen.dart
├── widgets/
│   ├── [feature]_card.dart        # Feature-specific components
│   └── [feature]_list_item.dart
├── controllers/
│   └── [feature]_controller.dart  # State management
├── models/
│   └── [feature]_model.dart       # Feature-specific data models
└── [feature].dart                 # Barrel export file
```

---

## State Management

**Approach:** Provider (ChangeNotifier) via `MultiProvider` in `main.dart`

**Active Providers:**

| Provider | Location | Responsibility |
|----------|----------|----------------|
| `AuthProvider` | `features/auth/` | Login state, token management |
| `PatientsProvider` | `providers/patients_provider.dart` | Patient list, selected patient |
| `BiomarkersProvider` | `providers/biomarkers_provider.dart` | Biomarker data, grouping by type |
| `InsightsProvider` | `providers/insights_provider.dart` | LLM-generated health summaries |
| `HealthSyncProvider` | `providers/health_sync_provider.dart` | Apple Health data sync |
| `AnamnesisProvider` | `providers/anamnesis_provider.dart` | Anamnesis recording, transcription, structuring workflow (state machine: idle → recording → structuring → reviewing → saved) |

### Pattern

```dart
// Provider holds business logic and state
class BiomarkersProvider extends ChangeNotifier {
  final HealthDataService _healthDataService;

  List<BiomarkerModel> _biomarkers = [];
  bool _isLoading = false;
  String? _error;

  Future<void> loadBiomarkers(String userId) async {
    _isLoading = true;
    notifyListeners();
    try {
      _biomarkers = await _healthDataService.getBiomarkers(userId);
      _error = null;
    } catch (e) {
      _error = e.toString();
    }
    _isLoading = false;
    notifyListeners();
  }
}

// Widget consumes state via Consumer, no business logic
Consumer<BiomarkersProvider>(
  builder: (context, provider, child) {
    if (provider.isLoading) return LoadingIndicator();
    if (provider.error != null) return ErrorDisplay(provider.error!);
    return BiomarkerList(biomarkers: provider.biomarkers);
  },
)
```

---

## Responsive Design

The app serves two platforms with different navigation paradigms:

| Platform | Navigation | Layout |
|----------|------------|--------|
| Mobile (patient) | Bottom navigation bar | Single column, cards |
| Web (clinician) | Side navigation rail | Multi-column dashboard |

### Responsive Pattern

```dart
class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth > 900) {
          return _buildWideLayout();  // Clinician web view
        }
        return _buildNarrowLayout();   // Patient mobile view
      },
    );
  }
}
```

### Shared Components

- Models and services are shared between mobile and web
- Only screens and navigation differ by platform
- Use `core/widgets/` for platform-agnostic components

---

## API Communication

**Location:** `lib/core/services/`

**Services:**

| Service | File | Endpoints / Methods |
|---------|------|---------------------|
| `ApiClient` | `api_client.dart` | Base HTTP client (Dio) with auth headers |
| `HealthDataService` | `health_data_service.dart` | `getBiomarkers`, `getLatestBiomarker`, `getTrend` |
| `UsersService` | `users_service.dart` | `getUsers`, `getUser` |
| `LlmService` | `llm_service.dart` | `generateSummary`, `generateNudge` |
| `AnamnesisService` | `anamnesis_service.dart` | Anamnesis CRUD + transcription token generation (backend API) |
| `AnamnesisChannel` | `anamnesis_channel.dart` | Native bridge via MethodChannel/EventChannel (macOS only, see below) |

### Pattern

```dart
class ApiClient {
  final Dio _dio;
  
  Future<List<Biomarker>> getBiomarkers(String userId) async {
    final response = await _dio.get('/health-data/biomarkers/$userId');
    return (response.data as List)
        .map((json) => Biomarker.fromJson(json))
        .toList();
  }
}
```

### Rules

- All HTTP calls live in `core/services/` — never in widgets
- Handle errors in controllers, show user-friendly messages in UI
- Use typed response models, not raw `Map<String, dynamic>`
- Store auth tokens securely via `storage_service.dart`

---

## Native macOS Bridge (Anamnesis)

The anamnesis feature uses a **Flutter MethodChannel / EventChannel** to bridge Dart code to native Swift services running on macOS. This is required because Apple's Speech framework and Foundation Models framework are native-only APIs.

**Requires:** macOS 26+ (Apple Intelligence)
**Structuring:** Fully on-device — Foundation Models never sends patient data off-device
**Transcription:** On-device (Apple Speech) or cloud (ElevenLabs) — configurable per session
**Audience:** Clinician-only (accessible from the clinician dashboard sidebar)

### Architecture

```
Flutter (Dart)                       Native macOS (Swift)
──────────────                       ────────────────────
AnamnesisScreen
    ↕ Consumer
AnamnesisProvider
    ↕
AnamnesisChannel ──MethodChannel──→  AnamnesisMethodChannel
                  EventChannel──→        ↕
                                    TranscriptionService (protocol)
                                        ├─ OnDeviceTranscriptionService (Apple Speech)
                                        └─ ElevenLabsTranscriptionService (WebSocket STT)
                                    AnamnesisStructuringService (FoundationModels)

Cloud transcription token flow (ElevenLabs):
    Flutter → POST /anamnesis/transcription-token (JWT auth) → NestJS backend
    NestJS → POST elevenlabs.io/v1/single-use-token/realtime_scribe (xi-api-key)
    NestJS ← { token: "eyJ..." }
    Flutter ← { token: "eyJ..." }
    Flutter → passes token to native via MethodChannel
    Native → opens WebSocket: wss://api.elevenlabs.io/...?token=eyJ...
    Audio flows directly from mic to ElevenLabs (low latency)
```

**Security model:** The real ElevenLabs API key never touches the client. The NestJS backend holds the key and issues single-use temporary tokens (15 min expiry) per recording session.

### MethodChannel Contract

**Channel:** `com.mystasis/anamnesis`
**Event Channel:** `com.mystasis/anamnesis/transcriptStream`

| Method | Args | Returns |
|--------|------|---------|
| `checkAvailability` | — | `{speechAvailable: bool, foundationModelsAvailable: bool, elevenLabsConfigured: bool}` |
| `requestMicrophonePermission` | — | `bool` |
| `startTranscription` | `{locale: String}` | `void` (stream via EventChannel) |
| `stopTranscription` | — | `String` (final transcript) |
| `structureAnamnesis` | `{transcript: String}` | `Map<String, dynamic>` (structured fields) |
| `setTranscriptionBackend` | `{backend: String, token?: String}` | `void` |
| `getTranscriptionBackend` | — | `String` (`"onDevice"` or `"elevenLabs"`) |

**EventChannel payload:** `{text: String, isFinal: bool, confidence: double, isError: bool}`
When `isError` is `true`, `text` contains a user-friendly error message (e.g., quota exceeded, session expired) rather than transcript content.

### Structured Output (Foundation Models `@Generable`)

The on-device LLM extracts these fields from the raw transcript:

| Field | Type | Description |
|-------|------|-------------|
| `chiefComplaint` | `String` | Main reason for the visit |
| `historyOfPresentIllness` | `String` | Symptoms, onset, duration, severity |
| `pastMedicalHistory` | `[String]` | Past conditions, surgeries, hospitalizations |
| `currentMedications` | `[String]` | Medications + dosages mentioned |
| `allergies` | `[String]` | Drug/other allergies and reactions |
| `familyHistory` | `[String]` | Family medical history |
| `reviewOfSystems` | `[String]` | Symptoms by body system |
| `socialHistory` | `[String]` | Lifestyle: smoking, alcohol, exercise, diet, occupation |

### Strategy Pattern (Transcription Backend)

The `TranscriptionService` protocol allows swapping transcription backends:

- **`OnDeviceTranscriptionService`** — Uses `SpeechAnalyzer` + `SpeechTranscriber` with `AVAudioEngine` mic capture. Fully on-device, no data leaves the Mac.
- **`ElevenLabsTranscriptionService`** — Cloud-based real-time STT via WebSocket. Uses `AVAudioEngine` mic → PCM 16kHz 16-bit mono → base64 → WebSocket → ElevenLabs `scribe_v2` model. Authenticates with server-issued single-use tokens (not raw API keys). Token is consumed after one session and cleared on stop.

### Chunking (Long Transcripts)

For consultations exceeding ~3000 tokens, a two-pass approach is used:
1. **Summarize** each chunk into bullet-point clinical notes (plain text)
2. **Structure** the combined summaries into `StructuredAnamnesis` via guided generation

### Permissions

**Entitlements:** `com.apple.security.device.audio-input` (both Debug + Release)
**Info.plist:** `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`

### When Modifying the Anamnesis Feature

1. Native Swift files live in `macos/Runner/Anamnesis/` — modify via Xcode
2. The Dart side lives in `lib/core/services/anamnesis_channel.dart`, `lib/core/services/anamnesis_service.dart`, `lib/core/models/anamnesis_model.dart`, `lib/providers/anamnesis_provider.dart`, and `lib/screens/dashboard/screens/anamnesis_screen.dart`
3. If adding new MethodChannel methods, update both `AnamnesisMethodChannel.swift` and `anamnesis_channel.dart`
4. All `@available(macOS 26.0, *)` annotations are required — these APIs do not exist on older macOS
5. Use `AnyObject?` pattern for stored properties that reference `@available`-gated types (see `AppDelegate.swift`)
6. Medical disclaimer must appear on the review screen for structured output
7. **Error messages in the provider must never expose raw exception details** (`$e`) to the UI — use `debugPrint` for developer logging and static user-friendly strings for `_errorMessage`
8. **ElevenLabs token flow:** Tokens are fetched fresh before each recording session via `AnamnesisService.getTranscriptionToken()` → `POST /anamnesis/transcription-token`. The token is single-use (consumed on WebSocket connect) and expires after 15 minutes. The real API key lives only on the NestJS server.
9. **Adding a new transcription backend:** Implement the `TranscriptionService` protocol in Swift, add a new case in `AnamnesisMethodChannel.handleMethodCall` under `setTranscriptionBackend`, and update the Flutter backend selector UI

---

## Domain Models

**Locations:** `lib/core/models/` (core models) and `lib/shared/models/` (shared across features)

**Core Models:**

| Model | File | Description |
|-------|------|-------------|
| `BiomarkerModel` | `core/models/biomarker_model.dart` | Biomarker with `fromJson`/`toJson`, `displayName`, `category`, `status`, reference ranges |
| `AnamnesisModel` | `core/models/anamnesis_model.dart` | Structured clinical anamnesis with 8 sections (chief complaint, HPI, medications, allergies, etc.) + `fromStructuredOutput`/`fromJson`/`toJson`/`copyWith` |
| `PaginatedResponse<T>` | `core/models/paginated_response.dart` | Generic wrapper matching backend pagination format (`data`, `total`, `page`, `limit`) |

### Pattern

```dart
@freezed
class Biomarker with _$Biomarker {
  const factory Biomarker({
    required String id,
    required BiomarkerType type,
    required double value,
    required String unit,
    required DateTime timestamp,
    String? source,
  }) = _Biomarker;
  
  factory Biomarker.fromJson(Map<String, dynamic> json) => 
      _$BiomarkerFromJson(json);
}
```

### Guidelines

- Use immutable models (freezed or manual `copyWith`)
- Include `fromJson`/`toJson` for API serialization
- Keep models in `shared/models/` if used across features
- Feature-specific models go in `features/[feature]/models/`

---

## User Roles and Access

| Role | Access | UI Variant |
|------|--------|------------|
| `patient` | Own biomarkers, simplified insights, nudges | Mobile app |
| `clinician` | All patients, detailed timelines, risk flags, reports, anamnesis recording | Web/macOS dashboard |

### Handling Roles

```dart
// Check role for conditional UI
if (currentUser.role == UserRole.clinician) {
  return ClinicianDashboard();
}
return PatientDashboard();
```

---

## Coding Conventions

### Dart Style

- Use `final` for variables that don't change
- Prefer `const` constructors where possible
- Use named parameters for functions with 3+ parameters
- Avoid `dynamic` — use explicit types

### Widgets

```dart
// ✅ Correct: Small, focused widget
class BiomarkerCard extends StatelessWidget {
  final Biomarker biomarker;
  
  const BiomarkerCard({super.key, required this.biomarker});
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(biomarker.type.displayName),
        subtitle: Text('${biomarker.value} ${biomarker.unit}'),
        trailing: TrendIndicator(trend: biomarker.trend),
      ),
    );
  }
}

// ❌ Wrong: God widget with embedded logic
class BiomarkerScreen extends StatefulWidget {
  // 500 lines of mixed UI, API calls, and business logic
}
```

### File Naming

- `snake_case` for all Dart files
- Suffix screens with `_screen.dart`
- Suffix widgets with descriptive names: `_card.dart`, `_list.dart`, `_dialog.dart`
- Suffix controllers: `_controller.dart`

---

## Medical Safety in UI

The frontend must reinforce backend safety constraints:

### Display Rules

- Never present LLM insights as medical diagnoses
- Always include disclaimers on AI-generated content
- Use language like "Consider discussing with your clinician"
- Distinguish between data (facts) and insights (suggestions)

### Example

```dart
class InsightCard extends StatelessWidget {
  final LLMInsight insight;
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          Text(insight.summary),
          SizedBox(height: 8),
          // Always include disclaimer
          Text(
            'This is not medical advice. Discuss with your healthcare provider.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
```

---

## Testing Requirements

### Widget Tests

- Test UI components in isolation
- Verify correct rendering for different states (loading, error, success)
- Test user interactions (taps, form inputs)

### Unit Tests

- Test controllers and services
- Mock API responses
- Cover edge cases and error handling

### Before Committing

1. Run `flutter analyze` — no analysis issues
2. Run `flutter test` — all tests pass
3. Run `dart format .` — code is formatted
4. Test on both mobile and web if UI changes

---

## Agent Instructions

### When Adding a New Feature

1. Create feature folder under `lib/features/[feature_name]/`
2. Follow the feature structure pattern (screens, widgets, controllers, models)
3. Check similar features for patterns (e.g., copy structure from `biomarkers/`)
4. Use theme tokens for all styling — no hardcoded colors or sizes
5. Keep business logic in controllers, UI in widgets
6. Add barrel export file for clean imports
7. Write widget tests for new screens

### When Modifying Existing Code

1. Read the existing feature structure to understand patterns
2. Check `core/widgets/` before creating new shared components
3. Maintain existing naming conventions and file organization
4. Update tests for any changed behavior
5. Verify both mobile and web still work if touching shared code

### When Styling UI

1. Always use `Theme.of(context)` for colors and text styles
2. Check `theme.dart` for existing tokens before adding new ones
3. Use responsive patterns for layouts that differ mobile vs web
4. Test on multiple screen sizes

### When Adding API Calls

1. Add method to `api_client.dart` — never call HTTP directly from widgets
2. Create or update models in `shared/models/`
3. Handle errors in the controller, show friendly messages in UI
4. Consider loading and error states in the UI

### Verification Checklist

- [ ] No business logic in widgets
- [ ] All styling uses theme tokens
- [ ] New components follow feature structure pattern
- [ ] Models are immutable with `copyWith`
- [ ] API calls are in services, not widgets
- [ ] UI handles loading, error, and success states
- [ ] Medical disclaimers present on AI-generated content
- [ ] Tests written and passing
- [ ] Works on both mobile and web (if applicable)
