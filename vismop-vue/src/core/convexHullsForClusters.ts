import { graphData } from '@/core/graphTypes';
import { createNormalizationFunction, graphExtent, NormalizationFunction } from 'sigma/utils';

declare type Extent = [number, number];
interface BBox {
    x?: Extent,
    y?: Extent
}

function pushNodesOut(currentHullPoints: [number[]]): [{ x: number; y: number; }[], { x: number; y: number; }] {
    var convexHullNorm = [];
    var test = []
    var XYVals = { x: currentHullPoints.map(function (o) { return o[0]; }), y: currentHullPoints.map(function (o) { return o[1]; }) };
    var centroid = { x: XYVals.x.reduce((a, b) => a + b, 0) / XYVals.x.length, y: XYVals.y.reduce((a, b) => a + b, 0) / XYVals.y.length }
    console.log('HULL')
    for (var h = 0; h < currentHullPoints.length; h++) {
        var cur_x = XYVals.x[h] //+ 0.3 * vecfromCentroid.x / vectorLength;
        var cur_y = XYVals.y[h] // + 0.3 * vecfromCentroid.y / vectorLength;
        var norm_xy = { x: cur_x, y: cur_y };
        var vecfromCentroid = { x: norm_xy.x - centroid.x, y: norm_xy.y - centroid.y }
        var vectorLength = Math.sqrt(vecfromCentroid.x ** 2 + vecfromCentroid.y ** 2)
       
        norm_xy = { x: norm_xy.x + 0.04 * vecfromCentroid.x / vectorLength, y: norm_xy.y + 0.05 * vecfromCentroid.y / vectorLength };
        // var vectorLength = Math.sqrt((vecfromCentroid.x/vectorLength) ** 2 + (vecfromCentroid.y/vectorLength) ** 2)
        test.push([norm_xy.x, norm_xy.y])

        convexHullNorm.push(norm_xy);
    }
    console.log(test)

    return [convexHullNorm, centroid]
}

function removeSharpeEdges(currentHullPoints: { x: number; y: number; }[], centroid: { x: number; y: number; }, radianThreshold: number) {
    console.log('LENGTH', currentHullPoints.length)
    let hasAcuteRadian = true
    while (hasAcuteRadian) {
        console.log('while')
        hasAcuteRadian = false
        for (let idx = currentHullPoints.length - 1; idx >= 0; idx--) {
            const currPoint = currentHullPoints[idx];

            const nextIdx = (idx == 0) ? currentHullPoints.length - 1 : idx - 1
            const nextPoint = currentHullPoints[nextIdx]

            const prevIdx = (idx == currentHullPoints.length - 1) ? 0 : idx + 1
            const prevPoint = currentHullPoints[prevIdx]

            const currPrevVec = {x: prevPoint.x-currPoint.x, y: prevPoint.y-currPoint.y}
            // const currNextVec = {x: nextPoint.x-currPoint.x, y: nextPoint.y-currPoint.y}

            // let radian = Math.atan2(nextPoint.y - currPoint.y, nextPoint.x - currPoint.x) - Math.atan2(prevPoint.y - currPoint.y, prevPoint.x - currPoint.x)

            // if (radian < 0) { 
            //     console.log(radian, 'if bedingung')
            //     // radian += 2 * Math.PI; 
            //     radian = Math.atan2(prevPoint.y - currPoint.y, prevPoint.x - currPoint.x) -Math.atan2(nextPoint.y - currPoint.y, nextPoint.x - currPoint.x)
            //     console.log(radian)
            // }
            // if (radian > Math.PI)        { radian -= 2 * Math.PI; }
            // else if (radian <= -Math.PI) { radian += 2 * Math.PI; }

            let radian_v1 = Math.atan2(nextPoint.y - currPoint.y, nextPoint.x - currPoint.x);
            let radian_v2 = Math.atan2(prevPoint.y - currPoint.y, prevPoint.x - currPoint.x);
            // console.log(prevPoint, currPoint, nextPoint, radian_v1, radian_v2)
            radian_v1 = radian_v1 < 0? radian_v1 + 2 * Math.PI: radian_v1;
            radian_v2 = radian_v2 < 0? radian_v2 + 2 * Math.PI: radian_v2;

            const radian = radian_v1 < radian_v2 ? radian_v2 - radian_v1 : radian_v1 -radian_v2;
            // console.log('r', radian, currentHullPoints.length)
            if (radian < radianThreshold && radian > 0.00001) {
                console.log('spitzt', idx, radian)
                hasAcuteRadian = true
                const insertPoint = { x: prevPoint.x + (currPoint.x - prevPoint.x) / 4 * 3, y: prevPoint.y + (currPoint.y - prevPoint.y) / 4 * 3 }
                // const insertPoint = { x: prevPoint.x + currPoint.x / 2, y: prevPoint.y + currPoint.y / 2 }
                const perpendicularPoint = { x: currPrevVec.y, y: - currPrevVec.x}
                const vecfromCentroid = { x: insertPoint.x - centroid.x, y: insertPoint.y - centroid.y }
                const vecfromPP = { x: insertPoint.x - perpendicularPoint.x, y: insertPoint.y - perpendicularPoint.y }

                // const vectorLength = Math.sqrt(vecfromCentroid.x ** 2 + vecfromCentroid.y ** 2)
                const vectorLength = Math.sqrt(vecfromPP.x ** 2 + vecfromPP.y ** 2)
                
                // const pushedPoint = { x: insertPoint.x + 0.01* vecfromCentroid.x/vectorLength, y: insertPoint.y +  0.01 * vecfromCentroid.y/vectorLength  }
                const pushedPoint = { x: insertPoint.x + 0.03* vecfromPP.x/vectorLength, y: insertPoint.y +  0.03 * vecfromPP.y/vectorLength  }
                
                currentHullPoints.splice(idx, 0, pushedPoint)
            }
        }
    }
    return currentHullPoints
}

