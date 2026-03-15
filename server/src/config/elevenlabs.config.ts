import { registerAs } from '@nestjs/config';

/**
 * ElevenLabs service configuration interface.
 */
export interface ElevenLabsConfig {
  apiKey: string;
  apiUrl: string;
}

/**
 * ElevenLabs configuration registered with NestJS ConfigModule.
 *
 * @description Provides ElevenLabs Speech-to-Text settings:
 * - apiKey: API key for ElevenLabs (env: ELEVENLABS_API_KEY)
 * - apiUrl: Base URL for ElevenLabs API (env: ELEVENLABS_API_URL, default: https://api.elevenlabs.io)
 *
 * The key is optional — if not set, cloud transcription is simply unavailable
 * and the endpoint returns 503.
 *
 * @example
 * const key = configService.get<string>('elevenlabs.apiKey');
 * const url = configService.get<string>('elevenlabs.apiUrl');
 */
export const elevenlabsConfig = registerAs(
  'elevenlabs',
  (): ElevenLabsConfig => {
    const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
    const apiUrl = (
      process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io'
    ).trim();

    // Enforce HTTPS for non-empty, non-localhost URLs
    if (apiUrl && !apiUrl.startsWith('https://') && !apiUrl.includes('localhost')) {
      throw new Error('ELEVENLABS_API_URL must use HTTPS');
    }

    return { apiKey, apiUrl };
  },
);
