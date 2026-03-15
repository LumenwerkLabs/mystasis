import Foundation
import FoundationModels

// MARK: - Structured Output Type

/// Structured clinical anamnesis extracted VERBATIM from a patient consultation transcript.
/// Uses Foundation Models' @Generable macro for constrained generation.
/// Every field must contain only information directly stated in the transcript.
@available(macOS 26.0, *)
@Generable(description: "Clinical information extracted VERBATIM from a consultation transcript. Every field must contain only information directly stated in the transcript.")
struct StructuredAnamnesis {
    @Guide(description: "The patient's stated reason for the visit, using their own words from the transcript. Leave empty string if not explicitly stated.")
    var chiefComplaint: String

    @Guide(description: "Details of the present illness exactly as described in the transcript: symptoms, onset, duration, severity. Only include what was explicitly discussed. Use empty string if not mentioned.")
    var historyOfPresentIllness: String

    @Guide(description: "Past medical conditions, surgeries, or hospitalizations explicitly mentioned in the transcript. Use exact terms from the conversation. Empty array if none mentioned.")
    var pastMedicalHistory: [String]

    @Guide(description: "Medications the patient explicitly named in the transcript, with dosages only if stated. Empty array if none mentioned.")
    var currentMedications: [String]

    @Guide(description: "Allergies explicitly stated by the patient in the transcript. Include only reactions that were described. Empty array if none mentioned.")
    var allergies: [String]

    @Guide(description: "Family medical conditions explicitly mentioned in the transcript. Empty array if not discussed.")
    var familyHistory: [String]

    @Guide(description: "Symptoms by body system that were explicitly discussed in the transcript. Empty array if no review of systems was performed.")
    var reviewOfSystems: [String]

    @Guide(description: "Social and lifestyle factors the patient explicitly mentioned: smoking, alcohol, exercise, occupation. Empty array if not discussed.")
    var socialHistory: [String]
}

/// Structured anamnesis paired with its grounding verification report.
@available(macOS 26.0, *)
struct VerifiedAnamnesis {
    let structured: StructuredAnamnesis
    let grounding: GroundingReport
}

// MARK: - Structuring Service

/// Service that structures raw transcript text using on-device Foundation Models.
@available(macOS 26.0, *)
class AnamnesisStructuringService {

    private let instructions = """
        You are a medical transcription EXTRACTOR. Your role is to identify and \
        copy clinical information that is EXPLICITLY STATED in the transcript.

        STRICT RULES:
        1. ONLY extract information the patient or clinician explicitly said.
        2. Use the patient's and clinician's own words wherever possible.
        3. NEVER infer, deduce, or add information not directly stated.
        4. If a category was not discussed, leave it empty (empty string or empty array).
        5. If something is ambiguous, quote the exact words and add "[verbatim, unclear]".
        6. Do NOT add medical terminology unless the speaker used it.
        7. Do NOT complete partial information — extract only what was said.
        """

    /// Check if Foundation Models is available on this device.
    var isAvailable: Bool {
        get async {
            return SystemLanguageModel.default.isAvailable
        }
    }

    /// Structure a transcript into a verified anamnesis.
    /// Handles chunking automatically for long transcripts.
    /// The returned ``VerifiedAnamnesis`` includes a grounding report that
    /// cross-references each extracted field against the original transcript.
    func structure(transcript: String) async throws -> VerifiedAnamnesis {
        let chunks = chunkTranscript(transcript, maxTokens: 3000)

        let structured: StructuredAnamnesis
        if chunks.count == 1 {
            structured = try await structureSingleChunk(chunks[0])
        } else {
            structured = try await structureMultipleChunks(chunks)
        }

        // Always verify against the ORIGINAL transcript, not summaries
        let verifier = TranscriptGroundingVerifier()
        let grounding = verifier.verify(structured: structured, against: transcript)
        return VerifiedAnamnesis(structured: structured, grounding: grounding)
    }

    /// Convert a VerifiedAnamnesis to a dictionary for Flutter serialization.
    /// Includes both the structured fields and the grounding verification report.
    func toDictionary(_ verified: VerifiedAnamnesis) -> [String: Any] {
        let a = verified.structured
        let g = verified.grounding
        return [
            "chiefComplaint": a.chiefComplaint,
            "historyOfPresentIllness": a.historyOfPresentIllness,
            "pastMedicalHistory": a.pastMedicalHistory,
            "currentMedications": a.currentMedications,
            "allergies": a.allergies,
            "familyHistory": a.familyHistory,
            "reviewOfSystems": a.reviewOfSystems,
            "socialHistory": a.socialHistory,
            "grounding": [
                "overallStatus": g.overallStatus.rawValue,
                "chiefComplaint": groundingDict(g.chiefComplaint),
                "historyOfPresentIllness": groundingDict(g.historyOfPresentIllness),
                "pastMedicalHistory": g.pastMedicalHistory.map { groundingDict($0) },
                "currentMedications": g.currentMedications.map { groundingDict($0) },
                "allergies": g.allergies.map { groundingDict($0) },
                "familyHistory": g.familyHistory.map { groundingDict($0) },
                "reviewOfSystems": g.reviewOfSystems.map { groundingDict($0) },
                "socialHistory": g.socialHistory.map { groundingDict($0) },
            ] as [String: Any],
        ]
    }

