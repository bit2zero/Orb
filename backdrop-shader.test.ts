/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { vs, fs } from './backdrop-shader';

describe('Backdrop Shader', () => {
  describe('Vertex Shader Export', () => {
    it('should export vertex shader as a string', () => {
      expect(typeof vs).toBe('string');
      expect(vs.length).toBeGreaterThan(0);
    });

    it('should set precision to highp', () => {
      expect(vs).toContain('precision highp float');
    });

    it('should declare position input', () => {
      expect(vs).toContain('in vec3 position');
    });

    it('should declare required uniforms', () => {
      expect(vs).toContain('uniform mat4 modelViewMatrix');
      expect(vs).toContain('uniform mat4 projectionMatrix');
    });

    it('should have main function', () => {
      expect(vs).toContain('void main()');
    });

    it('should calculate gl_Position', () => {
      expect(vs).toContain('gl_Position');
      expect(vs).toContain('projectionMatrix * modelViewMatrix * vec4(position, 1.)');
    });
  });

  describe('Fragment Shader Export', () => {
    it('should export fragment shader as a string', () => {
      expect(typeof fs).toBe('string');
      expect(fs.length).toBeGreaterThan(0);
    });

    it('should set precision to highp', () => {
      expect(fs).toContain('precision highp float');
    });

    it('should declare output color', () => {
      expect(fs).toContain('out vec4 fragmentColor');
    });

    it('should declare required uniforms', () => {
      expect(fs).toContain('uniform vec2 resolution');
      expect(fs).toContain('uniform float rand');
    });

    it('should have main function', () => {
      expect(fs).toContain('void main()');
    });

    it('should calculate aspect ratio', () => {
      expect(fs).toContain('float aspectRatio');
      expect(fs).toContain('resolution.x / resolution.y');
    });

    it('should generate noise', () => {
      expect(fs).toContain('float noise');
      expect(fs).toContain('fract(sin(dot(');
      expect(fs).toContain('rand');
    });

    it('should create gradient effect', () => {
      expect(fs).toContain('vec3 from');
      expect(fs).toContain('vec3 to');
      expect(fs).toContain('mix(from, to, d)');
    });

    it('should set fragment color with noise', () => {
      expect(fs).toContain('fragmentColor');
      expect(fs).toContain('.005 * noise');
    });
  });

  describe('Shader Validation', () => {
    it('should have balanced braces in vertex shader', () => {
      const openBraces = (vs.match(/{/g) || []).length;
      const closeBraces = (vs.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('should have balanced braces in fragment shader', () => {
      const openBraces = (fs.match(/{/g) || []).length;
      const closeBraces = (fs.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('should have balanced parentheses in vertex shader', () => {
      const openParens = (vs.match(/\(/g) || []).length;
      const closeParens = (vs.match(/\)/g) || []).length;
      expect(openParens).toBe(closeParens);
    });

    it('should have balanced parentheses in fragment shader', () => {
      const openParens = (fs.match(/\(/g) || []).length;
      const closeParens = (fs.match(/\)/g) || []).length;
      expect(openParens).toBe(closeParens);
    });

    it('should use proper GLSL data types in vertex shader', () => {
      expect(vs).toMatch(/vec[234]|mat[234]/);
      expect(vs).toContain('float');
    });

    it('should use proper GLSL data types in fragment shader', () => {
      expect(fs).toMatch(/vec[234]/);
      expect(fs).toContain('float');
    });
  });

  describe('Gradient Configuration', () => {
    it('should define gradient start color', () => {
      expect(fs).toContain('vec3 from = vec3(3.) / 255.');
    });

    it('should define gradient end color', () => {
      expect(fs).toContain('vec3 to = vec3(16., 12., 20.) / 2550.');
    });

    it('should use distance for gradient calculation', () => {
      expect(fs).toContain('float d = factor * length(vUv)');
    });

    it('should apply gradient factor', () => {
      expect(fs).toContain('float factor = 4.');
    });
  });

  describe('Visual Effects', () => {
    it('should center UV coordinates', () => {
      expect(fs).toContain('vUv -= .5');
    });

    it('should apply aspect ratio correction', () => {
      expect(fs).toContain('vUv.x *= aspectRatio');
    });

    it('should add subtle noise to gradient', () => {
      expect(fs).toContain('.005 * noise');
    });

    it('should use gl_FragCoord for pixel coordinates', () => {
      expect(fs).toContain('gl_FragCoord.xy');
    });
  });

  describe('Exports', () => {
    it('should export both vertex and fragment shaders', () => {
      expect(vs).toBeDefined();
      expect(fs).toBeDefined();
    });

    it('should have different content for vertex and fragment shaders', () => {
      expect(vs).not.toBe(fs);
    });
  });
});
