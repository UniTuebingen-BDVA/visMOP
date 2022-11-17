#version 300 es
//based on sigma src code and https://stackoverflow.com/questions/52928678/dashed-line-in-opengl3/54543267 TODO LICENSE

precision mediump float;

in vec4 v_color;
in vec2 v_normal;
in float v_thickness;

in vec3 vertexPos;
flat in vec3 startPos;

out vec4 outColor;

uniform vec2 u_viewportResolution;
uniform float u_dashLength;
uniform float u_gapLength;

const float feather = 0.001;
const vec4 color0 = vec4(0.0, 0.0, 0.0, 0.0);
void main(void) {
  vec2 dir = (vertexPos.xy-startPos.xy) * u_viewportResolution/2.0;
  float distFromStart = length(dir);

  float dist = length(v_normal) * v_thickness;


  float t = smoothstep(
    v_thickness - feather,
    v_thickness,
    dist
  );

  if (fract(distFromStart / (u_dashLength + u_gapLength)) > u_gapLength/(u_dashLength + u_gapLength))
    //discard;
    outColor =  vec4(0,1,0,1);//mix(vec4(0.3 * v_color[0],0.3 * v_color[1], 0.3 * v_color[2], v_color[3]), color0, t); 
  else
    outColor =  mix(v_color, color0, t);
}