// https://reactome.org/dev/diagram/pathway-diagram-specs for infos
// types describing data structures in the reactome json files and detail diagrams
/*
Basic Types
*/

/**
 * Type corresponding to all the information needed for the construction of a single pathway glyph
 */
/**
 *  Type corresponding to a single pathway and one type of omics
 */
type omicsData = {
  available: boolean;
  measurements: measure[];
  meanMeasure: number;
  nodeState: { total: number; regulated: number };
};

/**
 * Type corresponding to all the information needed for the construction of a single pathway glyph
 */
export type glyphData = {
  pathwayID: string;
  proteomics: omicsData;
  metabolomics: omicsData;
  transcriptomics: omicsData;
};

type form = {
  name: string;
  toplevelId: number[];
};

type regressionData = {
  slope: number;
  intercept: number;
  r2: number;
  p_value: number;
  std_err: number;
};

type measure = {
  queryId: string;
  value: number;
  regressionData: regressionData;
  name: string;
  forms: { [key: string]: form };
};
type omicsEntry = {
  measured: { [key: string]: measure };
  total: number;
};
type reactomeEntry = {
  entries: {
    proteomics: omicsEntry;
    transcriptomics: omicsEntry;
    metabolomics: omicsEntry;
  };
  pathwayId: string;
  isCentral: boolean;
  clusterNum: number;
  rootId: string;
  initialPosX: number;
  initialPosY: number;
  pathwayName: string;
  maplinks: { [key: string]: { own_id: number; toplevel_id: number } };
  subtreeIds: string[];
  parents: string[];
  children: string[];
  isOverview: boolean;
  nodeType: 'root' | 'regular' | 'hierarchical' | 'cluster';
  ownMeasuredEntryIDs: {
    proteomics: string[];
    transcriptomics: string[];
    metabolomics: string[];
  };
  insetPathwayEntryIDs: {
    proteomics: { [key: number]: { stableID: string; nodes: string[] } };
    transcriptomics: { [key: number]: { stableID: string; nodes: string[] } };
    metabolomics: { [key: number]: { stableID: string; nodes: string[] } };
  };
};

type graphNode = {
  schemaClass: string;
  dbId: number;
  stId: string;
  speciesID: number;
  displayName: string;
};

type entityNode = graphNode & {
  identifier: string;
  parents: number[];
  children: number[];
  geneNames: string[];
  diagramIds: number[];
};

type subpathwayNode = {
  dbId: number;
  stId: string;
  events: number[];
  displayName: string;
};

type eventNode = graphNode & {
  catalysts: number[];
  inhibitors: number[];
  activators: number[];
  inputs: number[];
  outputs: number[];
  diagramIds: number[];
  preceding: number[];
  following: number[];
  requirements: number[];
};

type coordinate = {
  x: number;
  y: number;
};

type coordinateBound = coordinate & {
  width: number;
  height: number;
};

type color = {
  r: number;
  b: number;
  g: number;
};

type shape = {
  r: number;
  b: coordinate;
  a: coordinate;
  c: coordinate;
  s: string;
  r1: number;
  empty: boolean;
  type: string;
};

type segment = {
  from: coordinate;
  to: coordinate;
};

type connector = {
  edgeId: number;
  segments: segment[];
  endShape: shape;
  stoichiometry: { shape: shape; value: number };
  isDisease: boolean;
  isFadeOut: boolean;
  type: string;
};

type reactomeNodeAttachment = {
  reactomeId: number;
  label: string;
  description: string;
  shape: shape;
};

type reactionPart = {
  stoichiometry: number;
  points: coordinate[];
  id: number;
};

/*
Core Node and Edge Classes
*/

type reactomeDiagramObject = {
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
};

type reactomeNodeCommon = {
  prop: coordinateBound;
  innerProp: coordinateBound;
  identifier: { resource: string; id: string };
  textPosition: coordinate;
  insets: coordinateBound;
  bgColor: color;
  fgColor: color;
  isCrossed: boolean;
  needDashedBorder: boolean;
};

type reactomeEdgeCommon = {
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
};

/*
More Specific Node and Edge classes
*/

type reactomeNode = reactomeDiagramObject &
  reactomeNodeCommon & {
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
  };

type reactomeNote = reactomeNodeCommon & reactomeDiagramObject;

type reactomeEdge = reactomeEdgeCommon & reactomeDiagramObject;

type reactomeLink = reactomeEdgeCommon & reactomeDiagramObject;

type reactomeCompartment = reactomeNodeCommon &
  reactomeDiagramObject & {
    compontentIds: number[];
  };

type reactomeShadow = reactomeDiagramObject & {
  prop: coordinateBound;
  points: coordinate[];
  colour: string;
};

/*
Main JSON File definitions
*/

type graphJSON = {
  nodes: { [key: number]: entityNode };
  edges: { [key: number]: eventNode };
  subpathways: { [key: number]: eventNode };
  dbId: number;
  stId: string;
};

type layoutJSON = {
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
};

/*
Misc. classes needed for detail View.
*/

type measureByType = {
  proteomics: { [key: number]: number };
  transcriptomics: { [key: number]: number };
  metabolomics: { [key: number]: number };
};

type measureById = {
  [key: number]: glyphData;
};
