const HEADER_SIZE = 64;
const MAGIC = "ANSYS_FEM";
const NODE_SIZE = 24;
const ELEM_SIZE = 16;
const STRESS_ENTRY_SIZE = 48;
const FACES_PER_TET = 4;

const TET_FACES = [
  [0, 1, 2],
  [0, 1, 3],
  [0, 2, 3],
  [1, 2, 3],
];

self.onmessage = function (e: MessageEvent<ArrayBuffer>) {
  try {
    const buffer = e.data;
    const view = new DataView(buffer);

    self.postMessage({ type: "progress", stage: "header", progress: 0 });

    if (buffer.byteLength < HEADER_SIZE) {
      throw new Error("File too small to contain a valid header");
    }

    let offset = 0;
    const magicBytes = new Uint8Array(buffer, 0, 8);
    const magic = String.fromCharCode(...magicBytes);
    if (magic !== MAGIC) {
      throw new Error(`Invalid magic: expected "${MAGIC}", got "${magic}"`);
    }

    offset = 8;
    const version = view.getUint32(offset, true);
    offset += 4;
    const nodeCount = view.getUint32(offset, true);
    offset += 4;
    const elemCount = view.getUint32(offset, true);
    offset += 4;
    const stressCount = view.getUint32(offset, true);
    offset += 4;

    const expectedSize =
      HEADER_SIZE +
      nodeCount * NODE_SIZE +
      elemCount * ELEM_SIZE +
      stressCount * STRESS_ENTRY_SIZE;
    if (buffer.byteLength < expectedSize) {
      throw new Error(
        `File size mismatch: expected ${expectedSize}, got ${buffer.byteLength}`
      );
    }

    self.postMessage({ type: "progress", stage: "header", progress: 1 });

    self.postMessage({ type: "progress", stage: "nodes", progress: 0 });

    const nodesOffset = HEADER_SIZE;
    const nodesRaw = new Float64Array(buffer, nodesOffset, nodeCount * 3);

    self.postMessage({ type: "progress", stage: "nodes", progress: 1 });

    self.postMessage({ type: "progress", stage: "elements", progress: 0 });

    const elemsOffset = nodesOffset + nodeCount * NODE_SIZE;
    const elemsRaw = new Uint32Array(buffer, elemsOffset, elemCount * 4);

    self.postMessage({ type: "progress", stage: "elements", progress: 1 });

    self.postMessage({ type: "progress", stage: "stress", progress: 0 });

    const stressOffset = elemsOffset + elemCount * ELEM_SIZE;
    const stressRaw = new Float64Array(
      buffer,
      stressOffset,
      stressCount * 6
    );

    self.postMessage({ type: "progress", stage: "stress", progress: 1 });

    self.postMessage({ type: "progress", stage: "surface", progress: 0 });

    const faceMap = new Map<string, { elemIdx: number; localFace: number }[]>();

    for (let e = 0; e < elemCount; e++) {
      const n0 = elemsRaw[e * 4];
      const n1 = elemsRaw[e * 4 + 1];
      const n2 = elemsRaw[e * 4 + 2];
      const n3 = elemsRaw[e * 4 + 3];
      const tetNodes = [n0, n1, n2, n3];

      for (let f = 0; f < FACES_PER_TET; f++) {
        const faceIdx = TET_FACES[f];
        const sorted = [
          tetNodes[faceIdx[0]],
          tetNodes[faceIdx[1]],
          tetNodes[faceIdx[2]],
        ].sort((a, b) => a - b);
        const key = `${sorted[0]},${sorted[1]},${sorted[2]}`;

        let entries = faceMap.get(key);
        if (!entries) {
          entries = [];
          faceMap.set(key, entries);
        }
        entries.push({ elemIdx: e, localFace: f });
      }

      if ((e & 0xfff) === 0) {
        self.postMessage({
          type: "progress",
          stage: "surface",
          progress: e / elemCount * 0.5,
        });
      }
    }

    const surfaceFaces: {
      n: [number, number, number];
      elemIdx: number;
    }[] = [];
    for (const [key, entries] of faceMap) {
      if (entries.length === 1) {
        const { elemIdx, localFace } = entries[0];
        const n0 = elemsRaw[elemIdx * 4];
        const n1 = elemsRaw[elemIdx * 4 + 1];
        const n2 = elemsRaw[elemIdx * 4 + 2];
        const n3 = elemsRaw[elemIdx * 4 + 3];
        const tetNodes = [n0, n1, n2, n3];
        const faceIdx = TET_FACES[localFace];
        surfaceFaces.push({
          n: [
            tetNodes[faceIdx[0]],
            tetNodes[faceIdx[1]],
            tetNodes[faceIdx[2]],
          ],
          elemIdx,
        });
      }
    }

    self.postMessage({
      type: "progress",
      stage: "surface",
      progress: 0.5,
    });

    const vertexSet = new Set<number>();
    for (const face of surfaceFaces) {
      vertexSet.add(face.n[0]);
      vertexSet.add(face.n[1]);
      vertexSet.add(face.n[2]);
    }

    const surfaceVertices = vertexSet.size;
    const vertexIndexMap = new Map<number, number>();
    let idx = 0;
    for (const v of vertexSet) {
      vertexIndexMap.set(v, idx++);
    }

    const positions = new Float32Array(surfaceVertices * 3);
    for (const [origIdx, newIdx] of vertexIndexMap) {
      positions[newIdx * 3] = nodesRaw[origIdx * 3];
      positions[newIdx * 3 + 1] = nodesRaw[origIdx * 3 + 1];
      positions[newIdx * 3 + 2] = nodesRaw[origIdx * 3 + 2];
    }

    const indices = new Uint32Array(surfaceFaces.length * 3);
    for (let i = 0; i < surfaceFaces.length; i++) {
      const face = surfaceFaces[i];
      indices[i * 3] = vertexIndexMap.get(face.n[0])!;
      indices[i * 3 + 1] = vertexIndexMap.get(face.n[1])!;
      indices[i * 3 + 2] = vertexIndexMap.get(face.n[2])!;
    }

    self.postMessage({
      type: "progress",
      stage: "surface",
      progress: 0.75,
    });

    const stressComponents = new Float32Array(surfaceVertices * 6);
    const stressCountPerVertex = new Float32Array(surfaceVertices);

    for (let i = 0; i < surfaceFaces.length; i++) {
      const face = surfaceFaces[i];
      const elemIdx = face.elemIdx;
      const sx = stressRaw[elemIdx * 6];
      const sy = stressRaw[elemIdx * 6 + 1];
      const sz = stressRaw[elemIdx * 6 + 2];
      const txy = stressRaw[elemIdx * 6 + 3];
      const tyz = stressRaw[elemIdx * 6 + 4];
      const txz = stressRaw[elemIdx * 6 + 5];

      for (let j = 0; j < 3; j++) {
        const vIdx = vertexIndexMap.get(face.n[j])!;
        stressComponents[vIdx * 6] += sx;
        stressComponents[vIdx * 6 + 1] += sy;
        stressComponents[vIdx * 6 + 2] += sz;
        stressComponents[vIdx * 6 + 3] += txy;
        stressComponents[vIdx * 6 + 4] += tyz;
        stressComponents[vIdx * 6 + 5] += txz;
        stressCountPerVertex[vIdx] += 1;
      }
    }

    let minStress = Infinity;
    let maxStress = -Infinity;

    for (let i = 0; i < surfaceVertices; i++) {
      const count = stressCountPerVertex[i];
      if (count > 0) {
        const inv = 1 / count;
        const sx = stressComponents[i * 6] * inv;
        const sy = stressComponents[i * 6 + 1] * inv;
        const sz = stressComponents[i * 6 + 2] * inv;
        const txy = stressComponents[i * 6 + 3] * inv;
        const tyz = stressComponents[i * 6 + 4] * inv;
        const txz = stressComponents[i * 6 + 5] * inv;

        stressComponents[i * 6] = sx;
        stressComponents[i * 6 + 1] = sy;
        stressComponents[i * 6 + 2] = sz;
        stressComponents[i * 6 + 3] = txy;
        stressComponents[i * 6 + 4] = tyz;
        stressComponents[i * 6 + 5] = txz;

        const vonMises = Math.sqrt(
          0.5 *
            ((sx - sy) * (sx - sy) +
              (sy - sz) * (sy - sz) +
              (sz - sx) * (sz - sx)) +
          3 * (txy * txy + tyz * tyz + txz * txz)
        );

        if (vonMises < minStress) minStress = vonMises;
        if (vonMises > maxStress) maxStress = vonMises;
      }
    }

    self.postMessage({ type: "progress", stage: "surface", progress: 1 });

    self.postMessage({ type: "progress", stage: "complete", progress: 1 });

    (self as unknown as Worker).postMessage(
      {
        type: "parsed",
        header: { magic, version, nodeCount, elemCount, stressCount },
        positions,
        indices,
        stressComponents,
        stats: {
          totalNodes: nodeCount,
          totalElements: elemCount,
          surfaceFaces: surfaceFaces.length,
          surfaceVertices,
          minStress,
          maxStress,
        },
      },
      [positions.buffer, indices.buffer, stressComponents.buffer] as any
    );
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
