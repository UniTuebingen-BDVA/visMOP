import { vec2 } from 'gl-matrix';
import { Polygon } from './Polygon';
export class ConvexPolygon extends Polygon {
  // vertices are considered counterclockwise
  boundingBox: Polygon = new Polygon();

  // applies current transformation to vertex arrays
  applyTransformation() {
    super.applyTransformation();
    this.calculateOptimalBoundingBox();
  }

  calculateOptimalBoundingBox() {
    // https://github.com/Glissando/Rotating-Calipers

    this.clearTransformation();

    // calc bb with calipers
    for (let index = 0; index < this.edgeAmt(); index++) {
      const edge = this.getEdge(index, this.transformedVertices);
      const normalized = vec2.normalize(
        vec2.create(),
        vec2.subtract(vec2.create(), edge[1], edge[0])
      );
      const rotateToXRad = Math.acos(normalized[0]);
      this.rotatePolygon(rotateToXRad);
      const currentBoundingBox = this.calculateCurrentBoundingBox();
      currentBoundingBox.getArea();
      if (currentBoundingBox.getArea() < this.boundingBox.getArea()) {
        currentBoundingBox.rotatePolygon(-rotateToXRad);
        this.boundingBox = currentBoundingBox;
      }
    }
    this.clearTransformation();
  }

  getBoundingBox() {
    if (this.boundingBox.getArea() == Number.POSITIVE_INFINITY) {
      this.calculateOptimalBoundingBox();
    }
    return this.boundingBox;
  }

  calculateCurrentBoundingBox() {
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    this.transformedVertices.forEach((vert) => {
      if (vert[0] < xMin) xMin = vert[0];
      if (vert[0] > xMax) xMax = vert[0];
      if (vert[1] < yMin) yMin = vert[1];
      if (vert[1] > yMax) yMax = vert[1];
    });
    const rectPoly = new Polygon();
    rectPoly.addVertices([
      [xMin, yMin],
      [xMax, yMin],
      [xMax, yMax],
      [xMin, yMax],
    ]);
    return rectPoly;
  }
}
