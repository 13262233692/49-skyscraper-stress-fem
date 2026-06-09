const HEADER_SIZE = 64;
const MAGIC = "ANSYS_FE";
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

const SAB_FLAG_IDLE = 0;
const SAB_FLAG_WRITING = 1;
const SAB_FLAG_READY = 2;

const useSAB = typeof SharedArrayBuffer !== 'undefined';

let cachedMeshData: {
  nodePositions: Float64Array;
  elemConnectivity: Uint32Array;
  surfaceFaces: { n: [number, number, number]; elemIdx: number }[];
  vertexIndexMap: Map<number, number>;
  surfaceVertices: number;
} | null = null;

let stressSAB: SharedArrayBuffer | null = null;
let stressSABView: Float32Array | null = null;
let flagSAB: SharedArrayBuffer | null = null;
let flagSABView: Int32Array | null = null;

function computeSurfaceStress(
  stressRaw: Float64Array,
  surfaceFaces: { n: [number, number, number]; elemIdx: number }[],
  vertexIndexMap: Map<number, number>,
  surfaceVertices: number,
  out: Float32Array
) {
  for (let i = 0; i < out.length; i++) out[i] = 0;
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
      out[vIdx * 6] += sx;
      out[vIdx * 6 + 1] += sy;
      out[vIdx * 6 + 2] += sz;
      out[vIdx * 6 + 3] += txy;
      out[vIdx * 6 + 4] += tyz;
      out[vIdx * 6 + 5] += txz;
      stressCountPerVertex[vIdx] += 1;
    }
  }

  for (let i = 0; i < surfaceVertices; i++) {
    const count = stressCountPerVertex[i];
    if (count > 0) {
      const inv = 1 / count;
      out[i * 6] *= inv;
      out[i * 6 + 1] *= inv;
      out[i * 6 + 2] *= inv;
      out[i * 6 + 3] *= inv;
      out[i * 6 + 4] *= inv;
      out[i * 6 + 5] *= inv;
    }
  }
}

function computeStats(stressView: Float32Array, vertexCount: number) {
  let minStress = Infinity;
  let maxStress = -Infinity;

  for (let i = 0; i < vertexCount; i++) {
    const sx = stressView[i * 6];
    const sy = stressView[i * 6 + 1];
    const sz = stressView[i * 6 + 2];
    const txy = stressView[i * 6 + 3];
    const tyz = stressView[i * 6 + 4];
    const txz = stressView[i * 6 + 5];

    const vonMises = Math.sqrt(
      0.5 * ((sx - sy) * (sx - sy) + (sy - sz) * (sy - sz) + (sz - sx) * (sz - sx)) +
      3 * (txy * txy + tyz * tyz + txz * txz)
    );

    if (vonMises < minStress) minStress = vonMises;
    if (vonMises > maxStress) maxStress = vonMises;
  }

  return { minStress, maxStress };
}

