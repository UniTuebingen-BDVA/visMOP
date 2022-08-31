import assert from 'chai';
import { ConvexPolygon } from '../src/core/layouting/ConvexPolygon';
import { vec2 } from 'gl-matrix';
import { bindAll } from 'lodash';

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