    /// Convert a FieldGrounding to a dictionary for Flutter serialization.
    private func groundingDict(_ fg: FieldGrounding) -> [String: Any] {
        [
            "status": fg.status.rawValue,
            "score": fg.score,
            "unmatchedTerms": fg.unmatchedTerms,
        ]
    }

    // MARK: - Private: Single Chunk

    private func structureSingleChunk(_ text: String) async throws -> StructuredAnamnesis {
        let session = LanguageModelSession(instructions: instructions)
        let response = try await session.respond(
            to: "Extract clinical information from this consultation transcript. "
              + "Only include information explicitly stated:\n\n\(text)",
            generating: StructuredAnamnesis.self,
            options: GenerationOptions(sampling: .greedy)
        )
        return response.content
    }

    // MARK: - Private: Multi-Chunk (Summarize then Structure)

    private func structureMultipleChunks(_ chunks: [String]) async throws -> StructuredAnamnesis {
        // Pass 1: Summarize each chunk into bullet-point clinical notes
        var summaries: [String] = []
        for (index, chunk) in chunks.enumerated() {
            let session = LanguageModelSession(instructions: """
                Extract the key clinical information from this consultation transcript \
                segment as concise bullet points. Use the speaker's own words. Include \
                only symptoms, conditions, medications, allergies, and other medically \
                relevant details that are EXPLICITLY STATED. Do not infer or add anything.
                """)
            let response = try await session.respond(
                to: "Segment \(index + 1) of \(chunks.count):\n\n\(chunk)",
                options: GenerationOptions(sampling: .greedy)
            )
            summaries.append(response.content)
        }

        // Pass 2: Structure the combined summaries
        let combinedSummary = summaries.enumerated()
            .map { "Segment \($0.offset + 1):\n\($0.element)" }
            .joined(separator: "\n\n")

        let session = LanguageModelSession(instructions: instructions)
        let response = try await session.respond(
            to: "Extract clinical information from this consultation summary. "
              + "Only include information explicitly stated:\n\n\(combinedSummary)",
            generating: StructuredAnamnesis.self,
            options: GenerationOptions(sampling: .greedy)
        )
        return response.content
    }

    // MARK: - Private: Chunking

    /// Estimate token count for a string (~1.3 tokens per English word).
    private func estimateTokenCount(_ text: String) -> Int {
        let wordCount = text.split(separator: " ").count
        return Int(Double(wordCount) * 1.3)
    }

    /// Split transcript into chunks respecting sentence boundaries.
    /// Reserves ~800 tokens for instructions + schema overhead.
    private func chunkTranscript(_ text: String, maxTokens: Int) -> [String] {
        let availableTokens = maxTokens - 800

        if estimateTokenCount(text) <= availableTokens {
            return [text]
        }

        // Split on sentence-ending punctuation followed by whitespace.
        // Handles ".", "?", "!" with trailing spaces/newlines.
        let sentences = splitIntoSentences(text)
        var chunks: [String] = []
        var currentChunk = ""

        for sentence in sentences {
            let trimmed = sentence.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty else { continue }
            let candidateChunk = currentChunk.isEmpty ? trimmed : "\(currentChunk) \(trimmed)"
            if estimateTokenCount(candidateChunk) > availableTokens {
                if !currentChunk.isEmpty {
                    chunks.append(currentChunk)
                }
                currentChunk = trimmed
            } else {
                currentChunk = candidateChunk
            }
        }
        if !currentChunk.isEmpty {
            chunks.append(currentChunk)
        }

        return chunks
    }

    /// Split text into sentences using linguistic sentence boundary detection.
    private func splitIntoSentences(_ text: String) -> [String] {
        var sentences: [String] = []
        text.enumerateSubstrings(
            in: text.startIndex...,
            options: .bySentences
        ) { substring, _, _, _ in
            if let sentence = substring {
                sentences.append(sentence)
            }
        }
        return sentences.isEmpty ? [text] : sentences
    }
}
