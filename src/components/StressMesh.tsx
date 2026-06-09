import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { stressVertexShader, stressFragmentShader } from '@/shaders';

const SAB_FLAG_READY = 2;
const BUILDING_HEIGHT = 300;
const BASE_SWAY = 0.3;
const RESONANCE_AMP_SCALE = 50;

export function StressMesh() {
  const positions = useStore(s => s.positions);
  const indices = useStore(s => s.indices);
  const stressSAB = useStore(s => s.stressSAB);
  const flagSAB = useStore(s => s.flagSAB);
  const stressComponents = useStore(s => s.stressComponents);
  const surfaceVertexCount = useStore(s => s.surfaceVertexCount);
  const stressVersion = useStore(s => s.stressVersion);
  const renderMode = useStore(s => s.renderMode);
  const colorMode = useStore(s => s.colorMode);
  const stressRange = useStore(s => s.stressRange);
  const autoStressRange = useStore(s => s.autoStressRange);
  const stats = useStore(s => s.stats);
  const turbulenceFreq = useStore(s => s.turbulenceFreq);
  const swayAmplitude = useStore(s => s.swayAmplitude);

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const aStressAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const aShearAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const maxAbsStressRef = useRef(1);
  const elapsedTimeRef = useRef(0);
  const useSAB = !!stressSAB;

  const getStressView = useMemo(() => {
    return () => {
      if (stressSAB) return new Float32Array(stressSAB);
      if (stressComponents) return stressComponents;
      return null;
    };
  }, [stressSAB, stressComponents]);

  const geometry = useMemo(() => {
    if (!positions || !indices || surfaceVertexCount === 0) {
      return null;
    }

    const stressView = getStressView();
    if (!stressView) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    let maxAbs = 1e-10;
    for (let i = 0; i < stressView.length; i++) {
      const absVal = Math.abs(stressView[i]);
      if (absVal > maxAbs) maxAbs = absVal;
    }
    maxAbsStressRef.current = maxAbs;

    const vertexCount = surfaceVertexCount;
    const stressArr = new Float32Array(vertexCount * 3);
    const shearArr = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      stressArr[i * 3]     = stressView[i * 6]     / maxAbs;
      stressArr[i * 3 + 1] = stressView[i * 6 + 1] / maxAbs;
      stressArr[i * 3 + 2] = stressView[i * 6 + 2] / maxAbs;
      shearArr[i * 3]      = stressView[i * 6 + 3] / maxAbs;
      shearArr[i * 3 + 1]  = stressView[i * 6 + 4] / maxAbs;
      shearArr[i * 3 + 2]  = stressView[i * 6 + 5] / maxAbs;
    }

    const aStressAttr = new THREE.BufferAttribute(stressArr, 3);
    const aShearAttr = new THREE.BufferAttribute(shearArr, 3);
    geo.setAttribute('aStress', aStressAttr);
    geo.setAttribute('aShear', aShearAttr);
    geo.computeVertexNormals();

    aStressAttrRef.current = aStressAttr;
    aShearAttrRef.current = aShearAttr;

    return geo;
  }, [positions, indices, stressSAB, stressComponents, surfaceVertexCount]);

  const uniforms = useMemo(() => ({
    uMinStress: { value: 0.0 },
    uMaxStress: { value: 1.0 },
    uColorMode: { value: 0 },
    uTime: { value: 0.0 },
    uSwayAmplitude: { value: 0.0 },
    uTurbFreq: { value: 0.10 },
    uBuildingHeight: { value: BUILDING_HEIGHT },
  }), []);

  useFrame((_, delta) => {
    elapsedTimeRef.current += delta;
    uniforms.uTime.value = elapsedTimeRef.current;
    uniforms.uSwayAmplitude.value = swayAmplitude;
    uniforms.uTurbFreq.value = turbulenceFreq;

    if (!geometry || !aStressAttrRef.current || !aShearAttrRef.current) return;

    const stressView = getStressView();
    if (!stressView) return;

    if (useSAB && flagSAB) {
      const flagView = new Int32Array(flagSAB);
      const flag = Atomics.load(flagView, 0);
      if (flag !== SAB_FLAG_READY) return;
      Atomics.store(flagView, 0, 0);
    }

    let newMaxAbs = 1e-10;
    for (let i = 0; i < stressView.length; i++) {
      const absVal = Math.abs(stressView[i]);
      if (absVal > newMaxAbs) newMaxAbs = absVal;
    }
    maxAbsStressRef.current = newMaxAbs;

    const vertexCount = surfaceVertexCount;
    const stressAttr = aStressAttrRef.current;
    const shearAttr = aShearAttrRef.current;
    const stressArr = stressAttr.array as Float32Array;
    const shearArr = shearAttr.array as Float32Array;

    for (let i = 0; i < vertexCount; i++) {
      stressArr[i * 3]     = stressView[i * 6]     / newMaxAbs;
      stressArr[i * 3 + 1] = stressView[i * 6 + 1] / newMaxAbs;
      stressArr[i * 3 + 2] = stressView[i * 6 + 2] / newMaxAbs;
      shearArr[i * 3]      = stressView[i * 6 + 3] / newMaxAbs;
      shearArr[i * 3 + 1]  = stressView[i * 6 + 4] / newMaxAbs;
      shearArr[i * 3 + 2]  = stressView[i * 6 + 5] / newMaxAbs;
    }

    stressAttr.needsUpdate = true;
    shearAttr.needsUpdate = true;
  });

  const effectiveRange = useMemo(() => {
    const maxAbs = maxAbsStressRef.current || 1;
    if (autoStressRange && stats) {
      return {
        min: stats.minStress / maxAbs,
        max: stats.maxStress / maxAbs,
      };
    }
    return {
      min: stressRange[0] / maxAbs,
      max: stressRange[1] / maxAbs,
    };
  }, [autoStressRange, stats, stressRange, stressVersion]);

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
