/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createBlob, decode, encode, decodeAudioData } from './utils';

describe('Audio Encoding Utilities', () => {
  describe('encode', () => {
    it('should encode Uint8Array to base64 string', () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = encode(input);
      expect(result).toBe('SGVsbG8=');
    });

    it('should handle empty array', () => {
      const input = new Uint8Array([]);
      const result = encode(input);
      expect(result).toBe('');
    });

    it('should handle single byte', () => {
      const input = new Uint8Array([65]); // "A"
      const result = encode(input);
      expect(result).toBe('QQ==');
    });

    it('should handle binary data', () => {
      const input = new Uint8Array([0, 1, 2, 3, 4, 5]);
      const result = encode(input);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('decode', () => {
    it('should decode base64 string to Uint8Array', () => {
      const input = 'SGVsbG8='; // "Hello"
      const result = decode(input);
      const expected = new Uint8Array([72, 101, 108, 108, 111]);

      expect(result.length).toBe(expected.length);
      expect(Array.from(result)).toEqual(Array.from(expected));
    });

    it('should handle empty string', () => {
      const input = '';
      const result = decode(input);
      expect(result.length).toBe(0);
    });

    it('should be inverse of encode', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50]);
      const encoded = encode(original);
      const decoded = decode(encoded);

      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });

  describe('createBlob', () => {
    it('should convert Float32Array to base64-encoded PCM blob', () => {
      const input = new Float32Array([0.0, 0.5, -0.5, 1.0, -1.0]);
      const result = createBlob(input);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('mimeType');
      expect(result.mimeType).toBe('audio/pcm;rate=16000');
      expect(typeof result.data).toBe('string');
    });

    it('should handle silent audio (all zeros)', () => {
      const input = new Float32Array(100).fill(0);
      const result = createBlob(input);

      expect(result.data).toBeTruthy();
      expect(result.mimeType).toBe('audio/pcm;rate=16000');
    });

    it('should handle maximum amplitude', () => {
      const input = new Float32Array([1.0, -1.0]);
      const result = createBlob(input);

      // Decode to verify conversion
      const decoded = decode(result.data);
      const int16 = new Int16Array(decoded.buffer);

      expect(int16[0]).toBe(32768); // 1.0 * 32768
      expect(int16[1]).toBe(-32768); // -1.0 * 32768
    });

    it('should preserve audio data through encoding', () => {
      const input = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const result = createBlob(input);
      const decoded = decode(result.data);
      const int16 = new Int16Array(decoded.buffer);

      // Verify conversion to Int16
      expect(int16[0]).toBeCloseTo(0.1 * 32768, 0);
      expect(int16[1]).toBeCloseTo(0.2 * 32768, 0);
      expect(int16[2]).toBeCloseTo(0.3 * 32768, 0);
      expect(int16[3]).toBeCloseTo(0.4 * 32768, 0);
      expect(int16[4]).toBeCloseTo(0.5 * 32768, 0);
    });
  });

  describe('decodeAudioData', () => {
    let audioContext: AudioContext;

    beforeEach(() => {
      // Create mock AudioContext
      audioContext = {
        createBuffer: (numChannels: number, length: number, sampleRate: number) => {
          const buffer = {
            numberOfChannels: numChannels,
            length: length,
            sampleRate: sampleRate,
            duration: length / sampleRate,
            channels: new Array(numChannels).fill(null).map(() => new Float32Array(length)),
            getChannelData: function (channel: number) {
              return this.channels[channel];
            },
            copyToChannel: function (source: Float32Array, channelNumber: number) {
              const channel = this.channels[channelNumber];
              for (let i = 0; i < Math.min(source.length, channel.length); i++) {
                channel[i] = source[i];
              }
            },
            copyFromChannel: function (destination: Float32Array, channelNumber: number) {
              const channel = this.channels[channelNumber];
              for (let i = 0; i < Math.min(destination.length, channel.length); i++) {
                destination[i] = channel[i];
              }
            },
          };
          return buffer;
        },
      } as unknown as AudioContext;
    });

    it('should decode PCM data to AudioBuffer for mono channel', async () => {
      // Create sample Int16 data
      const int16Data = new Int16Array([16384, 8192, -8192, -16384]); // 0.5, 0.25, -0.25, -0.5
      const uint8Data = new Uint8Array(int16Data.buffer);

      const result = await decodeAudioData(uint8Data, audioContext, 16000, 1);

      expect(result.numberOfChannels).toBe(1);
      expect(result.sampleRate).toBe(16000);
      expect(result.length).toBe(4);

      const channelData = result.getChannelData(0);
      expect(channelData[0]).toBeCloseTo(0.5, 2);
      expect(channelData[1]).toBeCloseTo(0.25, 2);
      expect(channelData[2]).toBeCloseTo(-0.25, 2);
      expect(channelData[3]).toBeCloseTo(-0.5, 2);
    });

    it('should decode PCM data to AudioBuffer for stereo channels', async () => {
      // Interleaved stereo: L, R, L, R
      const int16Data = new Int16Array([16384, 8192, -8192, -16384]);
      const uint8Data = new Uint8Array(int16Data.buffer);

      const result = await decodeAudioData(uint8Data, audioContext, 24000, 2);

      expect(result.numberOfChannels).toBe(2);
      expect(result.sampleRate).toBe(24000);
      expect(result.length).toBe(2); // 4 samples / 2 channels

      const leftChannel = result.getChannelData(0);
      const rightChannel = result.getChannelData(1);

      // Left channel should have indices 0, 2
      expect(leftChannel[0]).toBeCloseTo(0.5, 2);
      expect(leftChannel[1]).toBeCloseTo(-0.25, 2);

      // Right channel should have indices 1, 3
      expect(rightChannel[0]).toBeCloseTo(0.25, 2);
      expect(rightChannel[1]).toBeCloseTo(-0.5, 2);
    });

    it('should handle zero channel special case', async () => {
      const int16Data = new Int16Array([16384, 8192]);
      const uint8Data = new Uint8Array(int16Data.buffer);

      const result = await decodeAudioData(uint8Data, audioContext, 16000, 0);

      expect(result.numberOfChannels).toBe(0);
      const channelData = result.getChannelData(0);
      expect(channelData[0]).toBeCloseTo(0.5, 2);
      expect(channelData[1]).toBeCloseTo(0.25, 2);
    });

    it('should convert Int16 to Float32 correctly', async () => {
      // Test boundary values
      const int16Data = new Int16Array([32767, -32768, 0]);
      const uint8Data = new Uint8Array(int16Data.buffer);

      const result = await decodeAudioData(uint8Data, audioContext, 16000, 1);

      const channelData = result.getChannelData(0);
      expect(channelData[0]).toBeCloseTo(1.0, 2); // 32767 / 32768
      expect(channelData[1]).toBeCloseTo(-1.0, 2); // -32768 / 32768
      expect(channelData[2]).toBe(0.0); // 0 / 32768
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve audio data through encode and decode cycle', () => {
      const original = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);

      // Encode
      const blob = createBlob(original);
      const decoded = decode(blob.data);
      const int16 = new Int16Array(decoded.buffer);

      // Decode back to Float32
      const reconstructed = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        reconstructed[i] = int16[i] / 32768.0;
      }

      // Verify values are approximately equal (some precision loss expected)
      for (let i = 0; i < original.length; i++) {
        expect(reconstructed[i]).toBeCloseTo(original[i], 4);
      }
    });
  });
});
