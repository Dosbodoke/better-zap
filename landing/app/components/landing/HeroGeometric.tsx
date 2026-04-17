"use client";

import { useMemo, useRef, type SVGProps } from "react";
import { Canvas, type ThreeElements, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { GitHub as GitHubIcon } from "../icons/github";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// --- Shader Code ---
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
varying vec2 vUv;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float bayerDither4x4(vec2 uv) {
    int x = int(mod(uv.x, 4.0));
    int y = int(mod(uv.y, 4.0));

    int matrix[16];
    matrix[0] = 0; matrix[1] = 8; matrix[2] = 2; matrix[3] = 10;
    matrix[4] = 12; matrix[5] = 4; matrix[6] = 14; matrix[7] = 6;
    matrix[8] = 3; matrix[9] = 11; matrix[10] = 1; matrix[11] = 9;
    matrix[12] = 15; matrix[13] = 7; matrix[14] = 13; matrix[15] = 5;

    return float(matrix[y * 4 + x]) / 16.0;
}

void main() {
    vec2 uv = vUv;
    vec2 coord = gl_FragCoord.xy;

    float noise = snoise(uv * 1.5 + vec2(uTime * 0.05, uTime * 0.03)) * 0.25;
    float diagonal = (uv.x + uv.y) * 0.5;
    float gradient = diagonal * 1.2 + noise;

    vec3 deepBlue = uColor1;
    vec3 paleBlue = uColor2;
    vec3 softBlue = mix(deepBlue, paleBlue, 0.33);
    vec3 lightBlue = mix(deepBlue, paleBlue, 0.66);

    vec3 color;
    if (gradient < 0.3) {
        color = deepBlue;
    } else if (gradient < 0.55) {
        color = softBlue;
    } else if (gradient < 0.8) {
        color = lightBlue;
    } else {
        color = paleBlue;
    }

    float dither = bayerDither4x4(coord);
    float threshold = fract(gradient * 4.0);

    if (gradient < 0.3 && threshold > dither * 0.5) {
        color = softBlue;
    } else if (gradient >= 0.3 && gradient < 0.55 && threshold > dither * 0.5) {
        color = lightBlue;
    } else if (gradient >= 0.55 && gradient < 0.8 && threshold > dither * 0.5) {
        color = paleBlue;
    }

    vec2 cornerDist = vec2(uv.x, uv.y);
    float fadeMask = smoothstep(0.0, 0.25, length(cornerDist));
    color = mix(vec3(1.0), color, fadeMask);

    float vignette = smoothstep(1.2, 0.3, length(uv - 0.5));
    color = mix(color, color * 0.95, (1.0 - vignette) * 0.3);

    gl_FragColor = vec4(color, 1.0);
}
`;

const GradientPlane = ({
  color1,
  color2,
  speed = 1,
}: {
  color1: string;
  color2: string;
  speed?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1000, 1000) },
      uColor1: { value: new THREE.Color(color1) },
      uColor2: { value: new THREE.Color(color2) },
    }),
    [color1, color2],
  );

  useFrame((state) => {
    const { clock, size } = state;
    uniforms.uTime.value = clock.getElapsedTime() * speed;
    uniforms.uResolution.value.set(size.width, size.height);
    uniforms.uColor1.value.set(color1);
    uniforms.uColor2.value.set(color2);
  });

  return (
    <mesh ref={meshRef} scale={[2, 2, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
};

const WHATSAPP_WORD = "WhatsApp";

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="#25D366"
        d="M12 2.25a9.6 9.6 0 0 0-8.31 14.42L2.75 21.75l5.2-1.23A9.6 9.6 0 1 0 12 2.25Z"
      />
      <path
        fill="#fff"
        d="M8.37 7.12c.2-.45.4-.46.58-.46h.5c.16.01.38.06.58.48.22.5.74 1.78.8 1.91.07.13.1.29.02.46-.08.18-.12.29-.25.44-.12.15-.26.33-.37.44-.12.12-.25.26-.1.51.15.25.67 1.1 1.44 1.78.99.88 1.82 1.15 2.07 1.28.25.12.4.1.55-.06.15-.17.63-.74.8-.99.17-.25.33-.2.56-.12.23.08 1.46.69 1.71.81.25.13.42.19.48.29.06.1.06.59-.14 1.16-.21.57-1.18 1.09-1.65 1.13-.43.04-.98.06-1.58-.1-.37-.1-.84-.27-1.44-.53-2.54-1.1-4.2-3.65-4.33-3.82-.13-.17-1.03-1.37-1.03-2.61 0-1.25.65-1.86.88-2.11Z"
      />
    </svg>
  );
}

function WhatsAppWordChip({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  return (
    <motion.span
      initial={
        reduceMotion ? false : { opacity: 0, scale: 0.82, rotate: -8, y: 12 }
      }
      animate={{ opacity: 1, scale: 1, rotate: -3, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              type: "spring",
              stiffness: 520,
              damping: 24,
              mass: 0.65,
              delay: 0.48,
            }
      }
      className="inline-flex origin-center transform-gpu items-center gap-[0.18em] rounded-lg bg-white px-[0.38em] py-[0.2em] align-middle font-sans text-[0.72em] font-extrabold not-italic leading-none tracking-tight text-[#128C4A] shadow-[7px_7px_0_rgba(37,211,102,0.18),0_18px_34px_rgba(19,19,19,0.16),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-emerald-950/10 will-change-transform"
      style={{ transformOrigin: "center center" }}
    >
      <WhatsAppIcon className="size-[0.74em] shrink-0" />
      <span>WhatsApp</span>
    </motion.span>
  );
}

function HighlightedWhatsAppLine({
  text,
  reduceMotion,
}: {
  text: string;
  reduceMotion: boolean;
}) {
  const wordIndex = text.indexOf(WHATSAPP_WORD);

  if (wordIndex === -1) {
    return <>{text}</>;
  }

  const beforeWord = text.slice(0, wordIndex).trim();
  const afterWord = text.slice(wordIndex + WHATSAPP_WORD.length).trim();

  return (
    <>
      {beforeWord ? <span className="whitespace-nowrap">{beforeWord}</span> : null}
      <WhatsAppWordChip reduceMotion={reduceMotion} />
      {afterWord ? <span className="whitespace-nowrap">{afterWord}</span> : null}
    </>
  );
}

// --- Main Component ---

export default function HeroGeometric() {
  const t = useTranslations("heroMain");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-white text-black">
      {/* Background Shader */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 1] }}
          dpr={[1, 1]}
          gl={{
            antialias: false,
            alpha: true,
          }}
        >
          <GradientPlane color1="#25D366" color2="#E8FFF0" speed={1} />
        </Canvas>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center lg:justify-start px-6 py-12 md:py-0 lg:pt-[20vh]">
        <div className="flex flex-col items-center text-center gap-2 md:gap-4 mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-x-[0.22em] gap-y-3 text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter font-serif italic font-light text-[#1a1a1a]"
          >
            <HighlightedWhatsAppLine
              text={t("line1")}
              reduceMotion={Boolean(reduceMotion)}
            />
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
            className="text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter font-bold text-black"
          >
            {t("line2")}
          </motion.h1>
        </div>

        <div className="max-w-[400px] text-center mb-8">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="text-base md:text-lg leading-relaxed text-neutral-600 font-normal"
          >
            {t("description")}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          className="flex gap-4"
        >
          <a
            href={`/${locale}/docs/getting-started`}
            className="rounded-lg bg-[#131313] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#333]"
          >
            {t("getStarted")}
          </a>
          <a
            href="https://github.com/Dosbodoke/better-zap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-[#131313] transition-colors hover:bg-neutral-100"
          >
            <GitHubIcon className="h-4 w-4" />
            GitHub
          </a>
        </motion.div>
      </div>
    </div>
  );
}
