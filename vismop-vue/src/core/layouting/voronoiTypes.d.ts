import { vec2 } from 'gl-matrix';

type cluster = {
  id: number;
  weight: number;
  initX: number;
  initY: number;
};

type clusterData = cluster[];

type rectangle = {
  data: [vec2, vec2, vec2, vec2];
};
