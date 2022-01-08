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


vec3 lanczos2(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));

    // vec2 step = 1.0 / texSize;

    /// Scale constants
    vec2 scale = 1. / texSize;

    // Source position in fractions of a texel
    vec2 src_pos = texSize * coord;
    // Source bottom left texel centre
    vec2 src_centre = floor(src_pos - .5) + .5;
    // f is position. f.x runs left to right, y bottom to top, z right to left, w top to bottom
    vec4 f; f.zw = 1. - (f.xy = src_pos - src_centre);
    // Calculate weights in x and y in parallel.
    // These polynomials are piecewise approximation of Lanczos kernel
    // Calculator here: https://gist.github.com/going-digital/752271db735a07da7617079482394543
    vec4 l2_w0_o3 = ((1.5672 * f - 2.6445) * f + 0.0837) * f + 0.9976;
    vec4 l2_w1_o3 = ((-0.7389 * f + 1.3652) * f - 0.6295) * f - 0.0004;

    vec4 w1_2 = l2_w0_o3;
    vec2 w12 = w1_2.xy + w1_2.zw;
    vec4 wedge = l2_w1_o3.xyzw * w12.yxyx;
    // Calculate texture read positions. tc12 uses bilinear interpolation to do 4 reads in 1.
    vec2 tc12 = scale.xy * (src_centre + w1_2.zw / w12);
    vec2 tc0 = scale.xy * (src_centre - 1.);
    vec2 tc3 = scale.xy * (src_centre + 2.);
    
    vec3 p0 = texture(tex, vec2(tc12.x, tc0.y)).rgb * wedge.y;
    vec3 p1 = texture(tex, vec2(tc0.x, tc12.y)).rgb * wedge.x;
    vec3 p2 = texture(tex, tc12.xy).rgb * (w12.x * w12.y);
    vec3 p3 = texture(tex, vec2(tc3.x, tc12.y)).rgb * wedge.z;
    vec3 p4 = texture(tex, vec2(tc12.x, tc3.y)).rgb * wedge.w;

    vec3 result = p0 + p1 + p2 + p3 + p4;
    return result;
    // vec3 max_p = max5(p0, p1, p2, p3, p4);
    // vec3 min_p = min5(p0, p1, p2, p3, p4);
    // return clamp(result, min_p, max_p);
}

vec3 flidelityFX_CAS(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));

    // pixel color
    vec3 col = lanczos2(tex, coord).xyz;

    // CAS algorithm
    float max_g = col.y;
    float min_g = col.y;
    vec4 offset = vec4(1, 0, 1, -1) / texSize.xxyy;
    vec3 colw;
    vec3 col1 = lanczos2(tex, coord + offset.yw).xyz;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw = col1;
    col1 = lanczos2(tex, coord + offset.xy).xyz;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw += col1;
    col1 = lanczos2(tex, coord + offset.yz).xyz;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw += col1;
    col1 = lanczos2(tex, coord - offset.xy).xyz;
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
    return (col + colw * A) / (1.+4.*A);
}


// @define GAMMA 1.11
void main() {
    // outColor = texture(u_image, v_texCoord);
    outColor = vec4(flidelityFX_CAS(u_image, v_texCoord), 1.0);

    // apply gamma correction
    // outColor.rgb = pow(outColor.rgb, vec3(1.0/GAMMA));
}
