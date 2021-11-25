import { NodeDisplayData, EdgeDisplayData } from 'sigma/types'

export interface OutlineNodeDisplayData extends NodeDisplayData {
  outlineColor: string;
}

export interface SplitNodeDisplayData extends NodeDisplayData {
  secondaryColor: string;
  outlineColor: string;
}

export interface ColorfadeEdgeDisplayData extends EdgeDisplayData {
  sourceColor: string;
  targetColor: string;
}
