// dithering.fragment.fx
precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float ditherScale;

// 4x4 Bayer matrix normalized to range [0, 1]
const mat4 bayerMatrix = mat4(
    0.0 / 16.0, 8.0 / 16.0, 2.0 / 16.0, 10.0 / 16.0,
    12.0 / 16.0, 4.0 / 16.0, 14.0 / 16.0, 6.0 / 16.0,
    3.0 / 16.0, 11.0 / 16.0, 1.0 / 16.0, 9.0 / 16.0,
    15.0 / 16.0, 7.0 / 16.0, 13.0 / 16.0, 5.0 / 16.0
);

void main() {
    vec4 color = texture2D(textureSampler, vUV);

    // Convert to grayscale
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Find position in dither matrix
    vec2 ditherPos = mod(ditherScale * vUV, 4.0);
    float ditherValue = bayerMatrix[int(ditherPos.x)][int(ditherPos.y)];

    // Apply dithering
    color.rgb = step(ditherValue, gray) * vec3(1.0);

    gl_FragColor = color;
}
