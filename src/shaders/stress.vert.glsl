#version 300 es

in vec3 position;
in vec3 normal;
in vec3 aStress;
in vec3 aShear;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;

out float vStress;
out vec3 vNormal;
out vec3 vPosition;

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
