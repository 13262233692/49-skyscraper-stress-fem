import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { StressMesh } from './StressMesh';

export function Scene() {
  return (
    <Canvas
      camera={{ fov: 50, position: [80, 60, 200], near: 0.1, far: 5000 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0A0E1A']} />

      <ambientLight color={0x4466aa} intensity={0.6} />
      <directionalLight color={0xaaccff} intensity={1.0} position={[100, 200, 300]} />
      <directionalLight color={0x6688cc} intensity={0.5} position={[-50, 100, -50]} />

      <StressMesh />

      <gridHelper args={[400, 40, 0x1a2040, 0x0d1020]} position={[0, 0, 0]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={800}
        target={[10, 10, 150]}
      />

      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.7} luminanceSmoothing={0.025} />
      </EffectComposer>
    </Canvas>
  );
}
