//based on sigma src code TODO LICENSE


precision mediump float;

varying vec4 v_color0;
varying vec4 v_color1;
varying vec4 v_color2;
varying float v_border;

const float radius = 0.5;
const float halfRadius = 0.25;

void main(void) {

  if (gl_PointCoord.x < 0.1 || gl_PointCoord.y < 0.1 || gl_PointCoord.x > 0.9 || gl_PointCoord.y > 0.9 )
    gl_FragColor = v_color2;
  else if (gl_PointCoord.x < 0.5)
    gl_FragColor = v_color0;
  else
    gl_FragColor = v_color1;
}