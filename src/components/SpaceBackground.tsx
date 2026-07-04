import React from 'react';
import { motion } from 'motion/react';

export default function SpaceBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,27,75,0.4)_0%,transparent_80%)]" />
      {[...Array(50)].map((_, i) => {
        const size = Math.random() * 2 + 1;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
            style={{
              width: size,
              height: size,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.1, 0.8, 0.1],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: Math.random() * 4 + 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2
            }}
          />
        );
      })}
    </div>
  );
}
