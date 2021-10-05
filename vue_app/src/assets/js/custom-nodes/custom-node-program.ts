/**
 * programs changed from sigma.js examples //ToDo copyright stuff
 */
import { AbstractNodeProgram, RenderNodeParams } from "sigma/src/rendering/webgl/programs/common/node";
import { SplitNodeDisplayData } from "./types";
import { floatColor } from "sigma/src/utils";
import vertexShaderSource from "./square-node-vertex-shader.glsl";
import fragmentShaderSource from "./square-node-fragment-shader.glsl";

const POINTS = 3,
  ATTRIBUTES = 6;

export default class CustomNodeProgram extends AbstractNodeProgram {
  colorLocation0: GLint;
  colorLocation1: GLint;

  constructor(gl: WebGLRenderingContext) {
    super(gl, vertexShaderSource, fragmentShaderSource, POINTS, ATTRIBUTES);
    // Locations
    this.positionLocation = gl.getAttribLocation(this.program, "a_position");
    this.sizeLocation = gl.getAttribLocation(this.program, "a_size");
    this.colorLocation0 = gl.getAttribLocation(this.program, "a_color0");
    this.colorLocation1 = gl.getAttribLocation(this.program, "a_color1");

    this.bind();
  }
  bind(): void {
    const gl = this.gl;

    gl.enableVertexAttribArray(this.positionLocation);
    gl.enableVertexAttribArray(this.sizeLocation);
    gl.enableVertexAttribArray(this.colorLocation0);
    gl.enableVertexAttribArray(this.colorLocation1);

    gl.vertexAttribPointer(
      this.positionLocation,
      2,
      gl.FLOAT,
      false,
      this.attributes * Float32Array.BYTES_PER_ELEMENT,
      0,
    );
    gl.vertexAttribPointer(this.sizeLocation, 1, gl.FLOAT, false, this.attributes * Float32Array.BYTES_PER_ELEMENT, 8);
    gl.vertexAttribPointer(
      this.colorLocation0,
      4,
      gl.UNSIGNED_BYTE,
      true,
      this.attributes * Float32Array.BYTES_PER_ELEMENT,
      12,
    );
    gl.vertexAttribPointer(
      this.colorLocation1,
      4,
      gl.UNSIGNED_BYTE,
      true,
      this.attributes * Float32Array.BYTES_PER_ELEMENT,
      16,
    );
  }
  process(data: SplitNodeDisplayData, hidden: boolean, offset: number): void {
    let i = offset * POINTS * ATTRIBUTES;
    const array = this.array;

    if (hidden) {
      array[i++] = 0;
      array[i++] = 0;
      array[i++] = 0;
      array[i++] = 0;
      return;
    }
    //const colors = data.color.split(";")
    const color1 = floatColor(data.color);
    const color2 = floatColor(data.secondaryColor);

    array[i++] = data.x;
    array[i++] = data.y;
    array[i++] = data.size;
    array[i++] = color1;
    array[i] = color2;
  }

  render(params: RenderNodeParams): void {
    const gl = this.gl;

    const program = this.program;
    gl.useProgram(program);

    gl.uniform1f(this.ratioLocation, 1 / Math.pow(params.ratio, params.nodesPowRatio));
    gl.uniform1f(this.scaleLocation, params.scalingRatio);
    gl.uniformMatrix3fv(this.matrixLocation, false, params.matrix);

    gl.drawArrays(gl.POINTS, 0, this.array.length / ATTRIBUTES);
  }
}
