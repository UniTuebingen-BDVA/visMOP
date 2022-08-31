import { voronoiMapSimulation } from 'd3-voronoi-map';
import { vec2 } from 'gl-matrix';
import { ConvexPolygon } from './ConvexPolygon';

/**
 * Given an arrays of Clusters, generate a weighted voronoi diagram bounded by a circle with radius and return them as polygon type data
 * @param radius
 * @param clusterData
 * @returnso an Array of Polygons
 */
function generateVoronoiCells(
  radius: number,
  clusterData: clusterData
): ConvexPolygon[] {
  // // https://github.com/Kcnarf/d3-voronoi-map
  const outData: ConvexPolygon[] = [];
  const voronoiPolys = generateVoronoiPolygons(clusterData, radius);
  for (let index = 0; index < voronoiPolys.length; index++) {
    outData.push(generatePolygonObj(voronoiPolys[index]));
  }
  return outData;
}

/**
 * Given an arrays of Clusters, generate a weighted voronoi diagram bounded by a circle with radius
 * @param clusterData array of clusters
 * @param radius radius of bounding circle
 * @returns Array of Polygons each containing an array of coordinates
 */
function generateVoronoiPolygons(clusterData: clusterData, radius: number) {
  const circle = [];

  for (let val = 0; val < 2 * Math.PI; val += Math.PI / 30) {
    const x = radius * Math.cos(val);
    const y = radius * Math.sin(val);
    circle.push([x, y]);
  }
  const simulation = voronoiMapSimulation(clusterData)
    .weight(function (d: cluster) {
      return d.weight;
    })
    .clip(circle)
    .stop();

  let state = simulation.state();
  while (!state.ended) {
    simulation.tick();
    state = simulation.state();
  }

  return state.polygons as [number, number][][];
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
  return currentPolygon;
}
/**
 * Generates an approximation of the largest inscribed Rectangle of a given convex polygon
 */
export function inscribedRectangle(polygon: polygon): rectangle {
  return {
    data: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
  };
}
