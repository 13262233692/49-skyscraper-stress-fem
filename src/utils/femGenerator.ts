export interface FEMBinaryHeader {
  magic: string;
  version: number;
  nodeCount: number;
  elemCount: number;
  stressCount: number;
}

export function generateDemoFEMData(nx: number = 6, ny: number = 6, nz: number = 40): ArrayBuffer {
  const nodeX = nx + 1;
  const nodeY = ny + 1;
  const nodeZ = nz + 1;
  const nodeCount = nodeX * nodeY * nodeZ;
  const elemCount = nx * ny * nz * 5;
  const stressCount = elemCount;

  const headerSize = 64;
  const nodeBlockSize = nodeCount * 3 * 8;
  const elemBlockSize = elemCount * 4 * 4;
  const stressBlockSize = stressCount * 6 * 8;
  const totalSize = headerSize + nodeBlockSize + elemBlockSize + stressBlockSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  let offset = 0;

  const magic = "ANSYS_FEM";
  for (let i = 0; i < 8; i++) {
    view.setUint8(offset++, i < magic.length ? magic.charCodeAt(i) : 0);
  }
  view.setUint32(offset, 1, true); offset += 4;
  view.setUint32(offset, nodeCount, true); offset += 4;
  view.setUint32(offset, elemCount, true); offset += 4;
  view.setUint32(offset, stressCount, true); offset += 4;
  offset += 40;

  function nodeIndex(ix: number, iy: number, iz: number): number {
    return iz * nodeY * nodeX + iy * nodeX + ix;
  }

  const dx = 20 / nx;
  const dy = 20 / ny;
  const dz = 300 / nz;

  for (let iz = 0; iz < nodeZ; iz++) {
    for (let iy = 0; iy < nodeY; iy++) {
      for (let ix = 0; ix < nodeX; ix++) {
        view.setFloat64(offset, ix * dx, true); offset += 8;
        view.setFloat64(offset, iy * dy, true); offset += 8;
        view.setFloat64(offset, iz * dz, true); offset += 8;
      }
    }
  }

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const v0 = nodeIndex(ix, iy, iz);
        const v1 = nodeIndex(ix + 1, iy, iz);
        const v2 = nodeIndex(ix + 1, iy + 1, iz);
        const v3 = nodeIndex(ix, iy + 1, iz);
        const v4 = nodeIndex(ix, iy, iz + 1);
        const v5 = nodeIndex(ix + 1, iy, iz + 1);
        const v6 = nodeIndex(ix + 1, iy + 1, iz + 1);
        const v7 = nodeIndex(ix, iy + 1, iz + 1);

        const tets = [
          [v0, v1, v3, v4],
          [v1, v2, v3, v6],
          [v1, v4, v5, v6],
          [v3, v4, v6, v7],
          [v1, v3, v4, v6],
        ];

        for (const tet of tets) {
          for (const idx of tet) {
            view.setUint32(offset, idx, true); offset += 4;
          }
        }
      }
    }
  }

  const stressScale = 1;

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const v0x = ix * dx, v0y = iy * dy, v0z = iz * dz;
        const v6x = (ix + 1) * dx, v6y = (iy + 1) * dy, v6z = (iz + 1) * dz;
        const cx = (v0x + v6x) / 2;
        const cy = (v0y + v6y) / 2;
        const cz = (v0z + v6z) / 2;

        const heightFrac = cz / 300;
        const windAngle = Math.atan2(cy - 10, cx - 10);
        const windwardFactor = Math.max(0, Math.cos(windAngle));

        const gravityStress = (1 - heightFrac) * 0.4;
        const windNormal = heightFrac * (0.6 + 0.4 * windwardFactor);
        const baseConcentration = Math.exp(-heightFrac * 2) * 0.3;

        const sigmaXX = windNormal * 0.8 + baseConcentration;
        const sigmaYY = windNormal * 0.3 + gravityStress * 0.2;
        const sigmaZZ = gravityStress + baseConcentration * 0.5;
        const tauXY = heightFrac * 0.35 * Math.sin(windAngle);
        const tauYZ = heightFrac * 0.15 * (1 - windwardFactor);
        const tauXZ = heightFrac * 0.25 * windwardFactor;

        for (let t = 0; t < 5; t++) {
          view.setFloat64(offset, sigmaXX / stressScale, true); offset += 8;
          view.setFloat64(offset, sigmaYY / stressScale, true); offset += 8;
          view.setFloat64(offset, sigmaZZ / stressScale, true); offset += 8;
          view.setFloat64(offset, tauXY / stressScale, true); offset += 8;
          view.setFloat64(offset, tauYZ / stressScale, true); offset += 8;
          view.setFloat64(offset, tauXZ / stressScale, true); offset += 8;
        }
      }
    }
  }

  return buffer;
}
