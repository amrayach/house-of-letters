/**
 * GLB paper-model audit: detects per-region UV mirroring and Front/Back
 * sheet crossover, the two candidate causes of "upper half of the paper
 * is flipped horizontally" (client report 2026-07-06).
 *
 * Usage: node dev/inspect-glb.mjs public/assets/models/1.glb [more.glb ...]
 *
 * For each mesh node it prints, per vertical band of the paper:
 *   - mean texture V (which slice of the tall scan strip maps there)
 *   - sign of dU/dX  (horizontal texture direction; a sign flip between
 *     bands = horizontally mirrored region)
 *   - sign of dV/dY  (vertical texture direction)
 *   - mean world Z   (depth; compare Front vs Back per band for crossover)
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const BANDS = 8;

function xformPoint(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function fmt(n, w = 8) {
  return String(typeof n === 'number' ? n.toFixed(3) : n).padStart(w);
}

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  console.log(`\n============ ${file} ============`);

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    const t = node.getTranslation().map((v) => +v.toFixed(4));
    const r = node.getRotation().map((v) => +v.toFixed(4));
    const s = node.getScale().map((v) => +v.toFixed(4));
    console.log(
      `node "${node.getName()}" mesh=${mesh ? JSON.stringify(mesh.getName()) : '-'} ` +
      `T=[${t}] R=[${r}] S=[${s}]`
    );
  }

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const world = node.getWorldMatrix();

    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const uv = prim.getAttribute('TEXCOORD_0');
      const idx = prim.getIndices();
      const mat = prim.getMaterial();
      const matName = mat ? mat.getName() : '-';
      if (!pos) continue;

      const vcount = pos.getCount();
      // World-space positions
      const wpos = new Array(vcount);
      const el = [0, 0, 0];
      for (let i = 0; i < vcount; i++) {
        pos.getElement(i, el);
        wpos[i] = xformPoint(world, el[0], el[1], el[2]);
      }
      let min = [Infinity, Infinity, Infinity];
      let max = [-Infinity, -Infinity, -Infinity];
      for (const p of wpos) {
        for (let a = 0; a < 3; a++) {
          if (p[a] < min[a]) min[a] = p[a];
          if (p[a] > max[a]) max[a] = p[a];
        }
      }

      console.log(
        `\n  mesh node="${node.getName()}" material="${matName}" verts=${vcount} tris=${idx ? idx.getCount() / 3 : vcount / 3}`
      );
      console.log(
        `  world bounds  X ${fmt(min[0])}..${fmt(max[0])}  Y ${fmt(min[1])}..${fmt(max[1])}  Z ${fmt(min[2])}..${fmt(max[2])}`
      );
      if (!uv) {
        console.log('  (no TEXCOORD_0)');
        continue;
      }

      // Per-band accumulators over world Y
      const bands = Array.from({ length: BANDS }, () => ({
        area: 0, du_dx: 0, dv_dy: 0, det: 0, sumV: 0, sumU: 0, w: 0,
        sumZ: 0, flipTris: 0, tris: 0, minU: Infinity, maxU: -Infinity,
        minV: Infinity, maxV: -Infinity,
      }));
      const ySpan = max[1] - min[1] || 1;

      const uvEl = [0, 0];
      const uvs = new Array(vcount);
      for (let i = 0; i < vcount; i++) {
        uv.getElement(i, uvEl);
        uvs[i] = [uvEl[0], uvEl[1]];
      }

      const triCount = idx ? idx.getCount() / 3 : vcount / 3;
      const getIndex = (k) => (idx ? idx.getScalar(k) : k);

      for (let tI = 0; tI < triCount; tI++) {
        const a = getIndex(tI * 3), b = getIndex(tI * 3 + 1), c = getIndex(tI * 3 + 2);
        const A = wpos[a], B = wpos[b], C = wpos[c];
        const UA = uvs[a], UB = uvs[b], UC = uvs[c];

        // Edges in world XY (paper assumed roughly upright; thin axis = Z)
        const e1 = [B[0] - A[0], B[1] - A[1]];
        const e2 = [C[0] - A[0], C[1] - A[1]];
        const detP = e1[0] * e2[1] - e1[1] * e2[0];
        if (Math.abs(detP) < 1e-12) continue; // degenerate in XY

        const f1 = [UB[0] - UA[0], UB[1] - UA[1]];
        const f2 = [UC[0] - UA[0], UC[1] - UA[1]];
        // Jacobian J = d(u,v)/d(x,y): solve [f1 f2] = J * [e1 e2]
        const inv = 1 / detP;
        const j00 = (f1[0] * e2[1] - f2[0] * e1[1]) * inv; // du/dx
        const j01 = (f2[0] * e1[0] - f1[0] * e2[0]) * inv; // du/dy
        const j10 = (f1[1] * e2[1] - f2[1] * e1[1]) * inv; // dv/dx
        const j11 = (f2[1] * e1[0] - f1[1] * e2[0]) * inv; // dv/dy
        const detJ = j00 * j11 - j01 * j10;

        const area = Math.abs(detP) * 0.5;
        const cy = (A[1] + B[1] + C[1]) / 3;
        const cz = (A[2] + B[2] + C[2]) / 3;
        const cu = (UA[0] + UB[0] + UC[0]) / 3;
        const cv = (UA[1] + UB[1] + UC[1]) / 3;

        let bandI = Math.floor(((cy - min[1]) / ySpan) * BANDS);
        bandI = Math.max(0, Math.min(BANDS - 1, bandI));
        const band = bands[bandI];
        band.area += area;
        band.du_dx += j00 * area;
        band.dv_dy += j11 * area;
        band.det += detJ * area;
        band.sumV += cv * area;
        band.sumU += cu * area;
        band.sumZ += cz * area;
        band.w += area;
        band.tris += 1;
        for (const [u, v] of [UA, UB, UC]) {
          if (u < band.minU) band.minU = u;
          if (u > band.maxU) band.maxU = u;
          if (v < band.minV) band.minV = v;
          if (v > band.maxV) band.maxV = v;
        }
      }

      console.log(
        '  band(Y low→high) |  meanV |  U range   |  du/dx |  dv/dy | meanZ*1000'
      );
      bands.forEach((b, i) => {
        if (!b.w) return;
        console.log(
          `    band ${i}         |${fmt(b.sumV / b.w, 7)} | ${b.minU.toFixed(2)}..${b.maxU.toFixed(2)} |${fmt(b.du_dx / b.w, 7)} |${fmt(b.dv_dy / b.w, 7)} |${fmt((b.sumZ / b.w) * 1000, 10)}`
        );
      });

      // Winding check: geometric normal (from CCW winding) vs world Z.
      // Positive => front faces (glTF CCW convention) point toward +Z.
      let windZ = 0;
      for (let tI = 0; tI < triCount; tI++) {
        const a = getIndex(tI * 3), b = getIndex(tI * 3 + 1), c = getIndex(tI * 3 + 2);
        const A = wpos[a], B = wpos[b], C = wpos[c];
        const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
        const e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
        windZ += e1[0] * e2[1] - e1[1] * e2[0]; // z of cross(e1,e2), area-weighted
      }
      console.log(`  WINDING ${node.getName()}: sum cross_z=${(windZ).toExponential(3)} (front faces ${windZ > 0 ? '+Z' : '-Z'})`);

      // Compact crossover signature: mean Z (x1000) of lower vs upper half
      const lowZ = bands.slice(0, 4).reduce((s, b) => s + b.sumZ, 0) /
        (bands.slice(0, 4).reduce((s, b) => s + b.w, 0) || 1);
      const highZ = bands.slice(4).reduce((s, b) => s + b.sumZ, 0) /
        (bands.slice(4).reduce((s, b) => s + b.w, 0) || 1);
      const lowU = bands.slice(0, 4).reduce((s, b) => s + b.du_dx, 0) /
        (bands.slice(0, 4).reduce((s, b) => s + b.w, 0) || 1);
      const highU = bands.slice(4).reduce((s, b) => s + b.du_dx, 0) /
        (bands.slice(4).reduce((s, b) => s + b.w, 0) || 1);
      console.log(
        `  SIGNATURE ${node.getName()}: zLower=${(lowZ * 1000).toFixed(4)} zUpper=${(highZ * 1000).toFixed(4)} ` +
        `(x1000, crossover=${Math.sign(lowZ) !== Math.sign(highZ)}) duDxLower=${lowU.toFixed(1)} duDxUpper=${highU.toFixed(1)}`
      );
    }
  }
}
