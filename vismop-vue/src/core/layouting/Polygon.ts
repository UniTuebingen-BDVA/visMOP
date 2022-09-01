import { vec2 } from 'gl-matrix';
export class Polygon {
  // vertices are considered counterclockwise
  public vertices: vec2[] = [];
  public transformedVertices: vec2[] = [];
  protected recalculateCenter = true;
  protected center: vec2 = vec2.create();
  protected area = Number.POSITIVE_INFINITY;

  // adds vertex ad pos x, y to the polygon
  public addVertex(x: number, y: number) {
    const vertex = vec2.fromValues(x, y);
    this.vertices.push(vertex);
    this.transformedVertices.push(vec2.clone(vertex));
  }
  public addVertices(vertices: [number, number][]) {
    vertices.forEach((vert) => {
      this.addVertex(...vert);
    });
  }
  // applies current transformation to vertex arrays
  public applyTransformation() {
    const appliedVerts: vec2[] = [];
    this.transformedVertices.forEach((vert) => {
      appliedVerts.push(vec2.clone(vert));
    });
    this.vertices = appliedVerts;
  }

  // returns the amount of edges
  public edgeAmt() {
    return this.vertices.length;
  }

  // gets edge by index, edges are considered counterclockwise
  public getEdge(edgeIndex: number, vertices = this.vertices) {
    return [vertices[edgeIndex], vertices[(edgeIndex + 1) % this.edgeAmt()]];
  }

  // determines the center of the polygon
  public determineCenter() {
    const summedVecs = this.vertices.reduce((a, b) => {
      const out = vec2.create();
      vec2.add(out, a, b);
      return out;
    });
    summedVecs[0] = summedVecs[0] / this.vertices.length;
    summedVecs[1] = summedVecs[1] / this.vertices.length;
    this.center = summedVecs;
    this.recalculateCenter = false;
  }

  public getCenter() {
    if (this.recalculateCenter) this.determineCenter();
    return this.center;
  }

  // calcs area
  public getArea() {
    if (this.vertices.length == 0) return this.area;
    if (this.area == Number.POSITIVE_INFINITY) {
      let areaSum = 0;
      for (let index = 0; index < this.edgeAmt(); index++) {
        const edge = this.getEdge(index);
        areaSum += edge[0][0] * edge[1][1] - edge[1][0] * edge[0][1];
      }
      areaSum *= 0.5;
      this.area = areaSum;
      return this.area;
    } else {
      return this.area;
    }
  }

  // performes counterclockwise roatation transformation
  public rotatePolygon(rad: number) {
    if (this.recalculateCenter) this.determineCenter();
    this.transformedVertices.forEach((vec) =>
      vec2.rotate(vec, vec, this.center, rad)
    );
  }
  public pointInPolygon(point: vec2, vertices = this.vertices) {
    //https://towardsdatascience.com/is-the-point-inside-the-polygon-574b86472119
    let sideOfEdge = 0;
    for (let index = 0; index < this.edgeAmt(); index++) {
      const edge = this.getEdge(index, vertices);
      let onSideOfCurrentEdge =
        (point[1] - edge[0][1]) * (edge[1][0] - edge[0][0]) -
        (point[0] - edge[0][0]) * (edge[1][1] - edge[0][1]);
      if (Math.abs(onSideOfCurrentEdge) <= 0.00001) onSideOfCurrentEdge = 0; // somwhat random epsilon
      if (sideOfEdge * onSideOfCurrentEdge < 0) {
        return false;
      }
      if (onSideOfCurrentEdge != 0) sideOfEdge = onSideOfCurrentEdge;
    }
    return true;
  }

  public closestPointOnPoly(point: vec2, vertices = this.vertices) {
    const pointsOnEdges: vec2[] = [];
    for (let index = 0; index < this.edgeAmt(); index++) {
      pointsOnEdges.push(this.closestPointOnEdge(index, point, vertices));
    }
    let minDistance = Number.POSITIVE_INFINITY;
    let minIndex = 0;
    for (let index = 0; index < pointsOnEdges.length; index++) {
      const element = pointsOnEdges[index];
      const dist = vec2.dist(point, element);
      if (dist < minDistance) {
        minDistance = dist;
        minIndex = index;
      }
    }
    return pointsOnEdges[minIndex];
  }

  public closestPointOnEdge(
    edgeIdx: number,
    point: vec2,
    vertices = this.vertices
  ) {
    // https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
    const edge = this.getEdge(edgeIdx, vertices);
    // v1 edge start to query point
    const v1 = vec2.subtract(vec2.create(), point, edge[0]);
    // v2 is edgestart to end
    const v2 = vec2.subtract(vec2.create(), edge[1], edge[0]);

    const dotV1Edge = vec2.dot(v1, v2);
    const dotEdgeRatio = dotV1Edge / vec2.len(v2);

    //if ratio is higher than 1 it means were outside towards edge end
    if (dotEdgeRatio > 1) {
      return vec2.fromValues(edge[1][0], edge[1][1]);
    }
    //if its below 0 it is outside on towards edge start
    if (dotEdgeRatio < 0) {
      return vec2.fromValues(edge[0][0], edge[0][1]);
    }
    // otherwise its on the edge
    return vec2.add(
      vec2.create(),
      edge[0],
      vec2.multiply(
        vec2.create(),
        v2,
        vec2.fromValues(dotEdgeRatio, dotEdgeRatio)
      )
    );
  }
}
