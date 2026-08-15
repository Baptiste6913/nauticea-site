"use client";

import { useEffect, useRef, useState } from "react";
import {
  TAILLE_GRILLE_X,
  TAILLE_GRILLE_Y,
  grilleDepuisGraine,
} from "@/lib/da/champ";

// Scène du hero : le champ d'isobathes de lib/da/champ.ts rendu en
// relief par un fragment shader WebGL2 écrit à la main (zéro
// dépendance). Même grille de bruit et mêmes seuils que le SVG poster :
// au repos, les courbes coïncident ; la dérive est une respiration
// lente (période ~30 s). Garde-fous : DPR plafonné à 1,5, 30 fps,
// pause hors viewport et onglet caché, démontage sur perte de contexte
// (le poster SVG reste seul, complet).

const SOMMET = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
out vec4 sortie;
uniform sampler2D u_grille;
uniform vec2 u_taille;
uniform float u_temps;

const vec3 ABYSSE = vec3(0.024, 0.059, 0.149);
const vec3 MARINE = vec3(0.055, 0.102, 0.235);
const vec3 AZUR = vec3(0.208, 0.659, 0.878);
const vec3 RASE = vec3(0.914, 0.741, 0.416);
const float GX = ${TAILLE_GRILLE_X}.0;
const float GY = ${TAILLE_GRILLE_Y}.0;

float lisse(float t) { return t * t * (3.0 - 2.0 * t); }

float bruit(vec2 c) {
  c = clamp(c, vec2(0.0), vec2(GX - 1.001, GY - 1.001));
  vec2 i = floor(c);
  vec2 f = vec2(lisse(fract(c).x), lisse(fract(c).y));
  float hg = texelFetch(u_grille, ivec2(i), 0).r;
  float hd = texelFetch(u_grille, ivec2(min(i.x + 1.0, GX - 1.0), i.y), 0).r;
  float bg = texelFetch(u_grille, ivec2(i.x, min(i.y + 1.0, GY - 1.0)), 0).r;
  float bd = texelFetch(u_grille, ivec2(min(i.x + 1.0, GX - 1.0), min(i.y + 1.0, GY - 1.0)), 0).r;
  return mix(mix(hg, hd, f.x), mix(bg, bd, f.x), f.y);
}

float profondeur(vec2 uv) {
  float o1 = bruit(vec2(uv.x * (GX - 1.0), uv.y * (GY - 1.0)));
  float o2 = bruit(vec2(mod(uv.x * 2.0 * (GX - 1.0), GX - 1.0),
                        mod(uv.y * 2.0 * (GY - 1.0), GY - 1.0))) * 0.35;
  return (o1 + o2) / 1.35 * 0.72 + uv.y * 0.28;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_taille;
  uv.y = 1.0 - uv.y;
  // Respiration lente : nulle a t=0, periode ~30 s.
  vec2 derive = vec2(sin(u_temps * 0.2094), cos(u_temps * 0.1571) - 1.0) * 0.006;
  float h = profondeur(uv + derive);

  // Fond : du sombre profond vers marine selon la profondeur.
  vec3 couleur = mix(ABYSSE, MARINE, h * 0.9);

  // Relief : pente locale eclairee en lumiere rasante, plate, sans halo.
  vec2 grad = vec2(dFdx(h), dFdy(h)) * u_taille;
  float rasant = clamp(dot(normalize(vec2(-0.6, 0.8)), -grad) * 0.004, -0.12, 0.18);
  couleur += rasant * mix(vec3(0.10, 0.16, 0.30), RASE, 0.35);

  // Isobathes : les six seuils du generateur SVG.
  float aa = fwidth(h) * 1.6;
  float lignes = 0.0;
  for (int i = 0; i < 6; i += 1) {
    float seuil = 0.3 + float(i) * 0.1;
    float d = abs(h - seuil);
    lignes += (1.0 - smoothstep(0.0, aa, d)) * (0.16 + 0.03 * float(i));
  }
  couleur = mix(couleur, AZUR, clamp(lignes, 0.0, 0.34));

  sortie = vec4(couleur, 1.0);
}`;

export default function ReliefRadeScene({ graine }: { graine: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      return;
    }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const programme = gl.createProgram()!;
    gl.attachShader(programme, compile(gl.VERTEX_SHADER, SOMMET));
    gl.attachShader(programme, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(programme);
    if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) {
      return;
    }
    gl.useProgram(programme);

    const grille = grilleDepuisGraine(graine);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      TAILLE_GRILLE_X,
      TAILLE_GRILLE_Y,
      0,
      gl.RED,
      gl.FLOAT,
      grille
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const uTaille = gl.getUniformLocation(programme, "u_taille");
    const uTemps = gl.getUniformLocation(programme, "u_temps");

    let rafId = 0;
    let enVue = true;
    let precedent = 0;
    const debut = performance.now();

    const dimensionne = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const largeur = Math.round(canvas.clientWidth * dpr);
      const hauteur = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== largeur || canvas.height !== hauteur) {
        canvas.width = largeur;
        canvas.height = hauteur;
        gl.viewport(0, 0, largeur, hauteur);
      }
    };

    const rendu = (t: number) => {
      rafId = requestAnimationFrame(rendu);
      if (!enVue || document.hidden) {
        return;
      }
      if (t - precedent < 33) {
        return;
      }
      precedent = t;
      dimensionne();
      gl.uniform2f(uTaille, canvas.width, canvas.height);
      gl.uniform1f(uTemps, (t - debut) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    rafId = requestAnimationFrame(rendu);
    setVisible(true);

    const observateur = new IntersectionObserver((entrees) => {
      enVue = entrees[0]?.isIntersecting ?? true;
    });
    observateur.observe(canvas);

    const surPerte = (e: Event) => {
      e.preventDefault();
      setVisible(false);
      cancelAnimationFrame(rafId);
    };
    canvas.addEventListener("webglcontextlost", surPerte);

    return () => {
      cancelAnimationFrame(rafId);
      observateur.disconnect();
      canvas.removeEventListener("webglcontextlost", surPerte);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [graine]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
