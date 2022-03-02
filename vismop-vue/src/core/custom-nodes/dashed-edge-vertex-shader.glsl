#version 300 es
//based on sigma src code and https://stackoverflow.com/questions/52928678/dashed-line-in-opengl3/54543267 TODO LICENSE

in vec2 a_position;
in vec2 a_normal;
in float a_thickness;
in vec4 a_color;

uniform mat3 u_matrix;
uniform float u_sqrtZoomRatio;
uniform float u_correctionRatio;

out vec4 v_color;
out vec2 v_normal;
out float v_thickness;

out vec3 vertexPos;
flat out vec3 startPos;

const float minThickness = 1.7;
const float bias = 255.0 / 254.0;


void main() {
  float normalLength = length(a_normal);
  vec2 unitNormal = a_normal / normalLength;

  // We require edges to be at least `minThickness` pixels thick *on screen*
  // (so we need to compensate the SQRT zoom ratio):
  float pixelsThickness = max(normalLength, minThickness * u_sqrtZoomRatio);

  // Then, we need to retrieve the normalized thickness of the edge in the WebGL
  // referential (in a ([0, 1], [0, 1]) space), using our "magic" correction
  // ratio:
  float webGLThickness = pixelsThickness * u_correctionRatio;

  // Finally, we adapt the edge thickness to the "SQRT rule" in sigma (so that
  // items are not too big when zoomed in, and not too small when zoomed out).
  // The exact computation should be `adapted = value * zoom / sqrt(zoom)`, but
  // it's simpler like this:
  float adaptedWebGLThickness = webGLThickness * u_sqrtZoomRatio;

  // Here is the proper position of the vertex
  vec2 position = vec3(u_matrix * vec3(a_position + unitNormal * adaptedWebGLThickness, 1)).xy;
  gl_Position = vec4(position, 0, 1);
  vertexPos = vec3(position,0);
  startPos = vertexPos;

  // For the fragment shader though, we need a thickness that takes the "magic"
  // correction ratio into account (as in webGLThickness), but so that the
  // antialiasint effect does not depend on the zoom level. So here's yet
  // another thickness version:
  v_thickness = webGLThickness / u_sqrtZoomRatio;

  v_normal = unitNormal;
  v_color = a_color;
  v_color.a *= bias;
}