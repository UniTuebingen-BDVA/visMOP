import { EdgeDisplayData } from 'sigma/types';

export interface BezierEdgeDisplayData extends EdgeDisplayData {
  bezeierControlPoints: number[];
  showBundling: boolean;
  type: string;
}
