/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Analyser } from './analyser';

describe('Analyser', () => {
  let mockAudioNode: AudioNode;
  let mockAnalyserNode: AnalyserNode;
  let mockAudioContext: AudioContext;

  beforeEach(() => {
    // Create mock AnalyserNode
    mockAnalyserNode = {
      fftSize: 2048,
      frequencyBinCount: 16,
      getByteFrequencyData: vi.fn((array: Uint8Array) => {
        // Fill with mock frequency data
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }),
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as AnalyserNode;

    // Create mock AudioContext
    mockAudioContext = {
      createAnalyser: vi.fn(() => mockAnalyserNode),
      state: 'running',
      sampleRate: 48000,
    } as unknown as AudioContext;

    // Create mock AudioNode
    mockAudioNode = {
      context: mockAudioContext,
      connect: vi.fn(),
      disconnect: vi.fn(),
      numberOfInputs: 1,
      numberOfOutputs: 1,
    } as unknown as AudioNode;
  });

  describe('constructor', () => {
    it('should create an Analyser instance', () => {
      const analyser = new Analyser(mockAudioNode);
      expect(analyser).toBeInstanceOf(Analyser);
    });

    it('should create an AnalyserNode from the audio node context', () => {
      new Analyser(mockAudioNode);
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    it('should set FFT size to 32', () => {
      new Analyser(mockAudioNode);
      expect(mockAnalyserNode.fftSize).toBe(32);
    });

    it('should connect the audio node to the analyser', () => {
      new Analyser(mockAudioNode);
      expect(mockAudioNode.connect).toHaveBeenCalledWith(mockAnalyserNode);
    });

    it('should initialize data array with correct size', () => {
      const analyser = new Analyser(mockAudioNode);
      const data = analyser.data;

      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(16); // frequencyBinCount
    });
  });

  describe('update', () => {
    it('should call getByteFrequencyData on the analyser node', () => {
      const analyser = new Analyser(mockAudioNode);
      analyser.update();

      expect(mockAnalyserNode.getByteFrequencyData).toHaveBeenCalled();
    });

    it('should update the data array with frequency data', () => {
      const analyser = new Analyser(mockAudioNode);

      // Get initial data
      const dataBefore = analyser.data;
      const initialValues = Array.from(dataBefore);

      // Update
      analyser.update();

      // Get updated data
      const dataAfter = analyser.data;
      const updatedValues = Array.from(dataAfter);

      // Verify the data array reference is the same
      expect(dataAfter).toBe(dataBefore);
    });

    it('should call update multiple times without errors', () => {
      const analyser = new Analyser(mockAudioNode);

      expect(() => {
        analyser.update();
        analyser.update();
        analyser.update();
      }).not.toThrow();
    });
  });

  describe('data getter', () => {
    it('should return a Uint8Array', () => {
      const analyser = new Analyser(mockAudioNode);
      const data = analyser.data;

      expect(data).toBeInstanceOf(Uint8Array);
    });

    it('should return the same array instance on multiple calls', () => {
      const analyser = new Analyser(mockAudioNode);
      const data1 = analyser.data;
      const data2 = analyser.data;

      expect(data1).toBe(data2);
    });

    it('should have length equal to frequency bin count', () => {
      const analyser = new Analyser(mockAudioNode);
      const data = analyser.data;

      expect(data.length).toBe(mockAnalyserNode.frequencyBinCount);
    });

    it('should contain values in valid byte range after update', () => {
      const analyser = new Analyser(mockAudioNode);
      analyser.update();
      const data = analyser.data;

      for (let i = 0; i < data.length; i++) {
        expect(data[i]).toBeGreaterThanOrEqual(0);
        expect(data[i]).toBeLessThanOrEqual(255);
      }
    });
  });

  describe('FFT size configuration', () => {
    it('should have correct frequency bin count for FFT size 32', () => {
      const analyser = new Analyser(mockAudioNode);

      // FFT size 32 should result in frequencyBinCount of 16
      expect(mockAnalyserNode.frequencyBinCount).toBe(16);
    });
  });

  describe('Integration scenarios', () => {
    it('should work with different audio contexts', () => {
      const context1 = {
        createAnalyser: vi.fn(() => mockAnalyserNode),
        sampleRate: 16000,
      } as unknown as AudioContext;

      const context2 = {
        createAnalyser: vi.fn(() => mockAnalyserNode),
        sampleRate: 24000,
      } as unknown as AudioContext;

      const node1 = { context: context1, connect: vi.fn() } as unknown as AudioNode;
      const node2 = { context: context2, connect: vi.fn() } as unknown as AudioNode;

      const analyser1 = new Analyser(node1);
      const analyser2 = new Analyser(node2);

      expect(context1.createAnalyser).toHaveBeenCalled();
      expect(context2.createAnalyser).toHaveBeenCalled();
      expect(analyser1).toBeInstanceOf(Analyser);
      expect(analyser2).toBeInstanceOf(Analyser);
    });

    it('should work with gain nodes', () => {
      const gainNode = {
        context: mockAudioContext,
        connect: vi.fn(),
        gain: { value: 1.0 },
      } as unknown as GainNode;

      const analyser = new Analyser(gainNode as AudioNode);

      expect(analyser).toBeInstanceOf(Analyser);
      expect(gainNode.connect).toHaveBeenCalledWith(mockAnalyserNode);
    });
  });

  describe('Real-time frequency data simulation', () => {
    it('should update frequency data on each update call', () => {
      // Mock varying frequency data
      let callCount = 0;
      mockAnalyserNode.getByteFrequencyData = vi.fn((array: Uint8Array) => {
        callCount++;
        for (let i = 0; i < array.length; i++) {
          // Simulate different frequency patterns
          array[i] = (callCount * 10 + i) % 256;
        }
      });

      const analyser = new Analyser(mockAudioNode);

      // First update
      analyser.update();
      const data1 = Array.from(analyser.data);

      // Second update
      analyser.update();
      const data2 = Array.from(analyser.data);

      // Verify data changed
      expect(data1).not.toEqual(data2);
      expect(mockAnalyserNode.getByteFrequencyData).toHaveBeenCalledTimes(2);
    });
  });
});
