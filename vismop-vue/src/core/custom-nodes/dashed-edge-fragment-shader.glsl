#version 300 es
//based on sigma src code and https://stackoverflow.com/questions/52928678/dashed-line-in-opengl3/54543267 TODO LICENSE

precision mediump float;

in vec4 v_color;
in vec2 v_normal;
in float v_thickness;

in vec3 vertexPos;
flat in vec3 startPos;

out vec4 outColor;

uniform vec2 u_viewPortResolution;
uniform float u_dashLength;
uniform float u_gapLength;

const float feather = 0.001;
const vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);

void main(void) {
  vec2 dir = (vertexPos.xy-startPos.xy) * u_viewPortResolution/2.0;
  float distFromStart = length(dir);

  float dist = length(v_normal) * v_thickness;


  float t = smoothstep(
    v_thickness - feather,
    v_thickness,
    dist
  );

  if (fract(distFromStart / (u_dashLength + u_gapLength)) > u_gapLength/(u_dashLength + u_gapLength))
    discard;

  outColor = mix(v_color, color0, t);
}