function normHullPoints(currentHullPoints: { x: number; y: number; }[], normalizationFunction: NormalizationFunction): { x: number; y: number; }[]{
    let normPoints = []
    for (let idx = currentHullPoints.length - 1; idx >= 0; idx--) {
        const currPoint = currentHullPoints[idx];
        normalizationFunction.applyTo(currPoint);
        normPoints.push(currPoint)
    }
    return normPoints
}

function vecLength(vec: number[]): number{
    let len = Math.sqrt(vec[0] ** 2 + vec[1] ** 2);
    return len
}

function adjustHulls(currentHullPoints: [number[]], radianThreshold: number): [number[]] {
    var idx = currentHullPoints.length - 2;
    // var XYVals = { x: currentHullPoints.map(function (o) { return o[0]; }), y: currentHullPoints.map(function (o) { return o[1]; }) };
    while (idx >= 0){
        const prevIdx = (idx == currentHullPoints.length - 2) ? 0 : idx + 1;
        const prevPoint = currentHullPoints[prevIdx];

        const currPoint = currentHullPoints[idx];

        const nextIdx = (idx == 0) ? currentHullPoints.length - 2 : idx - 1;
        const nextPoint = currentHullPoints[nextIdx];

        const prevCurVec = [currPoint[0] - prevPoint[0], currPoint[1] - prevPoint[1]];
        const nextCurrVec = [currPoint[0] - nextPoint[0], currPoint[1] - nextPoint[1]];

        const dotProd = prevCurVec[0]* nextCurrVec[0] + prevCurVec[1]* nextCurrVec[1];

        const radian = Math.acos(dotProd/(vecLength(prevCurVec)*vecLength(nextCurrVec)));
        const moveVec = [prevCurVec[0] + nextCurrVec[0], prevCurVec[1] + nextCurrVec[1]];
        const moveVecLen = vecLength(moveVec);
        const moveVecUnit = [moveVec[0] / moveVecLen, moveVec[1] / moveVecLen ]

        const newPushedOutPoint = [currentHullPoints[idx][0] + moveVecUnit[0] * 0.03, currentHullPoints[idx][1] + moveVecUnit[1] * 0.03 ];
        if (radian > radianThreshold){
        // move current point more outside
        currentHullPoints[idx] = newPushedOutPoint;
        idx--;
        console.log('if', radian)

        }
        else{
        console.log(radian, dotProd, vecLength(prevCurVec), vecLength(nextCurrVec))
        // move current point more outside and split in two
        const perpendicularClockWise = [moveVec[1], -moveVec[0]]
        const perpendicularCounterclockWise= [-moveVec[1], moveVec[0]]
        const newPointClockWise = [newPushedOutPoint[0] + perpendicularClockWise[0], newPushedOutPoint[1] + perpendicularClockWise[1]]
        const newPointCounterclockWise = [newPushedOutPoint[0] + perpendicularCounterclockWise[0] *0.03, newPushedOutPoint[1] + perpendicularCounterclockWise[1]*0.03]
        currentHullPoints.splice(idx, 1, newPointClockWise, newPointCounterclockWise)
        }
    }
    return currentHullPoints
}

export default class ClusterHulls {
    normalizationFunction: NormalizationFunction;
    radianThreshold: number;

    constructor(graph: graphData, customBBox: BBox | null = null, angleThreshold: number) {
        let nodeExtent = graphExtent(graph);
        let extend = customBBox === null ? nodeExtent : nodeExtent
        this.normalizationFunction = createNormalizationFunction(extend);
        this.radianThreshold = angleThreshold * Math.PI / 180
    }
    adjust(convexHulls: [[number[]]]): [[number[]]]{
        for (var i = 0; i < convexHulls.length; i++) {
            console.log('conHull', i)
            // const finalHullNodes = adjustHulls(convexHulls[i], this.radianThreshold)
            // convexHulls[i] = finalHullNodes
        }
        console.log('FINAL', convexHulls)
        return convexHulls

    }

}

