
export interface edge { key: string, source: string, target: string, attributes: { color: string, type: string} }
export interface node { key: any, attributes: { name: string, x: number, y: number, color: string,secondaryColor: string, size: number, fixed: boolean, type: string } }
export interface graphData { attributes: { name: string }, nodes: node[], edges: edge[] }
export interface relation { relation_ID: string, source: string, target: string, relation_type: string, edgeType: string }
export interface entry { name: string, entry_type: string, kegg_ID: string, isempty: boolean, initial_pos_x: number, initial_pos_y: number, outgoing_edges: relation[], trascriptomicsValue: number|string, proteomicsValue: number|string }

