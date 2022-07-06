import { graphData } from '@/core/graphTypes';
import {
  createNormalizationFunction,
  graphExtent,
  NormalizationFunction,
} from 'sigma/utils';

declare type Extent = [number, number];
interface BBox {
  x?: Extent;
  y?: Extent;
}

function vecLength(vec: number[]): number {
  const len = Math.sqrt(vec[0] ** 2 + vec[1] ** 2);
  return len;
}

function normalize(vec: number[]): number[] {
  const vecLen = vecLength(vec);
  return [vec[0] / vecLen, vec[1] / vecLen];
}

function adjustHulls(
  currentHullPoints: [number[]],
  radianThreshold: number
): [number[]] {
  const pushLen = 0.5;
  const halfPushLen = (3 * pushLen) / 4;
  currentHullPoints.pop();
  const outList = [];
  // var XYVals = { x: currentHullPoints.map(function (o) { return o[0]; }), y: currentHullPoints.map(function (o) { return o[1]; }) };
  for (let idx = 0; idx < currentHullPoints.length; idx++) {
    const prevIdx = idx == 0 ? currentHullPoints.length - 1 : idx - 1;
    const prevPoint = currentHullPoints[prevIdx];

    const currPoint = currentHullPoints[idx];

    const nextIdx = idx == currentHullPoints.length - 1 ? 0 : idx + 1;
    const nextPoint = currentHullPoints[nextIdx];

    const prevCurVec = normalize([
      currPoint[0] - prevPoint[0],
      currPoint[1] - prevPoint[1],
    ]);
    const nextCurrVec = normalize([
      currPoint[0] - nextPoint[0],
      currPoint[1] - nextPoint[1],
    ]);

    const prevCurVecAngle = normalize([
      prevPoint[0] - currPoint[0],
      prevPoint[1] - currPoint[1],
    ]);
    const nextCurrVecAngle = normalize([
      nextPoint[0] - currPoint[0],
      nextPoint[1] - currPoint[1],
    ]);

    const dotProd =
      prevCurVecAngle[0] * nextCurrVecAngle[0] +
      prevCurVecAngle[1] * nextCurrVecAngle[1];

    const radian = Math.acos(dotProd);
    const moveVec = normalize([
      prevCurVec[0] + nextCurrVec[0],
      prevCurVec[1] + nextCurrVec[1],
    ]);

    if (radian > radianThreshold) {
      // move current point more outside
      const newPushedOutPoint = [
        currPoint[0] + moveVec[0] * pushLen,
        currPoint[1] + moveVec[1] * pushLen,
      ];
      outList.push(newPushedOutPoint);
      console.log('if', radian);
    } else {
      const newPushedOutPoint = [
        currPoint[0] + moveVec[0] * halfPushLen,
        currPoint[1] + moveVec[1] * halfPushLen,
      ];
      // move current point more outside and split in two
      const perpendicularClockWise = [moveVec[1], -moveVec[0]];
      const perpendicularCounterclockWise = [-moveVec[1], moveVec[0]];
      const newPointClockWise = [
        newPushedOutPoint[0] + perpendicularClockWise[0] * halfPushLen,
        newPushedOutPoint[1] + perpendicularClockWise[1] * halfPushLen,
      ];
      const newPointCounterclockWise = [
        newPushedOutPoint[0] + perpendicularCounterclockWise[0] * halfPushLen,
        newPushedOutPoint[1] + perpendicularCounterclockWise[1] * halfPushLen,
      ];
      outList.push(newPointClockWise, newPointCounterclockWise);
    }
  }
  outList.push(outList[0]);
  return outList;
}

export default class ClusterHulls {
  normalizationFunction: NormalizationFunction;
  radianThreshold: number;

  constructor(
    graph: graphData,
    customBBox: BBox | null = null,
    angleThreshold: number
  ) {
    const nodeExtent = graphExtent(graph);
    const extend = customBBox === null ? nodeExtent : nodeExtent;
    this.normalizationFunction = createNormalizationFunction(extend);
    this.radianThreshold = (angleThreshold * Math.PI) / 180;
  }
  adjust(convexHulls: [[number[]]]): [[number[]]] {
    for (let i = 0; i < convexHulls.length; i++) {
      console.log('conHull', i);
      const finalHullNodes = adjustHulls(convexHulls[i], this.radianThreshold);
      convexHulls[i] = finalHullNodes;
    }
    console.log('FINAL', convexHulls);
    return convexHulls;
  }
}
