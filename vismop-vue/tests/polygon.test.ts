import assert from 'chai';
import { Polygon } from '../src/core/layouting/Polygon';
import { vec2 } from 'gl-matrix';

describe('Polygon class', () => {
  const basicPoly = new Polygon();
  basicPoly.addVertex(0, 0);
  basicPoly.addVertex(1, 0);
  basicPoly.addVertex(1, 1);
  basicPoly.addVertex(0, 1);
  it(' adding four verices should yield a poly with 4 edges ', () => {
    const edgeAmounts = basicPoly.edgeAmt();
    assert.assert.deepStrictEqual(edgeAmounts, 4);
  });
  it(' the center should be at the correct position', () => {
    basicPoly.determineCenter();
    assert.assert.deepStrictEqual(basicPoly.center, vec2.fromValues(0.5, 0.5));
  });
  it(' Rotating by 45°', () => {
    basicPoly.rotatePolygon(Math.PI / 2);
    //V1 x
    assert.assert.closeTo(basicPoly.rotatedVertices[0][0], -0.207107, 0.0001);
  });
});
