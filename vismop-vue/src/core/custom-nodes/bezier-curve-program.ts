/**
 * Adapted from dashed edge program
 * TODO: LICENSE
 */

/**
 * Bezier Curve Program
 * =====================================
 *
 * Program rendering edges as thick bezier curves.
 *
 * Rendering two triangles by using only four points is made possible through
 * the use of indices.
 * @module
 */
import { floatColor, canUse32BitsIndices } from 'sigma/utils';
import { NodeDisplayData } from 'sigma/types';
import { ColorfadeEdgeDisplayData } from './types';
import vertexShaderSource from './bezier-curve-vertex-shader.glsl?raw';
import fragmentShaderSource from './bezier-curve-fragment-shader.glsl?raw';
import { AbstractEdgeProgram } from 'sigma/rendering/webgl/programs/common/edge';
import { RenderParams } from 'sigma/rendering/webgl/programs/common/program';


const bez_sample_count = 20;
const POINTS = (bez_sample_count - 1) * 4;
const ATTRIBUTES = 6;
const STRIDE = POINTS * ATTRIBUTES;

export class BezierEdgeProgram extends AbstractEdgeProgram {
  IndicesArray: Uint32ArrayConstructor | Uint16ArrayConstructor;
  indicesArray: Uint32Array | Uint16Array;
  indicesBuffer: WebGLBuffer;
  indicesType: GLenum;
  canUse32BitsIndices: boolean;
  positionLocation: GLint;
  colorLocation: GLint;
  normalLocation: GLint;
  dashedLocation: GLint;
  matrixLocation: WebGLUniformLocation;
  sqrtZoomRatioLocation: WebGLUniformLocation;
  correctionRatioLocation: WebGLUniformLocation;
  dashLengthLocation: WebGLUniformLocation;
  gapLengthLocation: WebGLUniformLocation;
  viewportResolutionLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, vertexShaderSource, fragmentShaderSource, POINTS, ATTRIBUTES);

    // Initializing indices buffer
    const indicesBuffer = gl.createBuffer();
    if (indicesBuffer === null)
      throw new Error('EdgeProgram: error while creating indicesBuffer');
    this.indicesBuffer = indicesBuffer;

    // Locations
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.colorLocation = gl.getAttribLocation(this.program, 'a_color');
    this.normalLocation = gl.getAttribLocation(this.program, 'a_normal');
    this.dashedLocation = gl.getAttribLocation(this.program, 'a_dashed');

    const matrixLocation = gl.getUniformLocation(this.program, 'u_matrix');
    if (matrixLocation === null)
      throw new Error('EdgeProgram: error while getting matrixLocation');
    this.matrixLocation = matrixLocation;

    const correctionRatioLocation = gl.getUniformLocation(
      this.program,
      'u_correctionRatio'
    );
    if (correctionRatioLocation === null)
      throw new Error(
        'EdgeProgram: error while getting correctionRatioLocation'
      );
    this.correctionRatioLocation = correctionRatioLocation;

    const sqrtZoomRatioLocation = gl.getUniformLocation(
      this.program,
      'u_sqrtZoomRatio'
    );
    if (sqrtZoomRatioLocation === null)
      throw new Error('EdgeProgram: error while getting sqrtZoomRatioLocation');
    this.sqrtZoomRatioLocation = sqrtZoomRatioLocation;

    const dashLengthLocation = gl.getUniformLocation(
      this.program,
      'u_dashLength'
    );
    if (dashLengthLocation === null)
      throw new Error('EdgeProgram: error while getting dashLengthLocation');
    this.dashLengthLocation = dashLengthLocation;

    const gapLengthLocation = gl.getUniformLocation(
      this.program,
      'u_gapLength'
    );
    if (gapLengthLocation === null)
      throw new Error('EdgeProgram: error while getting gapLengthLocation');
    this.gapLengthLocation = gapLengthLocation;

    const viewportResolutionLocation = gl.getUniformLocation(
      this.program,
      'u_viewportResolution'
    );
    if (viewportResolutionLocation === null) {
      throw new Error(
        'EdgeProgram: error while getting viewportResolutionLocation'
      );
    }
    this.viewportResolutionLocation = viewportResolutionLocation;

    // Enabling the OES_element_index_uint extension
    // NOTE: on older GPUs, this means that really large graphs won't
    // have all their edges rendered. But it seems that the
    // `OES_element_index_uint` is quite everywhere so we'll handle
    // the potential issue if it really arises.
    // NOTE: when using webgl2, the extension is enabled by default
    this.canUse32BitsIndices = canUse32BitsIndices(gl);
    this.IndicesArray = this.canUse32BitsIndices ? Uint32Array : Uint16Array;
    this.indicesArray = new this.IndicesArray();
    this.indicesType = this.canUse32BitsIndices
      ? gl.UNSIGNED_INT
      : gl.UNSIGNED_SHORT;

    this.bind();
  }

  bind(): void {
    const gl = this.gl;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);

    // Bindings
    gl.enableVertexAttribArray(this.positionLocation);
    gl.enableVertexAttribArray(this.normalLocation);
    gl.enableVertexAttribArray(this.colorLocation);
    gl.enableVertexAttribArray(this.dashedLocation);

    gl.vertexAttribPointer(
      this.positionLocation,
      2,
      gl.FLOAT,
      false,
      ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    gl.vertexAttribPointer(
      this.normalLocation,
      2,
      gl.FLOAT,
      false,
      ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT,
      8
    );
    gl.vertexAttribPointer(
      this.colorLocation,
      4,
      gl.UNSIGNED_BYTE,
      true,
      ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT,
      16
    );
    gl.vertexAttribPointer(
      this.dashedLocation,
      1,
      gl.FLOAT,
      false,
      ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT,
      20
    );
  }

  computeIndices(): void {
    const l = this.array.length / ATTRIBUTES;
    const size = l + l / 2;
    const indices = new this.IndicesArray(size);

    for (let i = 0, c = 0; i < l; i += 4) {
      // triangle 1
      indices[c++] = i;
      indices[c++] = i + 1;
      indices[c++] = i + 2;
      // triangle 2
      indices[c++] = i + 2;
      indices[c++] = i + 1;
      indices[c++] = i + 3;
    }

    this.indicesArray = indices;
  }

  bufferData(): void {
    super.bufferData();

    // Indices data
    const gl = this.gl;
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indicesArray, gl.STATIC_DRAW);
  }

  fact(n: number): number {
    var result = 1;
    for(var i = 2; i <=n; ++i) {
      result *= i;
    }
    return result;
  }
 
  // bezier functions:
  comb(n: number, k: number): number {
    const fact = this.fact;

    return fact(n) / (fact(k) * fact(n-k))
  }

  get_bezier_curve(points: Array<Array<number>>): Function {
    const n = points.length - 1;

    return (t: number): Array<number> => {
      var sum_x = 0;
      var sum_y = 0;

      for(var i = 0; i <= n; ++i) {

        sum_x += this.comb(n,i) * t ** i * (1-t) ** (n-i) * points[i][0]
        sum_y += this.comb(n,i) * t ** i * (1-t) ** (n-i) * points[i][1]
      }
      return [sum_x, sum_y];
    }
  }

  // input: control points, number of samples
  // returns: [[x1,y1],...[xn,yn]] points along the curve
  evaluate_bezier(points: Array<Array<number>>, total: number): Array<Array<number>> {
    const n = total -1;
    var bezier = this.get_bezier_curve(points);
    var new_points = [];
    for(var i = 0; i <= n; i++) {
      const t = i / n;
      new_points.push(bezier(t));
    }
    return new_points;
  }
  

  process(
    sourceData: NodeDisplayData,
    targetData: NodeDisplayData,
    data: ColorfadeEdgeDisplayData,
    hidden: boolean,
    offset: number
  ): void {
    if (hidden) {
      for (let i = offset * STRIDE, l = i + STRIDE; i < l; i++)
        this.array[i] = 0;
      return;
    }

    const thickness = data.size || 1;
    const x1 = sourceData.x;
    const y1 = sourceData.y;
    const x2 = targetData.x;
    const y2 = targetData.y;
    const color = floatColor(data.color);
    const dashed = data.type === 'dashed' ? 1 : 0;
    const bezeierControlPoints = data.bezeierControlPoints;
    
    // Computing normals
    const dx = x2 - x1;
    const dy = y2 - y1;

    let len = dx * dx + dy * dy;
    let n1 = 0;
    let n2 = 0;

    if (len) {
      let inv_len = 1 / Math.sqrt(len);

      n1 = -dy * inv_len * thickness;
      n2 = dx * inv_len * thickness;
    }

    let i = POINTS * ATTRIBUTES * offset;

    const array = this.array;

    const points = [];

    if(bezeierControlPoints.length >= 2 && data.showBundling) {

      const bx1 = bezeierControlPoints[0];
      const by1 = bezeierControlPoints[1];

      const bx2 = bezeierControlPoints[bezeierControlPoints.length - 1];
      const by2 = bezeierControlPoints[bezeierControlPoints.length];

      // Computing normals
      const bezier_dx =  bx2 - bx1;
      const bezier_dy =  by2 - by1;

      let bezier_len = bezier_dx * bezier_dx + bezier_dy * bezier_dy;

      const bezierCorrectionFactor = len / bezier_len;


      for(let i =0; i < bezeierControlPoints.length/2; ++i) {
        points.push([bezeierControlPoints[i*2], bezeierControlPoints[i*2 + 1]])
      }
    }
    else {
      points.push([x1,y1],[x2,y2]);
    }
    const bez_samples = this.evaluate_bezier(points, bez_sample_count);

    // for each sample point pair from the bezier curve create
    // four vertecies (to form a line segment)
    for(var n = 0; n < bez_samples.length - 1; ++n) {
      const p1 = bez_samples[n];
      const p2 = bez_samples[n+1];

      const p1x = p1[0];
      const p1y = p1[1];

      const p2x = p2[0];
      const p2y = p2[1];

      // Computing normals
      const dx = p2x - p1x;
      const dy = p2y - p1y;

      let len = dx * dx + dy * dy;
      let n1 = 0;
      let n2 = 0;

      if (len) {
        let inv_len = 1 / Math.sqrt(len);

        n1 = -dy * inv_len * thickness;
        n2 = dx * inv_len * thickness;
      }

      // First point
      array[i++] = p1x;
      array[i++] = p1y;
      array[i++] = n1;
      array[i++] = n2;
      array[i++] = color;
      array[i++] = dashed;

      // First point flipped
      array[i++] = p1x;
      array[i++] = p1y;
      array[i++] = -n1;
      array[i++] = -n2;
      array[i++] = color;
      array[i++] = dashed;

      // Second point
      array[i++] = p2x;
      array[i++] = p2y;
      array[i++] = n1;
      array[i++] = n2;
      array[i++] = color;
      array[i++] = dashed;

      // Second point flipped
      array[i++] = p2x;
      array[i++] = p2y;
      array[i++] = -n1;
      array[i++] = -n2;
      array[i++] = color;
      array[i++] = dashed;
    }
  }

  render(params: RenderParams): void {
    if (this.hasNothingToRender()) return;

    const gl = this.gl;
    const program = this.program;

    gl.useProgram(program);

    gl.uniformMatrix3fv(this.matrixLocation, false, params.matrix);
    gl.uniform1f(this.sqrtZoomRatioLocation, Math.sqrt(params.ratio));
    gl.uniform1f(this.correctionRatioLocation, params.correctionRatio);
    gl.uniform1f(this.dashLengthLocation, 3 * (1 / params.ratio));
    gl.uniform1f(this.gapLengthLocation, 6 * (1 / params.ratio));
    gl.uniform2f(this.viewportResolutionLocation, params.width, params.height);
    // Drawing:
    gl.drawElements(
      gl.TRIANGLES,
      this.indicesArray.length,
      this.indicesType,
      0
    );
  }
}