function parseFullBuffer(buffer: ArrayBuffer) {
  try {
    const view = new DataView(buffer);

    (self as unknown as Worker).postMessage({ type: 'progress', stage: "header", progress: 0 });

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
    const version = view.getUint32(offset, true); offset += 4;
    const nodeCount = view.getUint32(offset, true); offset += 4;
    const elemCount = view.getUint32(offset, true); offset += 4;
    const stressCount = view.getUint32(offset, true); offset += 4;

  const expectedSize =
    HEADER_SIZE +
    nodeCount * NODE_SIZE +
    elemCount * ELEM_SIZE +
    stressCount * STRESS_ENTRY_SIZE;
  if (buffer.byteLength < expectedSize) {
    throw new Error(`File size mismatch: expected ${expectedSize}, got ${buffer.byteLength}`);
  }

  (self as unknown as Worker).postMessage({ type: "progress", stage: "header", progress: 1 });
  (self as unknown as Worker).postMessage({ type: "progress", stage: "nodes", progress: 0 });

  const nodesOffset = HEADER_SIZE;
  const nodesRaw = new Float64Array(buffer, nodesOffset, nodeCount * 3);

  (self as unknown as Worker).postMessage({ type: "progress", stage: "nodes", progress: 1 });
  (self as unknown as Worker).postMessage({ type: "progress", stage: "elements", progress: 0 });

  const elemsOffset = nodesOffset + nodeCount * NODE_SIZE;
  const elemsRaw = new Uint32Array(buffer, elemsOffset, elemCount * 4);

  (self as unknown as Worker).postMessage({ type: "progress", stage: "elements", progress: 1 });
  (self as unknown as Worker).postMessage({ type: "progress", stage: "stress", progress: 0 });

  const stressOffset = elemsOffset + elemCount * ELEM_SIZE;
  const stressRaw = new Float64Array(buffer, stressOffset, stressCount * 6);

  (self as unknown as Worker).postMessage({ type: "progress", stage: "stress", progress: 1 });
  (self as unknown as Worker).postMessage({ type: "progress", stage: "surface", progress: 0 });

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
      (self as unknown as Worker).postMessage({
        type: "progress",
        stage: "surface",
        progress: e / elemCount * 0.5,
      });
    }
  }

  const surfaceFaces: { n: [number, number, number]; elemIdx: number }[] = [];
  for (const [, entries] of faceMap) {
    if (entries.length === 1) {
      const { elemIdx, localFace } = entries[0];
      const n0 = elemsRaw[elemIdx * 4];
      const n1 = elemsRaw[elemIdx * 4 + 1];
      const n2 = elemsRaw[elemIdx * 4 + 2];
      const n3 = elemsRaw[elemIdx * 4 + 3];
      const tetNodes = [n0, n1, n2, n3];
      const faceIdx = TET_FACES[localFace];
      surfaceFaces.push({
        n: [tetNodes[faceIdx[0]], tetNodes[faceIdx[1]], tetNodes[faceIdx[2]]],
        elemIdx,
      });
    }
  }

  (self as unknown as Worker).postMessage({ type: "progress", stage: "surface", progress: 0.5 });

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

  (self as unknown as Worker).postMessage({ type: "progress", stage: "surface", progress: 0.75 });

  cachedMeshData = {
    nodePositions: new Float64Array(nodesRaw),
    elemConnectivity: new Uint32Array(elemsRaw),
    surfaceFaces,
    vertexIndexMap,
    surfaceVertices,
  };

  let stressOut: Float32Array;

  if (useSAB) {
    const stressByteLen = surfaceVertices * 6 * 4;
    stressSAB = new SharedArrayBuffer(stressByteLen);
    stressSABView = new Float32Array(stressSAB);

    flagSAB = new SharedArrayBuffer(4);
    flagSABView = new Int32Array(flagSAB);
    Atomics.store(flagSABView, 0, SAB_FLAG_IDLE);

    stressOut = stressSABView;
  } else {
    stressOut = new Float32Array(surfaceVertices * 6);
  }

  computeSurfaceStress(stressRaw, surfaceFaces, vertexIndexMap, surfaceVertices, stressOut);

  (self as unknown as Worker).postMessage({ type: "progress", stage: "surface", progress: 1 });
  (self as unknown as Worker).postMessage({ type: "progress", stage: "complete", progress: 1 });

  const stressStats = computeStats(stressOut, surfaceVertices);

  const stats = {
    totalNodes: nodeCount,
    totalElements: elemCount,
    surfaceFaces: surfaceFaces.length,
    surfaceVertices,
    minStress: stressStats.minStress,
    maxStress: stressStats.maxStress,
  };

  const transferList: ArrayBuffer[] = [positions.buffer, indices.buffer];

  let stressComponentsTransfer: Float32Array | undefined;
  if (!useSAB) {
    stressComponentsTransfer = stressOut as Float32Array;
    transferList.push(stressOut.buffer);
  }

  (self as unknown as Worker).postMessage(
    {
      type: "parsed",
      header: { magic, version, nodeCount, elemCount, stressCount },
      positions,
      indices,
      stressSAB: useSAB ? stressSAB : null,
      flagSAB: useSAB ? flagSAB : null,
      stressComponents: useSAB ? null : stressOut,
      surfaceVertexCount: surfaceVertices,
      useSAB,
      stats,
    },
    transferList as any
  );
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
function recalculateStress(windSpeed: number, windDirection: number) {
  if (!cachedMeshData) return;

  const { nodePositions, elemConnectivity, surfaceFaces, vertexIndexMap, surfaceVertices } = cachedMeshData;
  const elemCount = elemConnectivity.length / 4;
  const stressRaw = new Float64Array(elemCount * 6);

  const windDirRad = (windDirection * Math.PI) / 180;
  const windFactor = windSpeed / 35;

  for (let e = 0; e < elemCount; e++) {
    const n0 = elemConnectivity[e * 4];
    const n1 = elemConnectivity[e * 4 + 1];
    const n2 = elemConnectivity[e * 4 + 2];
    const n3 = elemConnectivity[e * 4 + 3];

    const cx = (nodePositions[n0 * 3] + nodePositions[n1 * 3] + nodePositions[n2 * 3] + nodePositions[n3 * 3]) / 4;
    const cy = (nodePositions[n0 * 3 + 1] + nodePositions[n1 * 3 + 1] + nodePositions[n2 * 3 + 1] + nodePositions[n3 * 3 + 1]) / 4;
    const cz = (nodePositions[n0 * 3 + 2] + nodePositions[n1 * 3 + 2] + nodePositions[n2 * 3 + 2] + nodePositions[n3 * 3 + 2]) / 4;

    const heightFrac = cz / 300;
    const localAngle = Math.atan2(cy - 10, cx - 10) - windDirRad;
    const windwardFactor = Math.max(0, Math.cos(localAngle));

    const gravityStress = (1 - heightFrac) * 0.4;
    const windNormal = heightFrac * (0.6 + 0.4 * windwardFactor) * windFactor;
    const baseConcentration = Math.exp(-heightFrac * 2) * 0.3;

    stressRaw[e * 6] = windNormal * 0.8 + baseConcentration;
    stressRaw[e * 6 + 1] = windNormal * 0.3 + gravityStress * 0.2;
    stressRaw[e * 6 + 2] = gravityStress + baseConcentration * 0.5;
    stressRaw[e * 6 + 3] = heightFrac * 0.35 * Math.sin(localAngle) * windFactor;
    stressRaw[e * 6 + 4] = heightFrac * 0.15 * (1 - windwardFactor) * windFactor;
    stressRaw[e * 6 + 5] = heightFrac * 0.25 * windwardFactor * windFactor;
  }

  if (useSAB && stressSABView && flagSABView) {
    Atomics.store(flagSABView, 0, SAB_FLAG_WRITING);

    computeSurfaceStress(stressRaw, surfaceFaces, vertexIndexMap, surfaceVertices, stressSABView);

    const stats = computeStats(stressSABView!, surfaceVertices);

    Atomics.store(flagSABView, 0, SAB_FLAG_READY);
    Atomics.notify(flagSABView, 0);

    (self as unknown as Worker).postMessage({
      type: "stressUpdated",
      stats,
    });
  } else {
    const stressOut = new Float32Array(surfaceVertices * 6);
    computeSurfaceStress(stressRaw, surfaceFaces, vertexIndexMap, surfaceVertices, stressOut);

    const stats = computeStats(stressOut, surfaceVertices);

    (self as unknown as Worker).postMessage(
      {
        type: "stressUpdated",
        stressComponents: stressOut,
        stats,
      },
      [stressOut.buffer]
    );
  }
}

self.onmessage = function (e: MessageEvent) {
  try {
    const msg = e.data;

    if (msg.type === 'parse') {
      parseFullBuffer(msg.buffer);
      return;
    }

    if (msg.type === 'updateWind') {
      recalculateStress(msg.windSpeed, msg.windDirection);
      return;
    }

    throw new Error(`Unknown message type: ${msg.type}`);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
