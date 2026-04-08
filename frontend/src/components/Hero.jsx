import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Points, PointMaterial } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import * as random from 'three/src/math/MathUtils';

// Generate some random points for the globe to look like glowing particles
const generateParticles = (count) => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Generate points on a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = 2.0;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
};

const Globe = () => {
  const groupRef = useRef();
  const particles = generateParticles(3000);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
      groupRef.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere args={[1.98, 64, 64]}>
        <meshBasicMaterial color="#0a0a0a" transparent opacity={0.8} wireframe />
      </Sphere>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <PointMaterial transparent color="#ff4500" size={0.02} sizeAttenuation={true} depthWrite={false} />
      </points>
    </group>
  );
};

export default function Hero({ onStart }) {
  return (
    <div className="relative w-screen h-screen bg-dark-900 overflow-hidden flex items-center justify-center">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <Globe />
        </Canvas>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8 p-4 bg-fire-500/10 rounded-full border border-fire-500/20 shadow-[0_0_50px_rgba(255,69,0,0.3)]"
        >
          <Flame className="w-16 h-16 text-fire-500 animate-pulse" />
        </motion.div>
        
        <motion.h1 
          className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          FIRESIGHT <span className="text-fire-500">AI</span>
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl font-light"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Predictive Wildfire Intelligence & Resource Optimization Platform
        </motion.p>
        
        <motion.button
          onClick={onStart}
          className="group flex items-center gap-3 px-8 py-4 bg-fire-500 hover:bg-fire-400 text-white rounded-full font-bold text-lg transition-all shadow-[0_0_20px_rgba(255,69,0,0.4)] hover:shadow-[0_0_40px_rgba(255,69,0,0.6)]"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Initialize System Core
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>

      <div className="absolute bottom-10 text-xs text-gray-600 tracking-widest uppercase">
        Simulation Environment v2.4.1
      </div>
    </div>
  );
}
