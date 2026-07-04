import React from 'react';
import { motion } from 'motion/react';

export default function MatrixBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-black">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.8)_0%,rgba(0,20,0,0.9)_100%)]" />
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-green-500/20 font-mono text-xs overflow-hidden break-all whitespace-pre-wrap"
          style={{
            left: `${i * 5}%`,
            width: '20px',
            top: '-100%',
          }}
          animate={{
            top: ['-100%', '100%']
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5
          }}
        >
          {Array.from({ length: 50 }).map(() => String.fromCharCode(0x30A0 + Math.random() * 96)).join('\n')}
        </motion.div>
      ))}
    </div>
  );
}
