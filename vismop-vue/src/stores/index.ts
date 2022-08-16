import _ from 'lodash';
import * as d3 from 'd3';
import { defineStore } from 'pinia';
import { entry, graphData, networkxNodeLink } from '@/core/graphTypes';
import { ColType, glyphData } from '@/core/generalTypes';
import { reactomeEntry } from '@/core/reactomeGraphs/reactomeTypes';
import { Loading } from 'quasar';

interface State {
  sideBarExpand: boolean;
  overviewData: { [key: string]: entry } | reactomeEntry[];
  targetDatabase: string;
  transcriptomicsTableHeaders: ColType[];
  transcriptomicsTableData: { [key: string]: string | number }[];

  proteomicsTableHeaders: ColType[];
  proteomicsTableData: { [key: string]: string | number }[];
  clickedNodes: {
    id: string;
    name: string;
    fcTranscript: number;
    fcProt: number;
    delete: unknown;
  }[];

  metabolomicsTableHeaders: ColType[];
  metabolomicsTableData: { [key: string]: string | number }[];
  usedSymbolCols: {
    transcriptomics: string;
    proteomics: string;
    metabolomics: string;
  };
  graphData: graphData;
  fcs: {
    [key: string]: {
      transcriptomics: number;
      proteomics: number;
      metabolomics: number;
    };
  };
  fcsReactome: {
    transcriptomics: { [key: string]: number };
    proteomics: { [key: string]: number };
    metabolomics: { [key: string]: number };
  };
  fcQuantiles: {
    transcriptomics: number[];
    proteomics: number[];
    metabolomics: number[];
  };
  fcScales: {
    transcriptomics: d3.ScaleDiverging<string, never>;
    proteomics: d3.ScaleDiverging<string, never>;
    metabolomics: d3.ScaleDiverging<string, never>;
  };
  interactionGraphData: networkxNodeLink;
  pathwayLayouting: {
    pathwayList: [{ text: string; value: string; title: string }];
    pathwayNodeDictionary: { [key: string]: string[] };
    nodePathwayDictionary: { [key: string]: string[] };
    pathwayNodeDictionaryClean: { [key: string]: (string | number)[] };
    rootIds: string[];
  };
  pathwayDropdown: { title: string; value: string; text: string };
  omicsRecieved: {
    proteomics: boolean;
    transcriptomics: boolean;
    metabolomics: boolean;
  };
  pathayAmountDict: {
    [key: string]: { genes: number; maplinks: number; compounds: number };
  };
  pathwayCompare: string[];
  glyphData: {
    [key: string]: glyphData;
  };
  glyphs: {
    url: { [key: string]: string };
    svg: { [key: string]: SVGElement };
  };
  moduleAreas: [number[]];
  keggChebiTranslate: { [key: string]: string[] };
}

