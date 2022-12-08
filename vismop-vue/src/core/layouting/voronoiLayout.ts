import { voronoiMapSimulation } from 'd3-voronoi-map';
import { ConvexPolygon } from './ConvexPolygon';
import { cluster, clusterData } from './voronoiTypes';

/**
 * Given an arrays of Clusters, generate a weighted voronoi diagram bounded by a circle with radius and return them as polygon type data
 * @param radius
 * @param clusterData
 * @returnso an Array of Polygons
 */
export function generateVoronoiCells(
  radius: number,
  weights: number[],
  centers: [number, number][]
): { [key: number]: ConvexPolygon } {
  // https://github.com/Kcnarf/d3-voronoi-map
  const outData: { [key: number]: ConvexPolygon } = {};
  const inputData = [];
  for (let index = 0; index < weights.length; index++) {
    const weight = weights[index];
    const center = centers[index];
    const inputDatum = {
      id: index,
      weight: weight,
      initX: center[0],
      initY: center[1],
    };
    inputData.push(inputDatum);
  }
  const voronoiPolys = generateVoronoiPolygons(inputData, radius);
  for (let index = 0; index < voronoiPolys.length; index++) {
    const polygonObj = generatePolygonObj(voronoiPolys[index]);
    polygonObj.scalePolygon(0.9);
    polygonObj.calculateColliders();
    outData[voronoiPolys[index].site.originalObject.index] = polygonObj;
  }
  return outData;
}

export function nodePolygonMapping(
  clusters: string[][],
  polygons: {
    [key: number]: ConvexPolygon;
  }
): {
  [key: string]: {
    id: string;
    xInit: number;
    yInit: number;
    clusterIDx: number;
  };
} {
  const mapping: {
    [key: string]: {
      id: string;
      xInit: number;
      yInit: number;
      clusterIDx: number;
    };
  } = {};
  for (let idxOuter = 0; idxOuter < clusters.length; idxOuter++) {
    const currentCluster = clusters[idxOuter];
    const randomPoints = polygons[idxOuter].samplePointsInPoly(
      currentCluster.length
    );
    for (let idxInner = 0; idxInner < randomPoints.length; idxInner++) {
      const point = randomPoints[idxInner];
      mapping[currentCluster[idxInner]] = {
        id: currentCluster[idxInner],
        xInit: point[0],
        yInit: point[1],
        clusterIDx: idxOuter,
      };
    }
  }
  return mapping;
}

/**
 * Given an arrays of Clusters, generate a weighted voronoi diagram bounded by a circle with radius
 * @param clusterData array of clusters
 * @param radius radius of bounding circle
 * @returns Array of Polygons each containing an array of coordinates
 */
function generateVoronoiPolygons(inputData: clusterData, radius: number) {
  const circle = [];
  // one has to take care that the initial cluster centers are completely inside the circle, otherwise they will get moved around very weirdly
  for (let val = 0; val < 2 * Math.PI; val += Math.PI / 30) {
    const x = radius * Math.cos(val);
    const y = radius * Math.sin(val);
    circle.push([x, y]);
  }
  const simulation = voronoiMapSimulation(inputData)
    .weight(function (d: cluster) {
      return d.weight;
    })
    .initialPosition((d: cluster) => {
      return [d.initX, d.initY];
    })
    .clip(circle)
    .stop();

  let state = simulation.state();
  while (!state.ended) {
    simulation.tick();
    state = simulation.state();
  }

  return state.polygons as Array<
    [number, number][] & { site: { originalObject: { index: number } } }
  >;
}

/**
 * Formats polygon array to polygon format
 * @param poly
 * @returns
 */
function generatePolygonObj(poly: [number, number][]): ConvexPolygon {
  const currentPolygon = new ConvexPolygon();
  poly.forEach((element) => {
    currentPolygon.addVertex(element[0], element[1]);
  });
  currentPolygon.calculateOptimalBoundingBox();
  return currentPolygon;
}
