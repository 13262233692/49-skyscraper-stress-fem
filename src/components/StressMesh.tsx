import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { stressVertexShader, stressFragmentShader } from '@/shaders';

export function StressMesh() {
  const positions = useStore(s => s.positions);
  const indices = useStore(s => s.indices);
  const stressComponents = useStore(s => s.stressComponents);
  const renderMode = useStore(s => s.renderMode);
  const colorMode = useStore(s => s.colorMode);
  const stressRange = useStore(s => s.stressRange);
  const autoStressRange = useStore(s => s.autoStressRange);
  const stats = useStore(s => s.stats);

  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, maxAbsStress } = useMemo(() => {
    if (!positions || !indices || !stressComponents) {
      return { geometry: null, maxAbsStress: 1 };
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    const vertexCount = positions.length / 3;
    const stressArr = new Float32Array(vertexCount * 3);
    const shearArr = new Float32Array(vertexCount * 3);

    let maxAbs = 1e-10;
    for (let i = 0; i < stressComponents.length; i++) {
      const absVal = Math.abs(stressComponents[i]);
      if (absVal > maxAbs) maxAbs = absVal;
    }

    for (let i = 0; i < vertexCount; i++) {
      stressArr[i * 3]     = stressComponents[i * 6]     / maxAbs;
      stressArr[i * 3 + 1] = stressComponents[i * 6 + 1] / maxAbs;
      stressArr[i * 3 + 2] = stressComponents[i * 6 + 2] / maxAbs;
      shearArr[i * 3]      = stressComponents[i * 6 + 3] / maxAbs;
      shearArr[i * 3 + 1]  = stressComponents[i * 6 + 4] / maxAbs;
      shearArr[i * 3 + 2]  = stressComponents[i * 6 + 5] / maxAbs;
    }

    geo.setAttribute('aStress', new THREE.BufferAttribute(stressArr, 3));
    geo.setAttribute('aShear', new THREE.BufferAttribute(shearArr, 3));
    geo.computeVertexNormals();

    return { geometry: geo, maxAbsStress: maxAbs };
  }, [positions, indices, stressComponents]);

  const uniforms = useMemo(() => ({
    uMinStress: { value: 0.0 },
    uMaxStress: { value: 1.0 },
    uColorMode: { value: 0 },
  }), []);

  const safeMaxAbs = maxAbsStress || 1;

  const effectiveRange = useMemo(() => {
    if (autoStressRange && stats) {
      return {
        min: stats.minStress / safeMaxAbs,
        max: stats.maxStress / safeMaxAbs,
      };
    }
    return {
      min: stressRange[0] / safeMaxAbs,
      max: stressRange[1] / safeMaxAbs,
    };
  }, [autoStressRange, stats, stressRange, safeMaxAbs]);

  useEffect(() => {
    uniforms.uMinStress.value = effectiveRange.min;
    uniforms.uMaxStress.value = effectiveRange.max;
    uniforms.uColorMode.value = colorMode;
  }, [uniforms, effectiveRange, colorMode]);

  if (!geometry) return null;

  const showSolid = renderMode === 'solid' || renderMode === 'solid+wireframe';
  const showWireframe = renderMode === 'wireframe' || renderMode === 'solid+wireframe';

  return (
    <group>
      {showSolid && (
        <mesh geometry={geometry}>
          <shaderMaterial
            ref={materialRef}
            vertexShader={stressVertexShader}
            fragmentShader={stressFragmentShader}
            uniforms={uniforms}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {showWireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial wireframe color={0x00d4ff} opacity={0.15} transparent />
        </mesh>
      )}
    </group>
  );
}
