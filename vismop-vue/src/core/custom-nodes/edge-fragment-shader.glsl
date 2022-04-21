#version 300 es
//based on sigma src code TODO LICENSE

precision mediump float;

in vec4 v_color;
in vec2 v_normal;
in float v_thickness;

in vec3 vertexPos;
flat in vec3 startPos;

out vec4 outColor;

uniform vec2 u_viewportResolution;

const float feather = 0.001;
const vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);
void main(void) {
  vec2 dir = (vertexPos.xy-startPos.xy) * u_viewportResolution/2.0;

  float dist = length(v_normal) * v_thickness;

  float t = smoothstep(
    v_thickness - feather,
    v_thickness,
    dist
  );

  outColor =  mix(v_color, color0, t);
}