"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const CX = 512;
const CY = 512;
const SHIELD_RADIUS = 180;

// Half-angle (radians) of the border arc that lights up where a node hits.
// Wider than the visible core so the gradient can feather out into the ring.
const IMPACT_ARC_HALF = 0.34;

const FLOATING_NODES = [
  { angle: 0.62, dist: 38, driftX: 18, driftY: -14, duration: 4.6 },
  { angle: 1.85, dist: 52, driftX: -22, driftY: 16, duration: 5.8 },
  { angle: 2.41, dist: 44, driftX: 12, driftY: 20, duration: 6.2 },
  { angle: 3.12, dist: 35, driftX: -16, driftY: -18, duration: 4.1 },
  { angle: 4.05, dist: 48, driftX: 24, driftY: 10, duration: 5.4 },
  { angle: 4.88, dist: 41, driftX: -10, driftY: 22, duration: 6.9 },
  { angle: 5.33, dist: 55, driftX: 14, driftY: -20, duration: 5.1 },
  { angle: 5.91, dist: 33, driftX: -20, driftY: 8, duration: 4.8 },
];

const CLEAN_NODES = [
  { angle: 0.35, dist: 118, driftX: 24, driftY: -18, duration: 9.2 },
  { angle: 1.42, dist: 132, driftX: -20, driftY: 22, duration: 10.5 },
  { angle: 2.68, dist: 125, driftX: 16, driftY: 26, duration: 11.1 },
  { angle: 3.94, dist: 140, driftX: -28, driftY: -12, duration: 8.8 },
  { angle: 5.21, dist: 129, driftX: 22, driftY: 14, duration: 10.2 },
];

const CORRUPT_NODES = [
  { angleOffset: 0.08, startDist: 448, delay: 0 },
  { angleOffset: -0.14, startDist: 462, delay: 1.5 },
  { angleOffset: 0.19, startDist: 435, delay: 3 },
  { angleOffset: -0.06, startDist: 455, delay: 4.5 },
  { angleOffset: 0.12, startDist: 441, delay: 6 },
  { angleOffset: -0.18, startDist: 468, delay: 7.5 },
];

function polar(angle: number, distance: number) {
  return {
    x: CX + Math.cos(angle) * distance,
    y: CY + Math.sin(angle) * distance,
  };
}

