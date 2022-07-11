
import _ from 'lodash';

export function getRightResultFormForRectangle(clusterRectangles: [number[]]): [{ hullPoints: number[][], greyValues: number[] }, number[][]] {

  let focusClusterHulls = []
  const max_ext = 18
  let greyValues = []
  const firstNoneNoiseCluster = clusterRectangles[0].length > 1 ? 1 : 0;
  if (clusterRectangles[0].length <= 1) {
    clusterRectangles.shift();
  }
  for (let i =0; i < clusterRectangles.length; i++) {
    const greyVal = i >= firstNoneNoiseCluster ? ((i - firstNoneNoiseCluster) / (clusterRectangles.length - 1 - firstNoneNoiseCluster)) * (215 - 80) + 80 : 255;
    greyValues.push(greyVal)

    const allPos = clusterRectangles[i].flat()
    const minPos = Math.min(...allPos)
    const maxPos = Math.max(...allPos)
    let focusHullPoints = [] as number[]

    _.forEach(clusterRectangles[i], (direction) => {
      focusHullPoints.push(max_ext * (direction - minPos) / (maxPos - minPos) + 1)
    });

    focusClusterHulls.push(focusHullPoints)

  }
  return [{ hullPoints: clusterRectangles, greyValues: greyValues }, focusClusterHulls];

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
  return outList as [number[]];
}

export default class ClusterHulls {
  radianThreshold: number;

  constructor(
    angleThreshold: number
  ) {

    this.radianThreshold = (angleThreshold * Math.PI) / 180;
  }
  adjust(convexHulls: [[number[]]]): [{ hullPoints: number[][][], greyValues: number[] }, number[][][]] {
    let convexHullsAdjusted = []
    let focusClusterHulls = []
    const max_ext = 18
    const firstNoneNoiseCluster = convexHulls[0].length > 1 ? 1 : 0;
    if (convexHulls[0].length <= 1) {
      convexHulls.shift();
    }
    let greyValues = []
    for (let i = convexHulls[0].length > 1 ? 0 : 1; i < convexHulls.length; i++) {
      const finalHullNodes = adjustHulls(convexHulls[i], this.radianThreshold);
      const greyVal = i >= firstNoneNoiseCluster ? ((i - firstNoneNoiseCluster) / (convexHulls.length - 1 - firstNoneNoiseCluster)) * (215 - 80) + 80 : 255;
      // const greyVal = 255
      greyValues.push(greyVal)
      convexHullsAdjusted.push(finalHullNodes)

      const allPos = finalHullNodes.flat()
      const minPos = Math.min(...allPos)
      const maxPos = Math.max(...allPos)
      let focusHullPoints = [] as number[][]

      _.forEach(finalHullNodes, (hullPoint) => {
        focusHullPoints.push([max_ext * (hullPoint[0] - minPos) / (maxPos - minPos) + 1, max_ext * (hullPoint[1] - minPos) / (maxPos - minPos) + 1])
      });

      focusClusterHulls.push(focusHullPoints)

    }
    console.log({ hullPoints: convexHullsAdjusted, greyValues: greyValues })
    return [{ hullPoints: convexHullsAdjusted, greyValues: greyValues }, focusClusterHulls];
  }
}
