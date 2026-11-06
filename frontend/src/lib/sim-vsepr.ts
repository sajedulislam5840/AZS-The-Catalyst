/** VSEPR molecular geometry: shapes, ideal angles and 3D direction vectors. Pure maths. */

export type Vec3 = readonly [number, number, number];

export interface Shape {
  bonded: number;
  lone: number;
  name: string;
  angles: string;
  example: string;
}

export const SHAPES: readonly Shape[] = [
  { bonded: 2, lone: 0, name: "Linear", angles: "180°", example: "CO₂" },
  { bonded: 3, lone: 0, name: "Trigonal planar", angles: "120°", example: "BF₃" },
  { bonded: 2, lone: 1, name: "Bent", angles: "slightly under 120°", example: "SO₂" },
  { bonded: 4, lone: 0, name: "Tetrahedral", angles: "109.5°", example: "CH₄" },
  { bonded: 3, lone: 1, name: "Trigonal pyramidal", angles: "about 107°", example: "NH₃" },
  { bonded: 2, lone: 2, name: "Bent", angles: "about 104.5°", example: "H₂O" },
  { bonded: 5, lone: 0, name: "Trigonal bipyramidal", angles: "90° and 120°", example: "PCl₅" },
  { bonded: 4, lone: 1, name: "Seesaw", angles: "under 90° and under 120°", example: "SF₄" },
  { bonded: 3, lone: 2, name: "T-shaped", angles: "under 90°", example: "ClF₃" },
  { bonded: 2, lone: 3, name: "Linear", angles: "180°", example: "XeF₂" },
  { bonded: 6, lone: 0, name: "Octahedral", angles: "90°", example: "SF₆" },
  { bonded: 5, lone: 1, name: "Square pyramidal", angles: "under 90°", example: "BrF₅" },
  { bonded: 4, lone: 2, name: "Square planar", angles: "90°", example: "XeF₄" },
];

export function shapeFor(bonded: number, lone: number): Shape | undefined {
  return SHAPES.find((s) => s.bonded === bonded && s.lone === lone);
}

/** Allowed lone-pair counts for a steric number (bonded + lone). */
export function validLonePairs(steric: number): number[] {
  return SHAPES.filter((s) => s.bonded + s.lone === steric).map((s) => s.lone);
}

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Unit vectors for the electron domains of a steric number (ideal geometry). */
export function domainVectors(steric: number): Vec3[] {
  const ring = (k: number): Vec3[] =>
    Array.from({ length: k }, (_, i) => [Math.cos((2 * Math.PI * i) / k), 0, Math.sin((2 * Math.PI * i) / k)] as Vec3);
  switch (steric) {
    case 2: return [[1, 0, 0], [-1, 0, 0]];
    case 3: return ring(3);
    case 4: return ([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]] as Vec3[]).map(norm);
    case 5: return [[0, 1, 0], [0, -1, 0], ...ring(3)]; // 2 axial, then 3 equatorial
    case 6: return [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    default: return [];
  }
}

/** Domain slots taken by lone pairs: equatorial first in a trigonal bipyramid, opposite sides in an octahedron. */
function lonePairSlots(steric: number, lone: number): number[] {
  if (steric === 5) return [2, 3, 4].slice(0, lone);
  if (steric === 6) return [1, 0].slice(0, lone);
  return Array.from({ length: lone }, (_, i) => steric - 1 - i);
}

export interface Domain {
  vec: Vec3;
  kind: "bond" | "lone";
}

export function domains(bonded: number, lone: number): Domain[] {
  const steric = bonded + lone;
  const lp = new Set(lonePairSlots(steric, lone));
  return domainVectors(steric).map((vec, i) => ({ vec, kind: lp.has(i) ? "lone" : "bond" }));
}

/** Quiz question for a round: the shape to name and four distinct answer options. */
export function quizQuestion(
  round: number,
  shuffle: <T>(items: readonly T[], seed: number) => T[],
): { shape: Shape; options: string[] } {
  const shape = shuffle(SHAPES, 17)[round % SHAPES.length];
  const others = [...new Set(SHAPES.map((s) => s.name))].filter((n) => n !== shape.name);
  const options = shuffle([shape.name, ...shuffle(others, round + 3).slice(0, 3)], round + 101);
  return { shape, options };
}
