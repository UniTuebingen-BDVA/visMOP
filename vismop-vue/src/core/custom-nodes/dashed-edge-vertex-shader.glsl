#version 300 es
//based on sigma src code and https://stackoverflow.com/questions/52928678/dashed-line-in-opengl3/54543267 TODO LICENSE

in vec2 a_position;
in vec2 a_normal;
in float a_thickness;
in vec4 a_color;

uniform mat3 u_matrix;
uniform float u_scale;
uniform float u_cameraRatio;
uniform float u_viewportRatio;
uniform float u_thicknessRatio;

out vec4 v_color;
out vec2 v_normal;
out float v_thickness;

out vec3 vertexPos;
flat out vec3 startPos;

const float minThickness = 0.8;
const float bias = 255.0 / 254.0;


void main() {

  // Computing thickness in screen space:
  float thickness = a_thickness * u_thicknessRatio * u_scale * u_viewportRatio / 2.0;
  thickness = max(thickness, minThickness * u_viewportRatio);

  // Add normal vector to the position in screen space, but correct thickness first:
  vec2 position = (u_matrix * vec3(a_position + a_normal * thickness * u_cameraRatio, 1)).xy;

  gl_Position = vec4(position, 0, 1);
  vertexPos = vec3(position,0);
  startPos = vertexPos;

  v_normal = a_normal;
  v_thickness = thickness;

  // Extract the color:
  v_color = a_color;
  v_color.a *= bias;
}