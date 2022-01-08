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

vec3 min5(vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
    return min(a, min(b, min(c, min(d, e))));
}
vec3 max5(vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
    return max(a, max(b, max(c, max(d, e))));
}

vec3 flidelityFX_CAS(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));

    // pixel color
    vec3 col = texture(tex, coord).xyz;
    vec3 p0 = col;

    // CAS algorithm
    float max_g = col.y;
    float min_g = col.y;
    vec4 offset = vec4(1, 0, 1, -1) / texSize.xxyy;
    vec3 colw;
    vec3 col1 = texture(tex, coord + offset.yw).xyz;
    vec3 p1 = col1;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw = col1;
    col1 = texture(tex, coord + offset.xy).xyz;
    vec3 p2 = col1;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw += col1;
    col1 = texture(tex, coord + offset.yz).xyz;
    vec3 p3 = col1;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw += col1;
    col1 = texture(tex, coord - offset.xy).xyz;
    vec3 p4 = col1;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw += col1;
    float d_min_g = min_g;
    float d_max_g = 1.0 - max_g;
    float A;
    if (d_max_g < d_min_g) {
        A = d_max_g / max_g;
    } else {
        A = d_min_g / max_g;
    }
    A = -0.2 * max(sqrt(A), 0.0);

    vec3 color = (col + colw * A) / (1.+4.*A);
    vec3 min_sample = max5(p0, p1, p2, p3, p4);
    vec3 max_sample = min5(p0, p1, p2, p3, p4);

    vec3 aux = color;
	color = clamp(color, min_sample, max_sample);

	return mix(aux, color, 0.8);
}


@define GAMMA 1.11
void main() {
    // outColor = texture(u_image, v_texCoord);
    outColor = vec4(flidelityFX_CAS(u_image, v_texCoord), 1.0);

    // apply gamma correction
    // outColor.rgb = pow(outColor.rgb, vec3(1.0/GAMMA));
}
