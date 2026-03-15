import Foundation

// MARK: - Types

/// Grounding verification status for an AI-extracted field.
@available(macOS 26.0, *)
enum GroundingStatus: String {
    /// ≥80% of key terms found in the source transcript.
    case grounded
    /// ≥40% of key terms found — needs clinician attention.
    case partial
    /// <40% of key terms found — likely hallucinated.
    case ungrounded
    /// Field was empty — no verification needed.
    case empty
}

/// Grounding result for a single field or array item.
@available(macOS 26.0, *)
struct FieldGrounding {
    let status: GroundingStatus
    /// Fraction of key terms matched (0.0–1.0).
    let score: Double
    /// Terms from the extracted text not found in the transcript.
    let unmatchedTerms: [String]
}

/// Grounding report covering all structured anamnesis fields.
@available(macOS 26.0, *)
struct GroundingReport {
    let chiefComplaint: FieldGrounding
    let historyOfPresentIllness: FieldGrounding
    let pastMedicalHistory: [FieldGrounding]
    let currentMedications: [FieldGrounding]
    let allergies: [FieldGrounding]
    let familyHistory: [FieldGrounding]
    let reviewOfSystems: [FieldGrounding]
    let socialHistory: [FieldGrounding]
    let overallStatus: GroundingStatus
}

// MARK: - Verifier

/// Cross-references AI-extracted anamnesis fields against the source transcript
/// using keyword matching to detect potential hallucinations.
///
/// Since Apple's FoundationModels framework provides no confidence scores or
/// citation APIs, this verifier checks programmatically whether the extracted
/// content is actually present in the transcript.
@available(macOS 26.0, *)
struct TranscriptGroundingVerifier {

    // MARK: - Constants

    /// Common English words and medical filler words to skip during matching.
    private static let stopwords: Set<String> = [
        // Articles & determiners
        "a", "an", "the", "this", "that", "these", "those",
        // Prepositions
        "in", "on", "at", "to", "for", "of", "with", "by", "from", "into",
        "about", "between", "through", "during", "before", "after", "above",
        "below", "up", "down", "out", "off", "over", "under",
        // Conjunctions
        "and", "or", "but", "nor", "so", "yet",
        // Pronouns
        "i", "me", "my", "mine", "we", "us", "our", "you", "your",
        "he", "him", "his", "she", "her", "it", "its", "they", "them", "their",
        // Verbs (common forms)
        "is", "am", "are", "was", "were", "be", "been", "being",
        "has", "have", "had", "do", "does", "did",
        "will", "would", "shall", "should", "may", "might", "can", "could",
        // Negation & quantity
        "no", "not", "none", "some", "any", "all", "each", "every",
        // Other common words
        "also", "very", "just", "then", "than", "when", "where", "how",
        "what", "which", "who", "whom", "whose",
        // Medical transcript filler
        "patient", "doctor", "reports", "states", "denies", "noted", "history",
        "per", "ago", "since", "currently", "previously", "approximately",
    ]

    /// Minimum stem prefix length for fuzzy matching.
    private static let minStemLength = 5

    /// Thresholds for grounding status classification.
    private static let groundedThreshold = 0.8
    private static let partialThreshold = 0.4

    // MARK: - Public API

    /// Verify a structured anamnesis against the source transcript.
    ///
    /// - Parameters:
    ///   - structured: The AI-generated structured anamnesis.
    ///   - transcript: The original raw transcript text.
    /// - Returns: A ``GroundingReport`` with per-field and overall status.
    func verify(structured: StructuredAnamnesis, against transcript: String) -> GroundingReport {
        let normalizedTranscript = Self.normalize(transcript)
        let transcriptWords = Set(normalizedTranscript.split(separator: " ").map(String.init))

        let cc = verifyString(structured.chiefComplaint, transcriptNormalized: normalizedTranscript, transcriptWords: transcriptWords)
        let hpi = verifyString(structured.historyOfPresentIllness, transcriptNormalized: normalizedTranscript, transcriptWords: transcriptWords)
        let pmh = structured.pastMedicalHistory.map { verifyString($0, transcriptNormalized: normalizedTranscript, transcriptWords: transcriptWords) }
        let meds = structured.currentMedications.map { verifyString($0, transcriptNormalized: normalizedTranscript, transcriptWords: transcriptWords) }
        let allg = structured.allergies.map { verifyString($0, transcriptNormalized: normalizedTranscript, transcriptWords: transcriptWords) }
        let fam = structured.familyHistory.map { verifyString($0, transcriptNormalized: normalizedTranscript, transcriptWords: transcriptWords) }
        let ros = structured.reviewOfSystems.map { verifyString($0, transcriptNormalized: normalizedTranscript, transcriptWords: transcriptWords) }
        let soc = structured.socialHistory.map { verifyString($0, transcriptNormalized: normalizedTranscript, transcriptWords: transcriptWords) }

        let allFields: [FieldGrounding] = [cc, hpi] + pmh + meds + allg + fam + ros + soc
        let overall = Self.worstStatus(in: allFields)

        return GroundingReport(
            chiefComplaint: cc,
            historyOfPresentIllness: hpi,
            pastMedicalHistory: pmh,
            currentMedications: meds,
            allergies: allg,
            familyHistory: fam,
            reviewOfSystems: ros,
            socialHistory: soc,
            overallStatus: overall
        )
    }

