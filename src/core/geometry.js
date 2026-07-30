/**
 * Geometry primitives, built to real construction logic.
 *
 * Workflow Stage 4: "Chamfer or fillet every visible edge at 1–2mm; sharp
 * zero-radius edges are the single loudest tell of amateur CG." Everything a
 * visitor can get close to is built with chamferBox or a moulded profile.
 */

import * as THREE from 'three';

const DEFAULT_CHAMFER = 0.0015; // 1.5mm

/**
 * A box with all twelve edges chamfered.
 *
 * Built as a rounded-rectangle extrusion with a bevelled cap: the shape corners
 * chamfer the four long edges, the bevel chamfers the eight end edges.
 * Extruded along +Z then re-oriented so `d` is the Z dimension.
 */
export function chamferBox(w, h, d, chamfer = DEFAULT_CHAMFER) {
  const c = Math.min(chamfer, w / 4, h / 4, d / 4);
  const shape = new THREE.Shape();
  const x = w / 2 - c;
  const y = h / 2 - c;
  shape.moveTo(-x - c, -y);
  shape.lineTo(-x - c, y);
  shape.lineTo(-x, y + c);
  shape.lineTo(x, y + c);
  shape.lineTo(x + c, y);
  shape.lineTo(x + c, -y);
  shape.lineTo(x, -y - c);
  shape.lineTo(-x, -y - c);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - 2 * c,
    bevelEnabled: true,
    bevelThickness: c,
    bevelSize: c,
    bevelOffset: 0,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, -(d - 2 * c) / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Cached chamfered boxes — a shop full of shelves reuses the same geometry. */
const _boxCache = new Map();
export function box(w, h, d, chamfer = DEFAULT_CHAMFER) {
  const key = `${w.toFixed(4)}:${h.toFixed(4)}:${d.toFixed(4)}:${chamfer}`;
  let g = _boxCache.get(key);
  if (!g) {
    g = chamferBox(w, h, d, chamfer);
    _boxCache.set(key, g);
  }
  return g;
}

/** Convenience: chamfered box mesh positioned by centre. */
export function slab(w, h, d, material, x = 0, y = 0, z = 0, chamfer = DEFAULT_CHAMFER) {
  const m = new THREE.Mesh(box(w, h, d, chamfer), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Extrude a 2D profile along the X axis — cornices, architraves, skirtings,
 * counter nosings, shelf edges. `profile` is [[y, z], ...] in metres, drawn in
 * section looking down the run.
 */
export function mouldingAlongX(profile, length) {
  const shape = new THREE.Shape();
  profile.forEach(([y, z], i) => (i === 0 ? shape.moveTo(y, z) : shape.lineTo(y, z)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.0012,
    bevelSegments: 1,
    curveSegments: 4,
  });
  // shape lives in XY, extrudes along Z: rotate so the run follows world X
  geo.rotateY(Math.PI / 2);
  geo.translate(-length / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Same profile, run along the Z axis (for side walls). */
export function mouldingAlongZ(profile, length) {
  const shape = new THREE.Shape();
  profile.forEach(([y, x], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.0012,
    bevelSegments: 1,
    curveSegments: 4,
  });
  geo.translate(0, 0, -length / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Classical cornice profile — cyma recta over a fillet over a bed mould.
 * Returned in [y, z] pairs, origin at the wall face, projecting +Z.
 */
export function corniceProfile(height = 0.16, projection = 0.14) {
  const h = height;
  const p = projection;
  return [
    [0, 0],
    [0, p * 0.18],
    [h * 0.14, p * 0.2],
    [h * 0.2, p * 0.34],
    [h * 0.3, p * 0.4],
    [h * 0.42, p * 0.62],
    [h * 0.56, p * 0.8],
    [h * 0.68, p * 0.9],
    [h * 0.78, p * 1.0],
    [h * 0.86, p * 1.0],
    [h * 0.9, p * 0.9],
    [h, p * 0.86],
    [h, 0],
  ];
}

/** Skirting / plinth profile — square with a small ogee top. */
export function skirtingProfile(height = 0.14, projection = 0.022) {
  const h = height;
  const p = projection;
  return [
    [0, 0],
    [0, p],
    [h * 0.7, p],
    [h * 0.8, p * 0.75],
    [h * 0.9, p * 0.6],
    [h, p * 0.35],
    [h, 0],
  ];
}

/** A fluted pilaster: chamfered pier with N half-round flutes cut as reveals. */
export function flutedPilaster({
  width = 0.22,
  depth = 0.09,
  height = 3.4,
  flutes = 3,
  materials,
}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(box(width, height, depth, 0.002), materials.joinery);
  body.position.y = height / 2;
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  // Flutes read as shadow lines; modelled as recessed half-cylinders so they
  // catch the low street light properly.
  const fluteR = (width * 0.62) / (flutes * 2);
  const fluteH = height * 0.86;
  const fluteGeo = new THREE.CylinderGeometry(fluteR, fluteR, fluteH, 10, 1, false, 0, Math.PI);
  for (let i = 0; i < flutes; i++) {
    const t = (i + 0.5) / flutes - 0.5;
    const f = new THREE.Mesh(fluteGeo, materials.joineryDark);
    f.position.set(t * width * 0.66, height * 0.5 - height * 0.02, depth / 2 - fluteR * 0.25);
    f.rotation.y = Math.PI; // open side into the pier
    f.castShadow = false;
    f.receiveShadow = true;
    g.add(f);
  }

  // Base plinth and a simple capital.
  const plinth = new THREE.Mesh(box(width * 1.16, 0.2, depth * 1.3, 0.002), materials.joineryDark);
  plinth.position.set(0, 0.1, depth * 0.15);
  g.add(plinth);
  const cap = new THREE.Mesh(box(width * 1.2, 0.05, depth * 1.4, 0.002), materials.joinery);
  cap.position.set(0, height - 0.025, depth * 0.2);
  g.add(cap);
  return g;
}

/**
 * A panelled door or panelled joinery face: stiles, rails, and recessed panels
 * with a mitred bead. `panels` is rows of [count] per row, top to bottom.
 */
export function panelledPanel({
  width,
  height,
  thickness = 0.045,
  rows = 2,
  cols = 1,
  stile = 0.105,
  material,
  panelMaterial,
  beadMaterial,
}) {
  const g = new THREE.Group();
  const carcass = new THREE.Mesh(box(width, height, thickness, 0.002), material);
  carcass.position.z = 0;
  carcass.castShadow = carcass.receiveShadow = true;
  g.add(carcass);

  const innerW = width - stile * 2;
  const innerH = height - stile * 2;
  const gap = stile * 0.8;
  const pw = (innerW - gap * (cols - 1)) / cols;
  const ph = (innerH - gap * (rows - 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = -innerW / 2 + pw / 2 + c * (pw + gap);
      const py = innerH / 2 - ph / 2 - r * (ph + gap);
      // recessed field
      const field = new THREE.Mesh(box(pw, ph, thickness * 0.45, 0.0015), panelMaterial || material);
      field.position.set(px, py, -thickness * 0.22);
      field.receiveShadow = true;
      g.add(field);
      // mitred bead around the opening, four runs
      const bead = 0.014;
      const beadMat = beadMaterial || material;
      const h1 = new THREE.Mesh(box(pw + bead * 2, bead, bead, 0.001), beadMat);
      h1.position.set(px, py + ph / 2 + bead / 2, thickness / 2 - bead / 2);
      const h2 = h1.clone();
      h2.position.y = py - ph / 2 - bead / 2;
      const v1 = new THREE.Mesh(box(bead, ph, bead, 0.001), beadMat);
      v1.position.set(px - pw / 2 - bead / 2, py, thickness / 2 - bead / 2);
      const v2 = v1.clone();
      v2.position.x = px + pw / 2 + bead / 2;
      [h1, h2, v1, v2].forEach((m) => {
        m.castShadow = true;
        g.add(m);
      });
    }
  }
  return g;
}

/**
 * Lathe a turned vessel from a silhouette. `profile` is [[radius, y], ...]
 * bottom to top, in metres. Used for every jar, cup, pot, carafe and urn.
 */
export function turned(profile, segments = 28) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0004, r), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

/** Rounded-end capsule for handles, rails, stretchers. */
export function rail(radius, length, axis = 'x', segments = 12) {
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.0001, length - radius * 2), 4, segments);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return geo;
}

/** A torus-section curve for bentwood — stool hoops, chair backs. */
export function bentTube(radius, tubeR, arc, segments = 24) {
  return new THREE.TorusGeometry(radius, tubeR, 7, segments, arc);
}

/**
 * Parquet floor: staggered oak blocks laid in a herringbone-ish running bond.
 * Built as one merged mesh via instancing to keep the draw count down.
 */
export function parquet({ width, depth, material, blockW = 0.075, blockL = 0.42, y = 0.001 }) {
  const rows = Math.ceil(depth / blockW);
  const perRow = Math.ceil(width / blockL) + 1;
  const geo = box(blockL * 0.985, 0.012, blockW * 0.985, 0.0008);
  const mesh = new THREE.InstancedMesh(geo, material, rows * perRow);
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const stagger = (r % 3) * (blockL / 3);
    for (let c = 0; c < perRow; c++) {
      const x = -width / 2 + c * blockL + stagger - blockL / 2;
      const z = -depth / 2 + r * blockW + blockW / 2;
      if (x - blockL / 2 > width / 2) continue;
      // a hair of tilt per block; a perfectly flat floor reads as CG
      q.setFromEuler(new THREE.Euler(0, 0, 0));
      m.compose(new THREE.Vector3(x, y, z), q, s);
      mesh.setMatrixAt(i++, m);
    }
  }
  mesh.count = i;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Plan-shape extrusions — the island, the curved counter, the rug, the arches.
// The redesigned store is built out of these rather than out of boxes.
// ---------------------------------------------------------------------------

/**
 * Rounded-rectangle plan shape, in the XY plane. `r` clamps to a full pill when
 * it reaches half the short side — which is exactly what the central vape stand
 * and the rug are.
 */
export function roundedRectShape(w, l, r) {
  const rr = Math.min(r, w / 2, l / 2);
  const x = w / 2 - rr;
  const y = l / 2 - rr;
  const s = new THREE.Shape();
  s.moveTo(-x, -l / 2);
  s.lineTo(x, -l / 2);
  s.absarc(x, -y, rr, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, y);
  s.absarc(x, y, rr, 0, Math.PI / 2, false);
  s.lineTo(-x, l / 2);
  s.absarc(-x, y, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -y);
  s.absarc(-x, -y, rr, Math.PI, Math.PI * 1.5, false);
  s.closePath();
  return s;
}

/** Flat-bottomed shape with a semicircular head — the product niches and the
 *  arched GRAND. recess behind the counter. Drawn in XY, origin at floor centre. */
export function archShape(w, h) {
  const r = w / 2;
  const straight = Math.max(0.01, h - r);
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(-r, straight);
  s.absarc(0, straight, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.closePath();
  return s;
}

/**
 * Extrude a plan shape upward into a solid — counters, islands, plinths.
 * ExtrudeGeometry works along +Z, so the result is tipped onto the floor and the
 * base sits at y = 0.
 */
export function prism(shape, height, chamfer = 0.004, curveSegments = 16) {
  const c = Math.min(chamfer, height / 4);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height - 2 * c,
    bevelEnabled: c > 0,
    bevelThickness: c,
    bevelSize: c,
    bevelOffset: 0,
    bevelSegments: 1,
    curveSegments,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, c, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * A wall panel with an arched opening cut out of it.
 *
 * Built as a Shape with a hole rather than as segments around the void: a solid
 * plane in front of a recess simply hides it, which is how the first pass came
 * out — the niche was there, behind an unbroken wall, and only the gold arch bead
 * in front of it was visible.
 *
 * Origin at the floor, centred in X.
 */
export function wallWithArch(w, h, archW, archH, sill = 0) {
  const outer = new THREE.Shape();
  outer.moveTo(-w / 2, 0);
  outer.lineTo(w / 2, 0);
  outer.lineTo(w / 2, h);
  outer.lineTo(-w / 2, h);
  outer.closePath();

  const r = archW / 2;
  const straight = archH - r;
  const hole = new THREE.Path();
  hole.moveTo(-r, sill);
  hole.lineTo(-r, sill + straight);
  hole.absarc(0, sill + straight, r, Math.PI, 0, true);
  hole.lineTo(r, sill);
  hole.closePath();
  outer.holes.push(hole);

  return outer;
}

/**
 * Extrude a plan shape a short way along +Z — wall-mounted arches, framed
 * panels, sign plates. Stays upright in XY, so it can be placed flat on a wall.
 */
export function relief(shape, depth, chamfer = 0.002, curveSegments = 16) {
  const c = Math.min(chamfer, depth / 3);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * c),
    bevelEnabled: c > 0,
    bevelThickness: c,
    bevelSize: c,
    bevelOffset: 0,
    bevelSegments: 1,
    curveSegments,
  });
  geo.computeVertexNormals();
  return geo;
}

/**
 * A thin outline following a plan shape — the gold banding that rings the
 * island and the counter, and the gold frames around the wall bays.
 */
export function outlineTube(shape, radius = 0.008, segments = 96) {
  const pts = shape.getPoints(segments).map((p) => new THREE.Vector3(p.x, 0, -p.y));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.02);
  return new THREE.TubeGeometry(curve, segments, radius, 6, true);
}

/** Flat quad in the XZ plane, facing +Y. Floors, ceilings, pavement. */
export function ground(w, d, material, segments = 1) {
  const geo = new THREE.PlaneGeometry(w, d, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}

/** Flat quad in the XY plane, facing +Z. Walls, glazing, signage boards. */
export function panel(w, h, material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.receiveShadow = true;
  return m;
}
