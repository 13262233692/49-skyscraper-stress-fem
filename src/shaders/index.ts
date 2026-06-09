export const stressVertexShader = `
attribute vec3 aStress;
attribute vec3 aShear;

varying float vStress;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    float sigmaXX = aStress.x;
    float sigmaYY = aStress.y;
    float sigmaZZ = aStress.z;
    float tauXY = aShear.x;
    float tauYZ = aShear.y;
    float tauXZ = aShear.z;

    float vonMises = sqrt(
        sigmaXX * sigmaXX +
        sigmaYY * sigmaYY +
        sigmaZZ * sigmaZZ -
        sigmaXX * sigmaYY -
        sigmaYY * sigmaZZ -
        sigmaZZ * sigmaXX +
        3.0 * (tauXY * tauXY + tauYZ * tauYZ + tauXZ * tauXZ)
    );

    vStress = clamp(vonMises, 0.0, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const stressFragmentShader = `
precision highp float;

varying float vStress;
varying vec3 vNormal;
varying vec3 vPosition;

uniform float uMinStress;
uniform float uMaxStress;
uniform int uColorMode;

vec3 stressColormap(float t) {
    vec3 c0 = vec3(0.0, 0.0, 0.55);
    vec3 c1 = vec3(0.0, 0.81, 0.82);
    vec3 c2 = vec3(0.0, 1.0, 0.5);
    vec3 c3 = vec3(1.0, 0.84, 0.0);
    vec3 c4 = vec3(1.0, 0.0, 0.25);

    if (t <= 0.25) {
        return mix(c0, c1, t / 0.25);
    } else if (t <= 0.5) {
        return mix(c1, c2, (t - 0.25) / 0.25);
    } else if (t <= 0.75) {
        return mix(c2, c3, (t - 0.5) / 0.25);
    } else {
        return mix(c3, c4, (t - 0.75) / 0.25);
    }
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(1.0, 1.5, 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float ambient = 0.35;
    float lighting = ambient + diff * 0.65;

    vec3 color;

    if (uColorMode == 0) {
        float range = uMaxStress - uMinStress;
        float mappedStress = range > 0.001 ? (vStress - uMinStress) / range : 0.0;
        mappedStress = clamp(mappedStress, 0.0, 1.0);
        color = stressColormap(mappedStress);
        color *= lighting;

        if (mappedStress > 0.85) {
            float glowIntensity = (mappedStress - 0.85) / 0.15;
            glowIntensity = glowIntensity * glowIntensity;
            vec3 glowColor = vec3(1.0, 0.15, 0.05);
            color += glowColor * glowIntensity * 0.6;
        }
    } else if (uColorMode == 1) {
        color = vec3(0.6) * lighting;
    } else {
        color = normal * 0.5 + 0.5;
        color *= lighting;
    }

    gl_FragColor = vec4(color, 1.0);
}
`;