function borderArcPath(angle: number, radius: number, halfWidth: number) {
  const start = polar(angle - halfWidth, radius);
  const end = polar(angle + halfWidth, radius);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

/**
 * Layered "AI memory shield" hero background — SVG rings, nodes, and particles
 * with ambient purple blobs and a bottom fade for readable foreground copy.
 */
export function HeroBackground() {
  const floatingNodes = useMemo(
    () =>
      FLOATING_NODES.map((node, i) => {
        const start = polar(node.angle, node.dist);
        return {
          id: i,
          startX: start.x,
          startY: start.y,
          driftX: node.driftX,
          driftY: node.driftY,
          duration: node.duration,
        };
      }),
    [],
  );

  const cleanNodes = useMemo(
    () =>
      CLEAN_NODES.map((node, i) => {
        const base = polar(node.angle, node.dist);
        return {
          id: i,
          baseX: base.x,
          baseY: base.y,
          driftX: node.driftX,
          driftY: node.driftY,
          duration: node.duration,
        };
      }),
    [],
  );

  const corruptNodes = useMemo(
    () =>
      CORRUPT_NODES.map((node, i) => {
        const angle = (i / CORRUPT_NODES.length) * Math.PI * 2 + node.angleOffset;
        const start = polar(angle, node.startDist);
        const slow = polar(angle, 200);
        const pushBack = polar(angle, node.startDist + 100);
        const border = polar(angle, SHIELD_RADIUS);

        return {
          id: i,
          angle,
          delay: node.delay,
          startX: start.x,
          startY: start.y,
          slowX: slow.x,
          slowY: slow.y,
          pushBackX: pushBack.x,
          pushBackY: pushBack.y,
          borderX: border.x,
          borderY: border.y,
          impactPath: borderArcPath(angle, SHIELD_RADIUS, IMPACT_ARC_HALF),
        };
      }),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Layer 1 — dark canvas */}
      <div className="absolute inset-0 bg-black" />

      {/* Layers 2–6 — SVG memory shield scene */}
      <svg
        className="absolute inset-0 z-0 h-full w-full opacity-75"
        viewBox="0 0 1024 1024"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <radialGradient id="cleanGrad">
            <stop offset="0%" stopColor="rgba(167, 139, 250, 0.9)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0.6)" />
          </radialGradient>
          <radialGradient id="corruptGrad">
            <stop offset="0%" stopColor="rgba(255, 107, 107, 0.9)" />
            <stop offset="100%" stopColor="rgba(255, 59, 59, 0.7)" />
          </radialGradient>
          <filter id="cleanGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="corruptGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Soft white-core gradient per impact point — brightest where the
              node strikes, feathering to transparent so it blends into the ring */}
          {corruptNodes.map((node) => (
            <radialGradient
              key={`impact-grad-${node.id}`}
              id={`impactGrad-${node.id}`}
              gradientUnits="userSpaceOnUse"
              cx={node.borderX}
              cy={node.borderY}
              r={62}
            >
              <stop offset="0%" stopColor="rgba(255, 255, 255, 1)" />
              <stop offset="45%" stopColor="rgba(255, 255, 255, 0.55)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>
          ))}
        </defs>

        <g>
          {/* Layer 2 — outer shield ring */}
          <circle
            cx={CX}
            cy={CY}
            r={SHIELD_RADIUS}
            fill="none"
            stroke="rgba(139, 92, 246, 0.3)"
            strokeWidth="2.5"
            opacity="0.5"
          />

          {/* Layer 3 — pulsing memory core */}
          <motion.circle
            cx={CX}
            cy={CY}
            r="90"
            fill="url(#cleanGrad)"
            filter="url(#cleanGlow)"
            animate={{
              r: [90, 105, 90],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Layer 4 — floating memory particles inside core */}
          {floatingNodes.map((node) => (
            <motion.circle
              key={`floating-${node.id}`}
              cx={node.startX}
              cy={node.startY}
              r="3"
              fill="rgba(255, 255, 255, 0.6)"
              animate={{
                cx: [node.startX, node.startX + node.driftX, node.startX],
                cy: [node.startY, node.startY + node.driftY, node.startY],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{ duration: node.duration, repeat: Infinity }}
            />
          ))}

          {/* Layer 4 — orbiting clean nodes */}
          {cleanNodes.map((node) => (
            <motion.circle
              key={`clean-${node.id}`}
              cx={node.baseX}
              cy={node.baseY}
              r="5"
              fill="url(#cleanGrad)"
              filter="url(#cleanGlow)"
              animate={{
                cx: [node.baseX, node.baseX + node.driftX, node.baseX],
                cy: [node.baseY, node.baseY + node.driftY, node.baseY],
                r: [5, 8, 5],
              }}
              transition={{ duration: node.duration, repeat: Infinity }}
            />
          ))}
        </g>

        {/* Layers 5 & 6 — incoming red particles + border reaction */}
        {corruptNodes.map((node) => (
          <g key={`corrupt-${node.id}`}>
            {/* Border slice whitens where this node strikes — bright core at the
                impact point, gradient-feathered into the ring on either side */}
            <motion.path
              d={node.impactPath}
              fill="none"
              stroke={`url(#impactGrad-${node.id})`}
              strokeWidth="1"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 1, 0, 0] }}
              transition={{
                duration: 9,
                repeat: Infinity,
                delay: node.delay,
                times: [0, 0.32, 0.42, 0.58, 1],
                ease: "easeInOut",
              }}
            />

            <motion.circle
              cx={node.startX}
              cy={node.startY}
              r="7"
              fill="url(#corruptGrad)"
              filter="url(#corruptGlow)"
              animate={{
                cx: [node.startX, node.slowX, node.pushBackX, node.startX],
                cy: [node.startY, node.slowY, node.pushBackY, node.startY],
                opacity: [0, 0.7, 0.5, 0],
                r: [7, 8, 7, 7],
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                delay: node.delay,
                times: [0, 0.38, 0.62, 1],
                ease: "easeInOut",
              }}
            />
          </g>
        ))}
      </svg>

      {/* Layer 7 — slow ambient purple blobs */}
      <div className="absolute inset-0 z-[1] overflow-hidden">
        <motion.div
          animate={{ x: [0, 50, -50, 0], y: [0, -30, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-violet-500/25 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -50, 50, 0], y: [0, 30, -30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
        />
      </div>

      {/* Layer 8 — readability gradient + section blend */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/20 via-black/50 to-black" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black from-15% via-transparent to-transparent" />
    </div>
  );
}
