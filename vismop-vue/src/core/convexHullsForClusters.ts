import _ from 'lodash';

export function getRightResultFormForRectangle(
  clusterRectangles: [number[]]
): [{ hullPoints: number[][]; greyValues: number[] }, number[][]] {
  const focusClusterHulls = [];
  const max_ext = 20;
  const greyValues = [];
  const firstNoneNoiseCluster = clusterRectangles[0].length > 1 ? 1 : 0;
  if (clusterRectangles[0].length <= 1) {
    clusterRectangles.shift();
  }
  for (let i = 0; i < clusterRectangles.length; i++) {
  const greyVal =
      hullNum >= firstNoneNoiseCluster
      ? 150
        // ? ((hullNum - firstNoneNoiseCluster) /
        //     (totalNumHulls - 1 - firstNoneNoiseCluster)) *
        //     (215 - 80) +
        //   80
        : 255;
    greyValues.push(greyVal);

    const allPos = clusterRectangles[i].flat();
    const minPos = Math.min(...allPos);
    const maxPos = Math.max(...allPos);
    const focusHullPoints = [] as number[];

    _.forEach(clusterRectangles[i], (direction) => {
      focusHullPoints.push(
        (max_ext * (direction - minPos)) / (maxPos - minPos)
      );
    });

    focusClusterHulls.push(focusHullPoints);
  }
  return [
    { hullPoints: clusterRectangles, greyValues: greyValues },
    focusClusterHulls,
  ];
}
function vecLength(vec: number[]): number {
  const len = Math.sqrt(vec[0] ** 2 + vec[1] ** 2);
  return len;
}

function normalize(vec: number[]): number[] {
  const vecLen = vecLength(vec);
  return [vec[0] / vecLen, vec[1] / vecLen];
}

function adjustHullPoints(
  currentHullPoints: [number[]],
  radianThreshold: number
): number[][] {
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
  return outList;
}

export function getFocusNormalizeParameter(XYVals: {
  x: number[];
  y: number[];
}) {
  const meanX = _.mean(XYVals.x);
  let varX = 0;
  XYVals.x.forEach((num) => {
    varX += (num - meanX) ** 2;
  });
  varX /= XYVals.x.length;

  const meanY = _.mean(XYVals.y);
  let varY = 0;
  XYVals.y.forEach((num) => {
    varY += (num - meanY) ** 2;
  });
  varY /= XYVals.y.length;

  const allCenteredXY = [];
  for (let p = 0; p < XYVals.x.length; p++) {
    allCenteredXY.push(XYVals.x[p] - meanX);
    allCenteredXY.push(XYVals.y[p] - meanY);
  }

  const minCentered = Math.min(...allCenteredXY);
  const maxCentered = Math.max(...allCenteredXY);
  return {
    varX: varX,
    varY: varY,
    meanX: meanX,
    meanY: meanY,
    minCentered: minCentered,
    maxCentered: maxCentered,
  };
}
export default class ClusterHulls {
  radianThreshold: number;

  constructor(angleThreshold: number) {
    this.radianThreshold = (angleThreshold * Math.PI) / 180;
  }
  adjustOneHull(
    convexHullPoints: [number[]],
    hullNum: number,
    firstNoneNoiseCluster: number,
    max_ext: number,
    totalNumHulls: number
  ) {
    const greyVal =
      hullNum >= firstNoneNoiseCluster
        ? ((hullNum - firstNoneNoiseCluster) /
            (totalNumHulls - 1 - firstNoneNoiseCluster)) *
            (215 - 80) +
          80
        : 255;
    const finalHullNodes = adjustHullPoints(
      convexHullPoints,
      this.radianThreshold
    );
    const XYVals = {
      x: convexHullPoints.map((o) => o[0]) as number[],
      y: convexHullPoints.map((o) => o[1]) as number[],
    };
    const focusNormalizeParameter = getFocusNormalizeParameter(XYVals);
    const focusHullPoints = [] as number[][];
    _.forEach(finalHullNodes, (hullPoint) => {
      const centeredX = hullPoint[0] - focusNormalizeParameter.meanX;
      const centeredY = hullPoint[1] - focusNormalizeParameter.meanY;
      const normX =
        (max_ext * (centeredX - focusNormalizeParameter.minCentered)) /
        (focusNormalizeParameter.maxCentered -
          focusNormalizeParameter.minCentered);
      const normY =
        (max_ext * (centeredY - focusNormalizeParameter.minCentered)) /
        (focusNormalizeParameter.maxCentered -
          focusNormalizeParameter.minCentered);
      focusHullPoints.push([normX, normY]);
    });

    return {
      greyVal: greyVal,
      finalHullNodes: finalHullNodes,
      focusHullPoints: focusHullPoints,
      focusNormalizeParameter: focusNormalizeParameter,
    };
  }
  adjust(
    convexHulls: [[number[]]]
  ): [{ hullPoints: number[][][]; greyValues: number[] }, number[][][]] {
    const convexHullsAdjusted = [];
    const focusClusterHulls = [];
    const max_ext = 20;
    const firstNoneNoiseCluster = convexHulls[0].length > 1 ? 1 : 0;
    if (convexHulls[0].length <= 1) {
      convexHulls.shift();
    }
    const totalNumHulls = convexHulls.length;
    const greyValues = [];
    for (let i = 0; i < convexHulls.length; i++) {
      const hullAdjustment = this.adjustOneHull(
        convexHulls[i],
        i,
        firstNoneNoiseCluster,
        max_ext,
        totalNumHulls
      );
      greyValues.push(hullAdjustment.greyVal);
      convexHullsAdjusted.push(hullAdjustment.finalHullNodes);
      focusClusterHulls.push(hullAdjustment.focusHullPoints);
    }
    return [
      { hullPoints: convexHullsAdjusted, greyValues: greyValues },
      focusClusterHulls,
    ];
  }
}
