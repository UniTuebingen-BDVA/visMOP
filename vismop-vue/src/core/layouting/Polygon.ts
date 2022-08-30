import { vec2 } from 'gl-matrix';
export class Polygon {
  public vertices: vec2[] = [];
  public rotatedVertices: vec2[] = [];
  private recalculateCenter = true;
  public center: vec2 = vec2.create();

  public addVertex(x: number, y: number) {
    const vertex = vec2.fromValues(x, y);
    this.vertices.push(vertex);
    this.rotatedVertices.push(vec2.clone(vertex));
  }

  public edgeAmt() {
    return this.vertices.length;
  }

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

  public rotatePolygon(rad: number) {
    if (this.recalculateCenter) this.determineCenter();
    this.rotatedVertices.forEach((vec) =>
      vec2.rotate(vec, vec, this.center, rad)
    );
  }
}