export const useMainStore = defineStore('mainStore', {
  state: (): State => ({
    sideBarExpand: true,
    overviewData: null,
    targetDatabase: 'reactome',
    transcriptomicsTableHeaders: [],
    transcriptomicsTableData: [],
    proteomicsTableHeaders: [],
    proteomicsTableData: [],
    clickedNodes: [],
    metabolomicsTableHeaders: [],
    metabolomicsTableData: [],
    usedSymbolCols: { transcriptomics: '', proteomics: '', metabolomics: '' },
    graphData: {
      attributes: {},
      nodes: [],
      edges: [],
      cluster_rects: [[]],
      options: null,
    },
    fcs: {},
    fcsReactome: { transcriptomics: {}, proteomics: {}, metabolomics: {} },
    fcQuantiles: {
      transcriptomics: [0, 0],
      proteomics: [0, 0],
      metabolomics: [0, 0],
    },
    fcScales: {
      transcriptomics: d3.scaleDiverging(),
      proteomics: d3.scaleDiverging(),
      metabolomics: d3.scaleDiverging(),
    },
    interactionGraphData: {
      graph: { identities: [] },
      nodes: [{}],
      links: [{}],
    },
    pathwayLayouting: {
      pathwayList: [{ text: 'empty', value: 'empty', title: 'empty' }],
      pathwayNodeDictionary: {},
      nodePathwayDictionary: {},
      pathwayNodeDictionaryClean: {},
      rootIds: [],
    },
    pathwayDropdown: { title: '', value: '', text: '' },
    omicsRecieved: {
      transcriptomics: false,
      proteomics: false,
      metabolomics: false,
    },
    pathayAmountDict: {},
    pathwayCompare: [],
    glyphData: {},
    glyphs: { url: {}, svg: {} },
    moduleAreas: [[]],
    keggChebiTranslate: {},
  }),
  actions: {
    addClickedNode(val: { queryID: string; name: string }) {
      // TODO atm uniprot IDs will be used when no transcriptomics id is saved
      // TODO multiIDs will not work at the moment
      const idArray = val.queryID.split(';');
      const enteredKeys = this.clickedNodes.map((row) => {
        return row.id;
      });
      idArray.forEach((element) => {
        try {
          if (!enteredKeys.includes(element)) {
            this.appendClickedNode(val);
          }
        } catch (error) {
          console.log('click nodes: ', error);
        }
      });
    },
    addClickedNodeFromTable(row: { [key: string]: string }) {
      const id = row[this.usedSymbolCols.proteomics];
      const enteredKeys = this.clickedNodes.map((row) => {
        return row.id;
      });
      try {
        if (!enteredKeys.includes(id)) {
          this.appendClickedNode({ queryID: id, name: '' });
        }
      } catch (error) {
        console.log('click nodes: ', error);
      }
    },
    appendClickedNode(val: { queryID: string; name: string }) {
      let tableEntry = {
        id: '',
        name: '',
        fcTranscript: -1,
        fcProt: -1,
        delete: val,
      };
      if (this.targetDatabase === 'reactome') {
        tableEntry = {
          id: val.queryID,
          name: `${val.name}`,
          fcTranscript: -1,
          fcProt: this.fcsReactome.proteomics[val.queryID],
          delete: val,
        };
      }
      this.clickedNodes.push(tableEntry);
    },
    queryEgoGraps(val: number) {
      Loading.show();
      let ids: string[] = [];
      if (this.targetDatabase === 'reactome') {
        ids = this.clickedNodes.map((elem) => {
          return elem.id;
        });
      }
      fetch('/interaction_graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: ids, threshold: val }),
      })
        .then((response) => response.json())
        .then((content) => {
          this.interactionGraphData = content.interaction_graph;
          Loading.hide();
        });
    },
    setInteractionGraphData(val: networkxNodeLink) {
      this.interactionGraphData = val;
    },
    removeClickedNode(val: string) {
      console.log('removedNode', val);

      const indexNode = this.clickedNodes
        .map((row) => {
          return row.id;
        })
        .indexOf(val);
      console.log('removedNode', indexNode);
      if (indexNode > -1) {
        this.clickedNodes.splice(indexNode, 1);
      }
    },
    setTargetDatabase(val: string) {
      this.targetDatabase = val;
    },
    setOverviewData(val: { [key: string]: entry }) {
      this.overviewData = val;
    },

    setOmicsTableHeaders(payload: ColType[], omicsType: string) {
      if (omicsType == 'Transcriptomics') {
        this.transcriptomicsTableHeaders = payload;
      } else if (omicsType == 'Proteomics') {
        this.proteomicsTableHeaders = payload;
      } else if (omicsType == 'Metabolomics') {
        this.metabolomicsTableHeaders = payload;
      }
    },

    setOmicsTableData(
      payload: { [x: string]: string | number }[],
      omicsType: string
    ) {
      if (omicsType == 'Transcriptomics') {
        this.transcriptomicsTableData = payload;
      } else if (omicsType == 'Proteomics') {
        this.proteomicsTableData = payload;
      } else if (omicsType == 'Metabolomics') {
        this.metabolomicsTableData = payload;
      }
    },
    setTranscriptomicsTableHeaders(val: ColType[]) {
      this.transcriptomicsTableHeaders = val;
    },
    setTranscriptomicsTableData(val: { [x: string]: string | number }[]) {
      this.transcriptomicsTableData = val;
    },
    setProteomicsTableHeaders(val: ColType[]) {
      this.proteomicsTableHeaders = val;
    },
    setProteomicsTableData(val: { [x: string]: string | number }[]) {
      this.proteomicsTableData = val;
    },
    setMetabolomicsTableHeaders(val: ColType[]) {
      this.metabolomicsTableHeaders = val;
    },
    setMetabolomicsTableData(val: { [x: string]: string | number }[]) {
      this.metabolomicsTableData = val;
    },
    setUsedSymbolCols(val: {
      transcriptomics: string;
      proteomics: string;
      metabolomics: string;
    }) {
      this.usedSymbolCols = val;
    },
    setGraphData(val: graphData) {
      this.graphData = val;
    },
    setModuleAreas(val: [number[]]) {
      this.moduleAreas = val;
    },
    setFCS(val: {
      [x: string]: {
        transcriptomics: number;
        proteomics: number;
        metabolomics: number;
      };
    }) {
      this.fcs = val;
      console.log('fcs', val);
      const fcsTranscriptomics: number[] = [];
      const fcsProteomics: number[] = [];
      const fcsMetabolomics: number[] = [];

      for (const key in val) {
        const entry: {
          transcriptomics: string | number;
          proteomics: string | number;
          metabolomics: string | number;
        } = val[key];
        if (!(typeof entry.transcriptomics === 'string')) {
          fcsTranscriptomics.push(entry.transcriptomics);
        }
        if (!(typeof entry.proteomics === 'string')) {
          fcsProteomics.push(entry.proteomics);
        }
        if (!(typeof entry.metabolomics === 'string')) {
          fcsMetabolomics.push(entry.metabolomics);
        }
      }
      const fcsTranscriptomicsAsc = fcsTranscriptomics.sort((a, b) => a - b);
      const fcsProteomicsAsc = fcsProteomics.sort((a, b) => a - b);
      const fcsMetabolomicsAsc = fcsMetabolomics.sort((a, b) => a - b);

      // https://stackoverflow.com/a/55297611
      const quantile = (arr: number[], q: number) => {
        const pos = (arr.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base]);
        } else {
          return arr[base];
        }
      };
      const quantTranscriptomics = [
        quantile(fcsTranscriptomicsAsc, 0.05),
        quantile(fcsTranscriptomicsAsc, 0.95),
      ];
      const quantProteomics = [
        quantile(fcsProteomicsAsc, 0.05),
        quantile(fcsProteomicsAsc, 0.95),
      ];
      const quantMetabolomics = [
        quantile(fcsMetabolomicsAsc, 0.05),
        quantile(fcsMetabolomicsAsc, 0.95),
      ];

      const colorScaleTranscriptomics = d3
        .scaleDiverging((d) => d3.interpolateRdBu(1 - d))
        .domain([
          quantTranscriptomics[0],
          quantTranscriptomics[0] < 0.0 ? 0.0 : 1.0,
          quantTranscriptomics[1],
        ]);
      const colorScaleProteomics = d3
        .scaleDiverging((d) => d3.interpolateRdBu(1 - d))
        .domain([
          quantProteomics[0],
          quantProteomics[0] < 0.0 ? 0.0 : 1.0,
          quantProteomics[1],
        ]);
      const colorScaleMetabolomics = d3
        .scaleDiverging(d3.interpolatePRGn)
        .domain([
          quantMetabolomics[0],
          quantProteomics[0] < 0.0 ? 0.0 : 1.0,
          quantMetabolomics[1],
        ]);

      this.fcQuantiles = {
        transcriptomics: quantTranscriptomics,
        proteomics: quantProteomics,
        metabolomics: quantMetabolomics,
      };
      this.fcScales = {
        transcriptomics: colorScaleTranscriptomics,
        proteomics: colorScaleProteomics,
        metabolomics: colorScaleMetabolomics,
      };
    },
    setFCSReactome(val: {
      transcriptomics: { [key: string]: number };
      proteomics: { [key: string]: number };
      metabolomics: { [key: string]: number };
    }) {
      this.fcsReactome = val;
      console.log('fcs', val);
      const fcsTranscriptomicsAsc = Object.values(val.transcriptomics).sort(
        (a, b) => a - b
      );
      const fcsProteomicsAsc = Object.values(val.proteomics).sort(
        (a, b) => a - b
      );
      const fcsMetabolomicsAsc = Object.values(val.metabolomics).sort(
        (a, b) => a - b
      );
      console.log('metafc', fcsMetabolomicsAsc);
      // https://stackoverflow.com/a/55297611
      const quantile = (arr: number[], q: number) => {
        const pos = (arr.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base]);
        } else {
          return arr[base];
        }
      };
      const quantTranscriptomics = [
        quantile(fcsTranscriptomicsAsc, 0.05),
        quantile(fcsTranscriptomicsAsc, 0.95),
      ];
      const quantProteomics = [
        quantile(fcsProteomicsAsc, 0.05),
        quantile(fcsProteomicsAsc, 0.95),
      ];
      const quantMetabolomics = [
        quantile(fcsMetabolomicsAsc, 0.05),
        quantile(fcsMetabolomicsAsc, 0.95),
      ];

      const colorScaleTranscriptomics = d3
        .scaleDiverging(d3.interpolateRdBu)
        .domain([
          quantTranscriptomics[1],
          quantTranscriptomics[0] < 0.0 ? 0.0 : 1.0,
          quantTranscriptomics[0],
        ]);
      const colorScaleProteomics = d3
        .scaleDiverging(d3.interpolateRdBu)
        .domain([
          quantProteomics[1],
          quantProteomics[0] < 0.0 ? 0.0 : 1.0,
          quantProteomics[0],
        ]);
      const colorScaleMetabolomics = d3
        .scaleDiverging(d3.interpolatePRGn)
        .domain([
          quantMetabolomics[0],
          quantMetabolomics[0] < 0.0 ? 0.0 : 1.0,
          quantMetabolomics[1],
        ]);

      this.fcQuantiles = {
        transcriptomics: quantTranscriptomics,
        proteomics: quantProteomics,
        metabolomics: quantMetabolomics,
      };
      this.fcScales = {
        transcriptomics: colorScaleTranscriptomics,
        proteomics: colorScaleProteomics,
        metabolomics: colorScaleMetabolomics,
      };
    },
    setPathwayLayoutingReactome(val: {
      pathwayList: [{ text: string; value: string; title: string }];
      pathwayNodeDictionary: { [key: string]: string[] };
      rootIds: string[];
    }) {
      this.pathwayLayouting = {
        ...val,
        nodePathwayDictionary: val.pathwayNodeDictionary,
        pathwayNodeDictionaryClean: val.pathwayNodeDictionary,
        rootIds: val.rootIds,
      };
    },
    focusPathwayViaOverview(val: { nodeID: string; label: string }) {
      const valClean = val.nodeID.replace('path:', '');
      this.pathwayDropdown = {
        title: val.label,
        value: valClean,
        text: `${valClean}: ${val.label}`,
      };
    },
    focusPathwayViaDropdown(val: {
      title: string;
      value: string;
      text: string;
    }) {
      this.pathwayDropdown = val;
    },
    selectPathwayCompare(val: string[]) {
      val.forEach((element) => {
        const valClean = element.replace('path:', '');
        if (!this.pathwayCompare.includes(valClean))
          this.pathwayCompare.unshift(valClean);
      });
    },
    removePathwayCompare(val: string) {
      const idx = this.pathwayCompare.indexOf(val);
      this.pathwayCompare.splice(idx, 1);
    },
    setKeggChebiTranslate(val: { [key: string]: string[] }) {
      this.keggChebiTranslate = val;
    },
    setOmicsRecieved(val: {
      proteomics: boolean;
      transcriptomics: boolean;
      metabolomics: boolean;
    }) {
      this.omicsRecieved = val;
    },
    setPathayAmountDict(val: {
      [x: string]: {
        genes: number;
        maplinks: number;
        compounds: number;
      };
    }) {
      this.pathayAmountDict = val;
    },
    setGlyphData(val: { [key: string]: glyphData }) {
      this.glyphData = val;
    },
    setGlyphs(val: {
      url: {
        [x: string]: string;
      };
      svg: {
        [x: string]: SVGElement;
      };
    }) {
      this.glyphs = val;
    },
  },
});
