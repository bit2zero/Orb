/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { vs } from './sphere-shader';

describe('Sphere Shader', () => {
  describe('Vertex Shader Export', () => {
    it('should export vertex shader as a string', () => {
      expect(typeof vs).toBe('string');
      expect(vs.length).toBeGreaterThan(0);
    });

    it('should contain GLSL directive', () => {
      expect(vs).toContain('#define STANDARD');
    });

    it('should declare required uniforms', () => {
      expect(vs).toContain('uniform float time');
      expect(vs).toContain('uniform vec4 inputData');
      expect(vs).toContain('uniform vec4 outputData');
    });

    it('should declare required varyings', () => {
      expect(vs).toContain('varying vec3 vViewPosition');
    });

    it('should include necessary Three.js shader chunks', () => {
      expect(vs).toContain('#include <common>');
      expect(vs).toContain('#include <uv_pars_vertex>');
      expect(vs).toContain('#include <normal_pars_vertex>');
      expect(vs).toContain('#include <shadowmap_pars_vertex>');
    });

    it('should contain calc function for position calculation', () => {
      expect(vs).toContain('vec3 calc( vec3 pos )');
      expect(vs).toContain('inputData.x * inputData.y');
      expect(vs).toContain('outputData.x * outputData.y');
    });

    it('should contain spherical coordinate function', () => {
      expect(vs).toContain('vec3 spherical( float r, float theta, float phi )');
      expect(vs).toContain('cos( theta ) * cos( phi )');
      expect(vs).toContain('sin( theta ) * cos( phi )');
      expect(vs).toContain('sin( phi )');
    });

    it('should have main function', () => {
      expect(vs).toContain('void main()');
    });

    it('should calculate tangent space for normal mapping', () => {
      expect(vs).toContain('vec3 tangent');
      expect(vs).toContain('vec3 bitangent');
      expect(vs).toContain('cross( tangent, bitangent )');
    });

    it('should use UV coordinates for spherical mapping', () => {
      expect(vs).toContain('uv.x');
      expect(vs).toContain('uv.y');
      expect(vs).toContain('2. * PI');
    });
  });

  describe('Shader Validation', () => {
    it('should not have syntax errors in string', () => {
      // Check for balanced braces
      const openBraces = (vs.match(/{/g) || []).length;
      const closeBraces = (vs.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('should contain proper vector operations', () => {
      expect(vs).toMatch(/vec[234]/); // vec2, vec3, or vec4
    });

    it('should use proper GLSL data types', () => {
      expect(vs).toContain('float');
      expect(vs).toContain('vec3');
      expect(vs).toContain('vec4');
    });
  });

  describe('Audio Reactivity Features', () => {
    it('should use inputData uniform for input audio reactivity', () => {
      expect(vs).toContain('uniform vec4 inputData');
      expect(vs).toContain('inputData.x');
      expect(vs).toContain('inputData.y');
      expect(vs).toContain('inputData.z');
    });

    it('should use outputData uniform for output audio reactivity', () => {
      expect(vs).toContain('uniform vec4 outputData');
      expect(vs).toContain('outputData.x');
      expect(vs).toContain('outputData.y');
      expect(vs).toContain('outputData.z');
    });

    it('should use time uniform for animation', () => {
      expect(vs).toContain('uniform float time');
      expect(vs).toContain('pos.x + time');
      expect(vs).toContain('pos.y + time');
    });

    it('should apply displacement based on audio data', () => {
      const calcFunction = vs.match(/vec3 calc\( vec3 pos \) \{[\s\S]*?\n\}/);
      expect(calcFunction).toBeTruthy();
      if (calcFunction) {
        expect(calcFunction[0]).toContain('inputData');
        expect(calcFunction[0]).toContain('outputData');
        expect(calcFunction[0]).toContain('sin(');
      }
    });
  });
});
