/**
 * Sigma.js WebGL Renderer Fast Edge Program
 * ==========================================
 *
 * Program rendering edges using GL_LINES which is presumably very fast but
 * won't render thickness correctly on some GPUs and has some quirks.
 * @module
 */
import { NodeDisplayData, EdgeDisplayData, RenderParams } from 'sigma/types';
import { EdgeProgram } from 'sigma/rendering';
import VERTEX_SHADER_SOURCE from './bezier-curve-vertex-shader.glsl';
import FRAGMENT_SHADER_SOURCE from './bezier-curve-fragment-shader.glsl';
import { ProgramInfo } from 'sigma/rendering';

const { UNSIGNED_BYTE, FLOAT } = WebGLRenderingContext;

const UNIFORMS = ['u_matrix'] as const;

export default class EdgeLineProgram extends EdgeProgram<
  (typeof UNIFORMS)[number]
> {
  getDefinition() {
    return {
      VERTICES: 2,
      VERTEX_SHADER_SOURCE,
      FRAGMENT_SHADER_SOURCE,
      METHOD: WebGLRenderingContext.LINES,
      UNIFORMS,
      ATTRIBUTES: [
        { name: 'a_position', size: 2, type: FLOAT },
        { name: 'a_color', size: 4, type: UNSIGNED_BYTE, normalized: true },
        { name: 'a_id', size: 4, type: UNSIGNED_BYTE, normalized: true },
      ],
    };
  }

  processVisibleItem(
    edgeIndex: number,
    startIndex: number,
    sourceData: NodeDisplayData,
    targetData: NodeDisplayData,
    data: EdgeDisplayData
  ) {}

  setUniforms(
    params: RenderParams,
    { gl, uniformLocations }: ProgramInfo
  ): void {
    const { u_matrix } = uniformLocations;

    gl.uniformMatrix3fv(u_matrix, false, params.matrix);
  }
}
