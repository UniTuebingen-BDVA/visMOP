import { graphData } from '@/core/graphTypes';
import { createNormalizationFunction, graphExtent, NormalizationFunction } from 'sigma/utils';

declare type Extent = [number, number];
interface BBox {
    x?: Extent,
    y?: Extent
}

function pushNodesOut(currentHullPoints: [number[]], normalizationFunction: NormalizationFunction): [{ x: number; y: number; }[], { x: number; y: number; }] {
    var convexHullNorm = [];

    var XYVals = { x: currentHullPoints.map(function (o) { return o[0]; }), y: currentHullPoints.map(function (o) { return o[1]; }) };
    var centroid = { x: XYVals.x.reduce((a, b) => a + b, 0) / XYVals.x.length, y: XYVals.y.reduce((a, b) => a + b, 0) / XYVals.y.length }
    normalizationFunction.applyTo(centroid);
    for (var h = 0; h < currentHullPoints.length; h++) {
        var cur_x = XYVals.x[h] //+ 0.3 * vecfromCentroid.x / vectorLength;
        var cur_y = XYVals.y[h] // + 0.3 * vecfromCentroid.y / vectorLength;
        var norm_xy = { x: cur_x, y: cur_y };
        normalizationFunction.applyTo(norm_xy);
        var vecfromCentroid = { x: norm_xy.x - centroid.x, y: norm_xy.y - centroid.y }
        var vectorLength = Math.sqrt(vecfromCentroid.x ** 2 + vecfromCentroid.y ** 2)
       
        norm_xy = { x: norm_xy.x + 0.05 * vecfromCentroid.x / vectorLength, y: norm_xy.y + 0.05 * vecfromCentroid.y / vectorLength };
        // var vectorLength = Math.sqrt((vecfromCentroid.x/vectorLength) ** 2 + (vecfromCentroid.y/vectorLength) ** 2)

        // console.log('after', vectorLength)

        convexHullNorm.push(norm_xy);
    }
    return [convexHullNorm, centroid]
}

function removeSharpeEdges(currentHullPoints: { x: number; y: number; }[], centroid: { x: number; y: number; }, radianThreshold: number) {
    let hasAcuteRadian = true
    while (hasAcuteRadian) {
        hasAcuteRadian = false
        for (let idx = currentHullPoints.length - 1; idx >= 0; idx--) {
            const currPoint = currentHullPoints[idx];

            const nextIdx = (idx == 0) ? currentHullPoints.length - 1 : idx - 1
            const nextPoint = currentHullPoints[nextIdx]

            const prevIdx = (idx == currentHullPoints.length - 1) ? 0 : idx + 1
            const prevPoint = currentHullPoints[prevIdx]

            const currPrevVec = {x: prevPoint.x-currPoint.x, y: prevPoint.y-currPoint.y}
            // const currNextVec = {x: nextPoint.x-currPoint.x, y: nextPoint.y-currPoint.y}

            let radian = Math.atan2(nextPoint.y - currPoint.y, nextPoint.x - currPoint.x) - Math.atan2(prevPoint.y - currPoint.y, prevPoint.x - currPoint.x)

            if (radian < 0) { radian += 2 * Math.PI; }
            // const angle = Math.acos(numerator/denumerator)

            if (radian < radianThreshold) {
                hasAcuteRadian = true
                const insertPoint = { x: prevPoint.x + (currPoint.x - prevPoint.x) / 4 * 3, y: prevPoint.y + (currPoint.y - prevPoint.y) / 4 * 3 }
                // const insertPoint = { x: prevPoint.x + currPoint.x / 2, y: prevPoint.y + currPoint.y / 2 }
                //const perpendicularPoint = { x: currPrevVec.y, y: - currPrevVec.x}
                const vecfromCentroid = { x: insertPoint.x - centroid.x, y: insertPoint.y - centroid.y }
                //const vecfromPP = { x: insertPoint.x - perpendicularPoint.x, y: insertPoint.y - perpendicularPoint.y }

                const vectorLength = Math.sqrt(vecfromCentroid.x ** 2 + vecfromCentroid.y ** 2)
                // const vectorLength = Math.sqrt(vecfromPP.x ** 2 + vecfromPP.y ** 2)
                
                const pushedPoint = { x: insertPoint.x + 0.01* vecfromCentroid.x/vectorLength, y: insertPoint.y +  0.01 * vecfromCentroid.y/vectorLength  }
                // const pushedPoint = { x: insertPoint.x + 0.1* vecfromPP.x/vectorLength, y: insertPoint.y +  0.1 * vecfromPP.y/vectorLength  }
                
                currentHullPoints.splice(idx, 0, pushedPoint)
            }
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
    adjust(convexHulls: [[number[]]]): {
        x: number;
        y: number;
    }[][] {
        let finalHulls = [];
        for (var i = 0, l = convexHulls.length; i < l; i++) {
            const pusehdNodesPlusCentroid = pushNodesOut(convexHulls[i], this.normalizationFunction);
            const finalHullNodes = removeSharpeEdges(pusehdNodesPlusCentroid[0], pusehdNodesPlusCentroid[1], this.radianThreshold)
            finalHulls.push(finalHullNodes)
            // print radians -------------------------------------------------------------------------------------
            console.log('conHull', i)

            for (let idx = finalHullNodes.length - 1; idx >= 0; idx--) {
                const currPoint = finalHullNodes[idx];

                const nextIdx = (idx == 0) ? finalHullNodes.length - 1 : idx - 1
                const nextPoint = finalHullNodes[nextIdx]

                const prevIdx = (idx == finalHullNodes.length - 1) ? 0 : idx + 1
                const prevPoint = finalHullNodes[prevIdx]

                let angle = Math.atan2(nextPoint.y - currPoint.y, nextPoint.x - currPoint.x) - Math.atan2(prevPoint.y - currPoint.y, prevPoint.x - currPoint.x)

                if (angle < 0) { angle += 2 * Math.PI; }

                console.log('result:', angle)
            }
            // print END
        }
        return finalHulls

    }

}