    // MARK: - Private: String Verification

    /// Verify a single text value against the transcript.
    private func verifyString(
        _ text: String,
        transcriptNormalized: String,
        transcriptWords: Set<String>
    ) -> FieldGrounding {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return FieldGrounding(status: .empty, score: 1.0, unmatchedTerms: [])
        }

        let keyTerms = Self.extractKeyTerms(from: trimmed)
        guard !keyTerms.isEmpty else {
            // Only stopwords — treat as grounded (e.g., "no known allergies")
            return FieldGrounding(status: .grounded, score: 1.0, unmatchedTerms: [])
        }

        var matchedCount = 0
        var unmatched: [String] = []

        for term in keyTerms {
            if Self.termMatchesTranscript(term, normalizedTranscript: transcriptNormalized, transcriptWords: transcriptWords) {
                matchedCount += 1
            } else {
                unmatched.append(term)
            }
        }

        let score = Double(matchedCount) / Double(keyTerms.count)
        let status = Self.statusForScore(score)

        return FieldGrounding(status: status, score: score, unmatchedTerms: unmatched)
    }

    // MARK: - Private: Text Processing

    /// Normalize text: lowercase, strip punctuation, collapse whitespace.
    private static func normalize(_ text: String) -> String {
        let lowered = text.lowercased()
        // Replace non-alphanumeric characters (except spaces) with spaces
        let cleaned = lowered.unicodeScalars.map { scalar -> Character in
            if CharacterSet.alphanumerics.contains(scalar) || scalar == " " {
                return Character(scalar)
            }
            return " "
        }
        let joined = String(cleaned)
        // Collapse multiple spaces
        return joined.split(separator: " ").joined(separator: " ")
    }

    /// Extract key terms from text by removing stopwords.
    private static func extractKeyTerms(from text: String) -> [String] {
        let normalized = normalize(text)
        let words = normalized.split(separator: " ").map(String.init)
        return words.filter { word in
            word.count >= 2 && !stopwords.contains(word)
        }
    }

    /// Check if a key term matches the transcript using multiple strategies.
    private static func termMatchesTranscript(
        _ term: String,
        normalizedTranscript: String,
        transcriptWords: Set<String>
    ) -> Bool {
        let lowerTerm = term.lowercased()

        // Strategy 1: Exact word match
        if transcriptWords.contains(lowerTerm) {
            return true
        }

        // Strategy 2: Substring containment (handles compound words, partial phrases)
        if normalizedTranscript.contains(lowerTerm) {
            return true
        }

        // Strategy 3: Stem prefix match (first N+ chars)
        if lowerTerm.count >= minStemLength {
            let prefix = String(lowerTerm.prefix(minStemLength))
            for word in transcriptWords {
                if word.hasPrefix(prefix) {
                    return true
                }
            }
        }

        return false
    }

    // MARK: - Private: Status Classification

    /// Map a match score to a grounding status.
    private static func statusForScore(_ score: Double) -> GroundingStatus {
        if score >= groundedThreshold { return .grounded }
        if score >= partialThreshold { return .partial }
        return .ungrounded
    }

    /// Return the worst (least grounded) status across all non-empty fields.
    private static func worstStatus(in fields: [FieldGrounding]) -> GroundingStatus {
        let nonEmpty = fields.filter { $0.status != .empty }
        guard !nonEmpty.isEmpty else { return .empty }

        if nonEmpty.contains(where: { $0.status == .ungrounded }) { return .ungrounded }
        if nonEmpty.contains(where: { $0.status == .partial }) { return .partial }
        return .grounded
    }
}
