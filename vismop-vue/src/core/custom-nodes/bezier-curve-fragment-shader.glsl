#version 300 es

precision highp float;

in vec4 v_color;
in vec2 v_normal;
in float v_thickness;

out vec4 fragColor;

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

  fragColor = mix(v_color, transparent, t);
  #endif
}
