/**
 * Sigma.js WebGL Renderer Fast Edge Program
 * ==========================================
 *
 * Program rendering edges using GL_LINES which is presumably very fast but
 * won't render thickness correctly on some GPUs and has some quirks.
 * @module
 */
import { NodeDisplayData, EdgeDisplayData, RenderParams } from 'sigma/types';
import { floatColor } from 'sigma/utils';
import { EdgeProgram } from 'sigma/rendering/edge';
import { ColorfadeEdgeDisplayData } from './types';
import VERTEX_SHADER_SOURCE from './bezier-curve-vertex-shader.glsl?raw';
import FRAGMENT_SHADER_SOURCE from './bezier-curve-fragment-shader.glsl?raw';
import { ProgramInfo } from 'sigma/rendering/program';

const { UNSIGNED_BYTE, FLOAT } = WebGLRenderingContext;

const UNIFORMS = ['u_matrix'] as const;

const bez_sample_count = 30;
const POINTS = (bez_sample_count - 1) * 4;
const ATTRIBUTES = 3;
const STRIDE = POINTS * ATTRIBUTES;

export default class BezierEdgeProgram extends EdgeProgram<
  (typeof UNIFORMS)[number]
> {
  getDefinition() {
    return {
      VERTICES: POINTS,
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
    data: ColorfadeEdgeDisplayData
  ) {
    const array = this.array;

    const thickness = data.size || 1;
    const x1 = sourceData.x;
    const y1 = sourceData.y;
    const x2 = targetData.x;
    const y2 = targetData.y;
    const color = floatColor(data.color);
    const bezeierControlPoints = data.bezeierControlPoints;

    // Computing normals
    const dx = x2 - x1;
    const dy = y2 - y1;

    const len = dx * dx + dy * dy;
    let n1 = 0;
    let n2 = 0;

    if (len) {
      const inv_len = 1 / Math.sqrt(len);

      n1 = -dy * inv_len * thickness;
      n2 = dx * inv_len * thickness;
    }

    const control_points = [];
    // source node
    control_points.push([x1, y1]);
    if (bezeierControlPoints.length >= 2 && data.showBundling) {
      // add all control-points to points except the first and the last
      // the first and the last are added with "points.push([x1,y1]);" and "points.push([x2,y2]);"
      // before and after this code block
      for (let i = 1; i < bezeierControlPoints.length / 2 - 1; ++i) {
        control_points.push([
          bezeierControlPoints[i * 2],
          bezeierControlPoints[i * 2 + 1],
        ]);
      }
    }
    // target node
    control_points.push([x2, y2]);

    const bez_samples = this.evaluate_bezier(control_points, bez_sample_count);

    // for each sample point pair from the bezier curve create
    // four vertecies (to form a line segment)
    for (let n = 0; n < bez_samples.length - 1; ++n) {
      const p1 = bez_samples[n];
      const p2 = bez_samples[n + 1];

      const p1x = p1[0];
      const p1y = p1[1];

      const p2x = p2[0];
      const p2y = p2[1];

      // First point
      array[startIndex++] = p1x;
      array[startIndex++] = p1y;
      array[startIndex++] = n1;
      array[startIndex++] = n2;
      array[startIndex++] = color;

      // Second point
      array[startIndex++] = p2x;
      array[startIndex++] = p2y;
      array[startIndex++] = n1;
      array[startIndex++] = n2;
      array[startIndex++] = color;
    }
    // First point
    array[startIndex++] = x1;
    array[startIndex++] = y1;
    array[startIndex++] = color;
    array[startIndex++] = edgeIndex;

    // Second point
    array[startIndex++] = x2;
    array[startIndex++] = y2;
    array[startIndex++] = color;
    array[startIndex++] = edgeIndex;
  }

  fact(n: number): number {
    let result = 1;
    for (let i = 2; i <= n; ++i) {
      result *= i;
    }
    return result;
  }

  // bezier functions:
  comb(n: number, k: number): number {
    const fact = this.fact;

    return fact(n) / (fact(k) * fact(n - k));
  }

  get_bezier_curve(points: Array<Array<number>>): (t: number) => Array<number> {
    const n = points.length - 1;

    return (t: number): Array<number> => {
      let sum_x = 0;
      let sum_y = 0;

      for (let i = 0; i <= n; ++i) {
        sum_x += this.comb(n, i) * t ** i * (1 - t) ** (n - i) * points[i][0];
        sum_y += this.comb(n, i) * t ** i * (1 - t) ** (n - i) * points[i][1];
      }
      return [sum_x, sum_y];
    };
  }
  // input: control points, number of samples
  // returns: [[x1,y1],...[xn,yn]] points along the curve
  evaluate_bezier(
    points: Array<Array<number>>,
    total: number
  ): Array<Array<number>> {
    const n = total - 1;
    const bezier = this.get_bezier_curve(points);
    const new_points = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      new_points.push(bezier(t));
    }
    return new_points;
  }

  setUniforms(
    params: RenderParams,
    { gl, uniformLocations }: ProgramInfo
  ): void {
    const { u_matrix } = uniformLocations;

    gl.uniformMatrix3fv(u_matrix, false, params.matrix);
  }
}
