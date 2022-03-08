// https://reactome.org/dev/diagram/pathway-diagram-specs for infos

export interface graphJSON {

}

export interface layoutJSON {
  nodes : reactomeNode[]
  isDisease : boolean
  minX : number
  minY : number
  maxX : number
  maxY : number
  notes : reactomeNote[]
  edges : reactomeEdge[]
  links : reactomeLink[]
  compartments : reactomeCompartment[]
  shadows : reactomeShadow[]
  dbId : number
  stableId : string
  cPicture : string
  forNormalDraw : boolean
  displayName : string
}
export interface reactomeNode extends reactomeDiagramObject, reactomeNodeCommon {
  nodeAttachments : reactomeNodeAttachment[]
  interactorsSummary : {pressed: boolean, shape: shape, hit: boolean, type: string, number: number}
  trivial : boolean
  connectors : Connector[]
}

export interface reactomeNote extends reactomeNodeCommon, reactomeDiagramObject {

}

export interface reactomeEdge extends reactomeEdgeCommon, reactomeDiagramObject {

}

export interface reactomeLink extends reactomeEdgeCommon, reactomeDiagramObject {

}

export interface reactomeCompartment extends reactomeNodeCommon, reactomeDiagramObject {
  compontentIds: number[]
}

export interface reactomeShadow extends reactomeDiagramObject {
  prop: coordinateBound
  points: coordinate[]
  colour: string
}

export interface coordinate {
  x: number
  y: number
}

export interface coordinateBound extends coordinate {
  width: number
  height: number
}

export interface color {
  r: number
  b: number 
  g: number
}

export interface reactomeDiagramObject {
  reactomeId : number
  schemaClass : string
  renderableClass : string
  position : coordinate
  isDisease : boolean
  isFadeOut : boolean
  minX : number
  minY : number
  maxX : number
  maxY : number
  id : number
  displayName : string
}

export interface reactomeNodeCommon {
  prop : coordinateBound
  innerProp : coordinateBound
  identifier : {resource: string, id: string}
  textPosition : coordinate
  insets : coordinateBound
  bgColor : color
  fgColor : color
  isCrossed : Boolean
  needDashedBorder : Boolean
}

export interface reactomeEdgeCommon {
  segments : segment[]
  endShape : shape
  catalysts : reactionPart[]
  inhibitors : reactionPart[]
  activators : reactionPart[]
  precedingEvents : number[]
  reactionType : string
  followingEvents : number[]
  interactionType : string
  reactionShape : shape
  inputs : reactionPart[]
  outputs : reactionPart[]
}

export interface shape {
  r: number
  b: coordinate
  a: coordinate
  c: coordinate
  s: string
  r1: number
  empty: boolean
  type: string
}

export interface segment {
  from: coordinate
  to: coordinate
}

export interface connector{
  edgeId : number
  segments : segment[]
  endShape : shape
  stoichiometry : {shape: shape, value: number}
  isDisease : boolean
  isFadeOut : boolean
  type : string
}

export interface reactomeNodeAttachment {
  reactomeId : number
  label : string
  description : string
  shape: shape
}

export interface reactionPart {
  stoichiometry : number
  points : coordinate[]
  id : number
}
