// https://reactome.org/dev/diagram/pathway-diagram-specs for infos

/*
Basic Types
*/

import { glyphData } from "../core/generalTypes";

interface form {
  name: string;
  toplevelId: number[];
}

interface measure {
  queryId: string;
  value: number;
  name: string;
  forms: { [key: string]: form };
}
interface omicsEntry {
  measured: { [key: string]: measure };
  total: number;
}
interface reactomeEntry {
  entries: {
    proteomics: omicsEntry;
    transcriptomics: omicsEntry;
    metabolomics: omicsEntry;
  };
  pathwayId: string;
  rootId: string;
  pathwayName: string;
  maplinks: { [key: string]: { own_id: number; toplevel_id: number } };
  subtreeIds: string[];
}

interface graphNode {
  schemaClass: string;
  dbId: number;
  stId: string;
  speciesID: number;
  displayName: string;
}

interface entityNode extends graphNode {
  identifier: string;
  parents: number[];
  children: number[];
  geneNames: string[];
  diagramIds: number[];
}

interface subpathwayNode {
  dbId: number;
  stId: string;
  events: number[];
  displayName: string;
}

interface eventNode extends graphNode {
  catalysts: number[];
  inhibitors: number[];
  activators: number[];
  inputs: number[];
  outputs: number[];
  diagramIds: number[];
  preceding: number[];
  following: number[];
  requirements: number[];
}

export interface coordinate {
  x: number;
  y: number;
}

export interface coordinateBound extends coordinate {
  width: number;
  height: number;
}

export interface color {
  r: number;
  b: number;
  g: number;
}

export interface shape {
  r: number;
  b: coordinate;
  a: coordinate;
  c: coordinate;
  s: string;
  r1: number;
  empty: boolean;
  type: string;
}

export interface segment {
  from: coordinate;
  to: coordinate;
}

export interface connector {
  edgeId: number;
  segments: segment[];
  endShape: shape;
  stoichiometry: { shape: shape; value: number };
  isDisease: boolean;
  isFadeOut: boolean;
  type: string;
}

export interface reactomeNodeAttachment {
  reactomeId: number;
  label: string;
  description: string;
  shape: shape;
}

export interface reactionPart {
  stoichiometry: number;
  points: coordinate[];
  id: number;
}

/*
Core Node and Edge Classes
*/

export interface reactomeDiagramObject {
  reactomeId: number;
  schemaClass: string;
  renderableClass: string;
  position: coordinate;
  isDisease: boolean;
  isFadeOut: boolean;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: number;
  displayName: string;
}

export interface reactomeNodeCommon {
  prop: coordinateBound;
  innerProp: coordinateBound;
  identifier: { resource: string; id: string };
  textPosition: coordinate;
  insets: coordinateBound;
  bgColor: color;
  fgColor: color;
  isCrossed: boolean;
  needDashedBorder: boolean;
}

export interface reactomeEdgeCommon {
  segments: segment[];
  endShape: shape;
  catalysts: reactionPart[];
  inhibitors: reactionPart[];
  activators: reactionPart[];
  precedingEvents: number[];
  reactionType: string;
  followingEvents: number[];
  interactionType: string;
  reactionShape: shape;
  inputs: reactionPart[];
  outputs: reactionPart[];
}

/*
More Specific Node and Edge classes
*/

export interface reactomeNode
  extends reactomeDiagramObject,
    reactomeNodeCommon {
  nodeAttachments: reactomeNodeAttachment[];
  interactorsSummary: {
    pressed: boolean;
    shape: shape;
    hit: boolean;
    type: string;
    number: number;
  };
  trivial: boolean;
  connectors: connector[];
}

export interface reactomeNote
  extends reactomeNodeCommon,
    reactomeDiagramObject {}

export interface reactomeEdge
  extends reactomeEdgeCommon,
    reactomeDiagramObject {}

export interface reactomeLink
  extends reactomeEdgeCommon,
    reactomeDiagramObject {}

export interface reactomeCompartment
  extends reactomeNodeCommon,
    reactomeDiagramObject {
  compontentIds: number[];
}

export interface reactomeShadow extends reactomeDiagramObject {
  prop: coordinateBound;
  points: coordinate[];
  colour: string;
}

/*
Main JSON File definitions
*/

export interface graphJSON {
  nodes: { [key: number]: entityNode };
  edges: { [key: number]: eventNode };
  subpathways: { [key: number]: eventNode };
  dbId: number;
  stId: string;
}

export interface layoutJSON {
  nodes: reactomeNode[];
  isDisease: boolean;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  notes: reactomeNote[];
  edges: reactomeEdge[];
  links: reactomeLink[];
  compartments: reactomeCompartment[];
  shadows: reactomeShadow[];
  dbId: number;
  stableId: string;
  cPicture: string;
  forNormalDraw: boolean;
  displayName: string;
}

/*
Misc. classes needed for detail View.
*/

export interface foldChangesByType {
  proteomics: { [key: number]: number };
  transcriptomics: { [key: number]: number };
  metabolomics: { [key: number]: number };
}

export interface foldChangesByID {
  [key: number]: glyphData;
}
