import Foundation
import FoundationModels

// MARK: - Structured Output Type

/// Structured clinical anamnesis extracted from a patient consultation transcript.
/// Uses Foundation Models' @Generable macro for constrained generation.
@available(macOS 26.0, *)
@Generable(description: "Structured clinical anamnesis extracted from a patient consultation transcript")
struct StructuredAnamnesis {
    @Guide(description: "The patient's main reason for the visit, stated concisely")
    var chiefComplaint: String

    @Guide(description: "Details of the present illness: symptoms, onset, duration, severity, aggravating and relieving factors")
    var historyOfPresentIllness: String

    @Guide(description: "Relevant past medical conditions, surgeries, or hospitalizations mentioned")
    var pastMedicalHistory: [String]

    @Guide(description: "Current medications the patient reports taking, including dosages if mentioned")
    var currentMedications: [String]

    @Guide(description: "Allergies mentioned by the patient, including drug allergies and reactions")
    var allergies: [String]

    @Guide(description: "Family medical history mentioned during the consultation")
    var familyHistory: [String]

    @Guide(description: "Review of systems: symptoms organized by body system that were discussed")
    var reviewOfSystems: [String]

    @Guide(description: "Social history including lifestyle factors: smoking, alcohol, exercise, diet, occupation, living situation")
    var socialHistory: [String]
}

// MARK: - Structuring Service

/// Service that structures raw transcript text using on-device Foundation Models.
@available(macOS 26.0, *)
class AnamnesisStructuringService {

    private let instructions = """
        You are a medical scribe assistant. Given a raw transcript of a doctor-patient \
        consultation, extract and organize the clinical information into a structured \
        anamnesis format.

        Rules:
        - Only include information explicitly mentioned in the transcript.
        - Use empty arrays for sections where no relevant information was discussed.
        - Be concise but accurate.
        - Do not infer or add information not present in the transcript.
        - If something is unclear or ambiguous, note it as "[unclear]".
        """

    /// Check if Foundation Models is available on this device.
    var isAvailable: Bool {
        get async {
            return SystemLanguageModel.default.isAvailable
        }
    }

    /// Structure a transcript into a structured anamnesis.
    /// Handles chunking automatically for long transcripts.
    func structure(transcript: String) async throws -> StructuredAnamnesis {
        let chunks = chunkTranscript(transcript, maxTokens: 3000)

        if chunks.count == 1 {
            return try await structureSingleChunk(chunks[0])
        } else {
            return try await structureMultipleChunks(chunks)
        }
    }

    /// Convert a StructuredAnamnesis to a dictionary for Flutter serialization.
    func toDictionary(_ anamnesis: StructuredAnamnesis) -> [String: Any] {
        return [
            "chiefComplaint": anamnesis.chiefComplaint,
            "historyOfPresentIllness": anamnesis.historyOfPresentIllness,
            "pastMedicalHistory": anamnesis.pastMedicalHistory,
            "currentMedications": anamnesis.currentMedications,
            "allergies": anamnesis.allergies,
            "familyHistory": anamnesis.familyHistory,
            "reviewOfSystems": anamnesis.reviewOfSystems,
            "socialHistory": anamnesis.socialHistory,
        ]
    }

    // MARK: - Private: Single Chunk

    private func structureSingleChunk(_ text: String) async throws -> StructuredAnamnesis {
        let session = LanguageModelSession(instructions: instructions)
        let response = try await session.respond(
            to: "Structure this consultation transcript into an anamnesis:\n\n\(text)",
            generating: StructuredAnamnesis.self
        )
        return response.content
    }

    // MARK: - Private: Multi-Chunk (Summarize then Structure)

    private func structureMultipleChunks(_ chunks: [String]) async throws -> StructuredAnamnesis {
        // Pass 1: Summarize each chunk into bullet-point clinical notes
        var summaries: [String] = []
        for (index, chunk) in chunks.enumerated() {
            let session = LanguageModelSession(instructions: """
                Summarize the key clinical information from this consultation transcript \
                segment in concise bullet points. Include symptoms, conditions, medications, \
                allergies, and any other medically relevant details mentioned.
                """)
            let response = try await session.respond(
                to: "Segment \(index + 1) of \(chunks.count):\n\n\(chunk)"
            )
            summaries.append(response.content)
        }

        // Pass 2: Structure the combined summaries
        let combinedSummary = summaries.enumerated()
            .map { "Segment \($0.offset + 1):\n\($0.element)" }
            .joined(separator: "\n\n")

        let session = LanguageModelSession(instructions: instructions)
        let response = try await session.respond(
            to: "Structure this consultation summary into an anamnesis:\n\n\(combinedSummary)",
            generating: StructuredAnamnesis.self
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
