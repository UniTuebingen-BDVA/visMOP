//based On Sigma Code todo licenscing
precision mediump float;

varying vec4 v_color0;
varying vec4 v_color1;
varying float v_border;

const float outerRadius = 0.5;
const float innerRadius = 0.4;
const vec4 noColor = vec4(0.0,0.0,0.0,0.0);
void main(void) {
  vec2 m = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(m);

  float t = 0.0;
  if (dist < innerRadius - v_border)
    gl_FragColor = v_color0;
  else if (dist < innerRadius)
    gl_FragColor = mix(v_color1,v_color0,(innerRadius-dist)/v_border);
  else if (dist < outerRadius - v_border)
    gl_FragColor = v_color1;
  else if (dist < outerRadius)
    gl_FragColor = mix(noColor,v_color1,(outerRadius-dist)/v_border);
  else
    gl_FragColor = noColor;
}