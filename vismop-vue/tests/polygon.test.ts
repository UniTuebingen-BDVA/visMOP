import assert from 'chai';
import { ConvexPolygon } from '../src/core/layouting/ConvexPolygon';
import { vec2 } from 'gl-matrix';

describe('Test Square Example of Polygon class', () => {
  const basicPoly = new ConvexPolygon();
  basicPoly.addVertex(0, 0);
  basicPoly.addVertex(1, 0);
  basicPoly.addVertex(1, 1);
  basicPoly.addVertex(0, 1);

  it(' adding four vertices should yield a poly with 4 edges ', () => {
    const edgeAmounts = basicPoly.edgeAmt();
    assert.assert.deepStrictEqual(edgeAmounts, 4);
  });
  it(' the center should be at the correct position', () => {
    basicPoly.determineCenter();
    assert.assert.deepStrictEqual(
      basicPoly.getCenter(),
      vec2.fromValues(0.5, 0.5)
    );
  });
  it(' calculates the area', () => {
    assert.assert.deepStrictEqual(basicPoly.getArea(), 1.0);
  });
  it(' Rotating by 45°', () => {
    basicPoly.rotatePolygon(Math.PI / 4);
    //V0 x
    assert.assert.closeTo(basicPoly.transformedVertices[0][0], 0.5, 0.0001);
    //V0 y
    assert.assert.closeTo(
      basicPoly.transformedVertices[0][1],
      -0.207107,
      0.0001
    );
    //V1 x
    assert.assert.closeTo(
      basicPoly.transformedVertices[1][0],
      1.207106,
      0.0001
    );
    //V1 y
    assert.assert.closeTo(basicPoly.transformedVertices[1][1], 0.5, 0.0001);
    //V2 x
    assert.assert.closeTo(basicPoly.transformedVertices[2][0], 0.5, 0.0001);
    //V2 y
    assert.assert.closeTo(
      basicPoly.transformedVertices[2][1],
      1.207106,
      0.0001
    );
    //V3 x
    assert.assert.closeTo(
      basicPoly.transformedVertices[3][0],
      -0.207107,
      0.0001
    );
    //V3 y
    assert.assert.closeTo(basicPoly.transformedVertices[3][1], 0.5, 0.0001);
    basicPoly.clearTransformation();
  });
  it(' scaling by 0.9', () => {
    basicPoly.scalePolygon(0.9);
    //V0 x
    assert.assert.closeTo(basicPoly.transformedVertices[0][0], 0.05, 0.0001);
    //V0 y
    assert.assert.closeTo(basicPoly.transformedVertices[0][1], 0.05, 0.0001);

    //V1 x
    assert.assert.closeTo(basicPoly.transformedVertices[1][0], 0.95, 0.0001);
    //V1 y
    assert.assert.closeTo(basicPoly.transformedVertices[1][1], 0.05, 0.0001);

    //V2 x
    assert.assert.closeTo(basicPoly.transformedVertices[2][0], 0.95, 0.0001);
    //V2 y
    assert.assert.closeTo(basicPoly.transformedVertices[2][1], 0.95, 0.0001);

    //V3 x
    assert.assert.closeTo(basicPoly.transformedVertices[3][0], 0.05, 0.0001);
    //V3 y
    assert.assert.closeTo(basicPoly.transformedVertices[3][1], 0.95, 0.0001);
    basicPoly.clearTransformation();
  });
  it(' check if point on edge is working', () => {
    // outside
    const queryPoint1 = vec2.fromValues(2, 0.25);
    const pointOnEdge10 = basicPoly.closestPointOnEdge(0, queryPoint1);
    assert.assert.closeTo(pointOnEdge10[0], 1, 0.0001);
    assert.assert.closeTo(pointOnEdge10[1], 0, 0.0001);
    const pointOnEdge11 = basicPoly.closestPointOnEdge(1, queryPoint1);
    assert.assert.closeTo(pointOnEdge11[0], 1, 0.0001);
    assert.assert.closeTo(pointOnEdge11[1], 0.25, 0.0001);
    const pointOnEdge12 = basicPoly.closestPointOnEdge(2, queryPoint1);
    assert.assert.closeTo(pointOnEdge12[0], 1, 0.0001);
    assert.assert.closeTo(pointOnEdge12[1], 1, 0.0001);
    const pointOnEdge13 = basicPoly.closestPointOnEdge(3, queryPoint1);
    assert.assert.closeTo(pointOnEdge13[0], 0, 0.0001);
    assert.assert.closeTo(pointOnEdge13[1], 0.25, 0.0001);

    // on polygon
    const queryPoint2 = vec2.fromValues(1, 1);
    const pointOnEdge20 = basicPoly.closestPointOnEdge(0, queryPoint2);
    assert.assert.closeTo(pointOnEdge20[0], 1, 0.0001);
    assert.assert.closeTo(pointOnEdge20[1], 0, 0.0001);
    const pointOnEdge21 = basicPoly.closestPointOnEdge(1, queryPoint2);
    assert.assert.closeTo(pointOnEdge21[0], 1, 0.0001);
    assert.assert.closeTo(pointOnEdge21[1], 1, 0.0001);
    const pointOnEdge22 = basicPoly.closestPointOnEdge(2, queryPoint2);
    assert.assert.closeTo(pointOnEdge22[0], 1, 0.0001);
    assert.assert.closeTo(pointOnEdge22[1], 1, 0.0001);
    const pointOnEdge23 = basicPoly.closestPointOnEdge(3, queryPoint2);
    assert.assert.closeTo(pointOnEdge23[0], 0, 0.0001);
    assert.assert.closeTo(pointOnEdge23[1], 1, 0.0001);

    // inside polygon
    const queryPoint3 = vec2.fromValues(0.5, 0.25);
    const pointOnEdge30 = basicPoly.closestPointOnEdge(0, queryPoint3);
    assert.assert.closeTo(pointOnEdge30[0], 0.5, 0.0001);
    assert.assert.closeTo(pointOnEdge30[1], 0, 0.0001);
    const pointOnEdge31 = basicPoly.closestPointOnEdge(1, queryPoint3);
    assert.assert.closeTo(pointOnEdge31[0], 1, 0.0001);
    assert.assert.closeTo(pointOnEdge31[1], 0.25, 0.0001);
    const pointOnEdge32 = basicPoly.closestPointOnEdge(2, queryPoint3);
    assert.assert.closeTo(pointOnEdge32[0], 0.5, 0.0001);
    assert.assert.closeTo(pointOnEdge32[1], 1, 0.0001);
    const pointOnEdge33 = basicPoly.closestPointOnEdge(3, queryPoint3);
    assert.assert.closeTo(pointOnEdge33[0], 0, 0.0001);
    assert.assert.closeTo(pointOnEdge33[1], 0.25, 0.0001);

    // outside negative values
    const queryPoint4 = vec2.fromValues(-2, 0.25);
    const pointOnEdge40 = basicPoly.closestPointOnEdge(0, queryPoint4);
    assert.assert.closeTo(pointOnEdge40[0], 0, 0.0001);
    assert.assert.closeTo(pointOnEdge40[1], 0, 0.0001);
    const pointOnEdge41 = basicPoly.closestPointOnEdge(1, queryPoint4);
    assert.assert.closeTo(pointOnEdge41[0], 1, 0.0001);
    assert.assert.closeTo(pointOnEdge41[1], 0.25, 0.0001);
    const pointOnEdge42 = basicPoly.closestPointOnEdge(2, queryPoint4);
    assert.assert.closeTo(pointOnEdge42[0], 0, 0.0001);
    assert.assert.closeTo(pointOnEdge42[1], 1, 0.0001);
    const pointOnEdge43 = basicPoly.closestPointOnEdge(3, queryPoint4);
    assert.assert.closeTo(pointOnEdge43[0], 0, 0.0001);
    assert.assert.closeTo(pointOnEdge43[1], 0.25, 0.0001);
  });
  it(' check if point on poly is working', () => {
    // outside
    const queryPoint1 = vec2.fromValues(2, 0.25);
    const pointOnPoly1 = basicPoly.closestPointOnPoly(queryPoint1);
    assert.assert.closeTo(pointOnPoly1[0], 1, 0.0001);
    assert.assert.closeTo(pointOnPoly1[1], 0.25, 0.0001);

    // inside
    const queryPoint2 = vec2.fromValues(0.2, 0.25);
    const pointOnPoly2 = basicPoly.closestPointOnPoly(queryPoint2);
    assert.assert.closeTo(pointOnPoly2[0], 0, 0.0001);
    assert.assert.closeTo(pointOnPoly2[1], 0.25, 0.0001);

    // outside negative val
    const queryPoint3 = vec2.fromValues(-2, 0.25);
    const pointOnPoly3 = basicPoly.closestPointOnPoly(queryPoint3);
    assert.assert.closeTo(pointOnPoly3[0], 0, 0.0001);
    assert.assert.closeTo(pointOnPoly3[1], 0.25, 0.0001);
  });
  it(' check if point in polygon function is working', () => {
    // without supplying the vertices argument non-transformed verts are used.
    // inside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(vec2.fromValues(0.5, 0.5)),
      true
    );
    // on edge
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(vec2.fromValues(1.0, 1.0)),
      true
    );
    // pos outside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(vec2.fromValues(10, 10)),
      false
    );
    // pos outside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(vec2.fromValues(-10, -10)),
      false
    );
    //rotate by 45°
    basicPoly.rotatePolygon(Math.PI / 4);
    // on transformedVerts
    // inside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(
        vec2.fromValues(0.5, 0.5),
        basicPoly.transformedVertices
      ),
      true
    );
    // on edge
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(
        vec2.fromValues(-0.207107, 0.5),
        basicPoly.transformedVertices
      ),
      true
    );
    // pos outside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(
        vec2.fromValues(10, 10),
        basicPoly.transformedVertices
      ),
      false
    );
    // pos outside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(
        vec2.fromValues(-10, -10),
        basicPoly.transformedVertices
      ),
      false
    );
    basicPoly.clearTransformation();
  });
});

