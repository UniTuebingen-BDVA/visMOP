//language=GLSL
const SHADER_SOURCE = `precision mediump float;

varying vec4 v_color;
varying vec2 v_normal;
varying float v_thickness;

const float feather = 0.001;
const vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);

void main(void) {
  // We only handle antialiasing for normal mode:
  #ifdef PICKING_MODE
  gl_FragColor = v_color;
  #else
  float dist = length(v_normal) * v_thickness;

  float t = smoothstep(
    v_thickness - feather,
    v_thickness,
    dist
  );

  gl_FragColor = mix(v_color, transparent, t);
  #endif
}`;
export default SHADER_SOURCE;
