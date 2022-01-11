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


vec4 lanczos(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));

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
    
    float sum = wedge.x + wedge.y + wedge.z + wedge.w + w12.x * w12.y;    
    wedge /= sum;

    return vec4(
        texture(tex, vec2(tc12.x, tc0.y)).rgb * wedge.y +
        texture(tex, vec2(tc0.x, tc12.y)).rgb * wedge.x +
        texture(tex, tc12.xy).rgb * (w12.x * w12.y / sum) +
        texture(tex, vec2(tc3.x, tc12.y)).rgb * wedge.z +
        texture(tex, vec2(tc12.x, tc3.y)).rgb * wedge.w,
        1.0
    );
}


void main() {
    // outColor = texture(u_image, v_texCoord);
    outColor = lanczos(u_image, v_texCoord);
}