describe('Test More Complex Example of Polygon class', () => {
  const basicPoly = new ConvexPolygon();
  basicPoly.addVertex(1, 0);
  basicPoly.addVertex(4, 0);
  basicPoly.addVertex(5, 1);
  basicPoly.addVertex(4, 2);
  basicPoly.addVertex(1, 2);
  basicPoly.addVertex(0, 1);

  it(' adding 6 vertices should yield a poly with 6 edges ', () => {
    const edgeAmounts = basicPoly.edgeAmt();
    assert.assert.deepStrictEqual(edgeAmounts, 6);
  });
  it(' the center should be at the correct position', () => {
    basicPoly.determineCenter();
    assert.assert.deepStrictEqual(
      basicPoly.getCenter(),
      vec2.fromValues(2.5, 1)
    );
  });
  it(' calculates the area', () => {
    assert.assert.deepStrictEqual(basicPoly.getArea(), 8.0);
  });
  it(' Rotating by 90°', () => {
    basicPoly.rotatePolygon(Math.PI / 2);
    //V0 x
    assert.assert.closeTo(basicPoly.transformedVertices[0][0], 3.5, 0.0001);
    //V0 y
    assert.assert.closeTo(basicPoly.transformedVertices[0][1], -0.5, 0.0001);
    //V1 x
    assert.assert.closeTo(basicPoly.transformedVertices[1][0], 3.5, 0.0001);
    //V1 y
    assert.assert.closeTo(basicPoly.transformedVertices[1][1], 2.5, 0.0001);
    //V2 x
    assert.assert.closeTo(basicPoly.transformedVertices[2][0], 2.5, 0.0001);
    //V2 y
    assert.assert.closeTo(basicPoly.transformedVertices[2][1], 3.5, 0.0001);
    //V3 x
    assert.assert.closeTo(basicPoly.transformedVertices[3][0], 1.5, 0.0001);
    //V3 y
    assert.assert.closeTo(basicPoly.transformedVertices[3][1], 2.5, 0.0001);
    //V4 x
    assert.assert.closeTo(basicPoly.transformedVertices[4][0], 1.5, 0.0001);
    //V4 y
    assert.assert.closeTo(basicPoly.transformedVertices[4][1], -0.5, 0.0001);
    //V5 x
    assert.assert.closeTo(basicPoly.transformedVertices[5][0], 2.5, 0.0001);
    //V5 y
    assert.assert.closeTo(basicPoly.transformedVertices[5][1], -1.5, 0.0001);

    basicPoly.clearTransformation();
  });
  it(' check if point in polygon function is working', () => {
    // without supplying the vertices argument non-transformed verts are used.
    // inside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(vec2.fromValues(2.5, 1)),
      true
    );
    // on edge
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(vec2.fromValues(4.0, 0.0)),
      true
    );
    // pos outside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(vec2.fromValues(10, 10)),
      false
    );
    // pos outside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(vec2.fromValues(-10, -10)),
      false
    );
    basicPoly.rotatePolygon(Math.PI / 2);

    // on transformedVerts
    // inside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(
        vec2.fromValues(2.5, 1),
        basicPoly.transformedVertices
      ),
      true
    );
    // on edge
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(
        vec2.fromValues(3.5, -0.5),
        basicPoly.transformedVertices
      ),
      true
    );
    // pos outside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(
        vec2.fromValues(10, 10),
        basicPoly.transformedVertices
      ),
      false
    );
    // pos outside
    assert.assert.deepStrictEqual(
      basicPoly.pointInPolygon(
        vec2.fromValues(-10, -10),
        basicPoly.transformedVertices
      ),
      false
    );
    basicPoly.clearTransformation();
  });
  it(' check if non optimal boundingBox is working', () => {
    const boundingBox = basicPoly.calculateCurrentBoundingBox();
    assert.assert.deepStrictEqual(boundingBox.getArea(), 10);
  });
  it(' check if optimal boundingBox is working', () => {
    basicPoly.clearTransformation();
    basicPoly.rotatePolygon(Math.PI / 4);
    basicPoly.applyTransformation();
    const boundingBox = basicPoly.getBoundingBox();
    assert.assert.closeTo(boundingBox.getArea(), 10, 0.00001);
  });
});
