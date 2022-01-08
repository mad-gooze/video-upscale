#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// our texture
uniform sampler2D u_image;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

// Window Sinc Param.
// Possible values: 0.5 0.0 1.0 0.01
const float LANCZOS2_WINDOW_SINC = 0.5;

// Anti-ringing Strength.
// Possible values: 0.8 0.0 1.0 0.1
const float LANCZOS2_SINC = 1.0;

// Sinc Param.
// Possible values: 1.0 0.0 1.0 0.01
const float LANCZOS2_AR_STRENGTH = 0.8;


/*
	This is an approximation of Jinc(x)*Jinc(x*r1/r2) for x < 2.5,
	where r1 and r2 are the first two zeros of jinc function.
	For a jinc 2-lobe best approximation, use A=0.5 and B=0.825.
*/

// A=0.5, B=0.825 is the best jinc approximation for x<2.5. if B=1.0, it's a lanczos filter.
// Increase A to get more blur. Decrease it to get a sharper picture.
// B = 0.825 to get rid of dithering. Increase B to get a fine sharpness, though dithering returns.

const float halfpi = 1.5707963267948966192313216916398;
const float pi = 3.1415926535897932384626433832795;
const float wa = LANCZOS2_WINDOW_SINC * pi;
const float wb = LANCZOS2_SINC * pi;

// Calculates the distance between two points
float d(vec2 pt1, vec2 pt2) {
	vec2 v = pt2 - pt1;
	return sqrt(v.x * v.x + v.y * v.y);
}

vec3 min4(vec3 a, vec3 b, vec3 c, vec3 d) {
    return min(a, min(b, min(c, d)));
}
vec3 max4(vec3 a, vec3 b, vec3 c, vec3 d) {
    return max(a, max(b, max(c, d)));
}

vec4 weight(vec4 x) {
	vec4 res;

	res = (x == vec4(0.0, 0.0, 0.0, 0.0)) ? vec4(wa * wb) : sin(x * wa) * sin(x * wb) / (x * x);

	return res;
}

vec3 lanczos2(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));
    
    vec3 color;
	mat4 weights;

	vec2 dx = vec2(1.0, 0.0);
	vec2 dy = vec2(0.0, 1.0);

	vec2 pc = coord * texSize;

	vec2 tc = (floor(pc-vec2(0.5,0.5))+vec2(0.5,0.5));

	weights[0] = weight(vec4(d(pc, tc -dx -dy), d(pc, tc -dy), d(pc, tc + dx -dy), d(pc, tc + 2.0 * dx -dy)));
	weights[1] = weight(vec4(d(pc, tc -dx), d(pc, tc), d(pc, tc + dx), d(pc, tc + 2.0 * dx)));
	weights[2] = weight(vec4(d(pc, tc -dx + dy), d(pc, tc + dy), d(pc, tc + dx + dy), d(pc, tc + 2.0 * dx + dy)));
	weights[3] = weight(vec4(d(pc, tc -dx + 2.0 * dy), d(pc, tc + 2.0 * dy), d(pc, tc + dx + 2.0 *dy), d(pc, tc + 2.0 * dx + 2.0 * dy)));

	dx = dx / texSize;
	dy = dy / texSize;
	tc = tc / texSize;

	// reading the texels

	vec3 c00 = texture(tex, tc - dx - dy).xyz;
	vec3 c10 = texture(tex, tc - dy).xyz;
	vec3 c20 = texture(tex, tc + dx - dy).xyz;
	vec3 c30 = texture(tex, tc + 2.0 * dx - dy).xyz;
	vec3 c01 = texture(tex, tc - dx).xyz;
	vec3 c11 = texture(tex, tc).xyz;
	vec3 c21 = texture(tex, tc + dx).xyz;
	vec3 c31 = texture(tex, tc + 2.0 * dx).xyz;
	vec3 c02 = texture(tex, tc - dx + dy).xyz;
	vec3 c12 = texture(tex, tc + dy).xyz;
	vec3 c22 = texture(tex, tc + dx + dy).xyz;
	vec3 c32 = texture(tex, tc + 2.0 * dx + dy).xyz;
	vec3 c03 = texture(tex, tc - dx + 2.0 * dy).xyz;
	vec3 c13 = texture(tex, tc + 2.0 * dy).xyz;
	vec3 c23 = texture(tex, tc + dx + 2.0 * dy).xyz;
	vec3 c33 = texture(tex, tc + 2.0 * dx + 2.0 * dy).xyz;

	//  Get min/max samples
	vec3 min_sample = min4(c11, c21, c12, c22);
	vec3 max_sample = max4(c11, c21, c12, c22);

	color = mat4x3(c00, c10, c20, c30) * weights[0];
	color += mat4x3(c01, c11, c21, c31) * weights[1];
	color += mat4x3(c02, c12, c22, c32) * weights[2];
	color += mat4x3(c03, c13, c23, c33) * weights[3];
	color = color / (dot(weights * vec4(1, 1, 1, 1), vec4(1, 1, 1, 1)));

	// Anti-ringing
	vec3 aux = color;
	color = clamp(color, min_sample, max_sample);

	return mix(aux, color, LANCZOS2_AR_STRENGTH);
}

// @define GAMMA 1.11
void main() {
    // outColor = texture(u_image, v_texCoord);
    outColor = vec4(lanczos2(u_image, v_texCoord), 1.0);

    // apply gamma correction
    // outColor.rgb = pow(outColor.rgb, vec3(1.0/GAMMA));
}


