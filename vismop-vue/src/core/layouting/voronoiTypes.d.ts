import { vec2 } from 'gl-matrix';

type cluster = {
  id: number;
  weight: number;
};

type clusterData = cluster[];

type rectangle = {
  data: [vec2, vec2, vec2, vec2];
};
