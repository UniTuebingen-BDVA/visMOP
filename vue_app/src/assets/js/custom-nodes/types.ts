import { NodeDisplayData, EdgeDisplayData } from "sigma/types";

export interface SplitNodeDisplayData extends NodeDisplayData {
    secondaryColor: string;
    outlineColor: string
}

export interface ColorfadeEdgeDisplayData extends EdgeDisplayData {
    sourceColor: string;
    targetColor: string
}