import _ from 'lodash';
import * as d3 from 'd3';
import { defineStore } from 'pinia';
import { entry, graphData, networkxNodeLink } from '@/core/graphTypes';
import { ColType, glyphData } from '@/core/generalTypes';
import { reactomeEntry } from '@/core/reactomeGraphs/reactomeTypes';
import { Loading } from 'quasar';

interface State {
  sideBarExpand: boolean;
  overviewData: { [key: string]: reactomeEntry };
  targetDatabase: string;

  tableHeaders: {
    transcriptomics: ColType[];
    proteomics: ColType[];
    metabolomics: ColType[];
  };
  tableData: {
    transcriptomics: { [key: string]: string | number }[];
    proteomics: { [key: string]: string | number }[];
    metabolomics: { [key: string]: string | number }[];
  };

  clickedNodes: {
    id: string;
    name: string;
    fcTranscript: number;
    fcProt: number;
    delete: unknown;
  }[];

  usedSymbolCols: {
    transcriptomics: string;
    proteomics: string;
    metabolomics: string;
  };
  graphData: graphData;
  fcs: {
    [key: string]: {
      transcriptomics: number[];
      proteomics: number[];
      metabolomics: number[];
    };
  };
  fcsReactome: {
    transcriptomics: { [key: string]: number[] };
    proteomics: { [key: string]: number[] };
    metabolomics: { [key: string]: number[] };
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
  pathwayCompare: { id: number; pathway: string }[];
  glyphData: {
    [key: string]: glyphData;
  };
  glyphs: {
    url: { [key: string]: string };
    svg: { [key: string]: SVGElement };
  };
  moduleAreas: [number[]];
  modules: string[][];
  noiseClusterExists: boolean;
  moduleCenters: [number, number][];
  keggChebiTranslate: { [key: string]: string[] };
}

export const useMainStore = defineStore('mainStore', {
  state: (): State => ({
    sideBarExpand: true,
    overviewData: {},
    targetDatabase: 'reactome',
    clickedNodes: [],
    tableHeaders: { transcriptomics: [], proteomics: [], metabolomics: [] },
    tableData: { transcriptomics: [], proteomics: [], metabolomics: [] },
    usedSymbolCols: { transcriptomics: '', proteomics: '', metabolomics: '' },
    graphData: {
      attributes: {},
      nodes: [],
      edges: [],
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
    modules: [],
    noiseClusterExists: false,
    moduleCenters: [],
    keggChebiTranslate: {},
  }),
  actions: {
    resetStore() {
      this.resetPathwayCompare();
    },
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
      const indexNode = this.clickedNodes
        .map((row) => {
          return row.id;
        })
        .indexOf(val);
      if (indexNode > -1) {
        this.clickedNodes.splice(indexNode, 1);
      }
    },
    setTargetDatabase(val: string) {
      this.targetDatabase = val;
    },
    setOverviewData(val: { [key: string]: reactomeEntry }) {
      this.overviewData = val;
    },

    setOmicsTableHeaders(
      payload: ColType[],
      omicsType: 'transcriptomics' | 'proteomics' | 'metabolomics'
    ) {
      this.tableHeaders[omicsType] = payload;
    },

    setOmicsTableData(
      payload: { [x: string]: string | number }[],
      omicsType: 'transcriptomics' | 'proteomics' | 'metabolomics'
    ) {
      this.tableData[omicsType] = payload;
    },

    setAvailables(
      omicsType: 'transcriptomics' | 'proteomics' | 'metabolomics'
    ) {
      let available = 0;
      let total = 0;

      this.tableData[omicsType].forEach(
        (row: { [key: string]: string | number }) => {
          total += 1;
          const symbol = row[this.usedSymbolCols[omicsType]];
          let pathwaysContaining: string[] = [];
          if (omicsType === 'metabolomics') {
            pathwaysContaining = [];
            const keggChebiConvert =
              Object.keys(this.keggChebiTranslate).length > 0;

            if (keggChebiConvert) {
              const chebiIDs = this.keggChebiTranslate[symbol];
              if (chebiIDs) {
                chebiIDs.forEach((element: string) => {
                  try {
                    pathwaysContaining.push(
                      ...this.pathwayLayouting.nodePathwayDictionary[element]
                    );
                  } catch (error) {
                    //
                  }
                });
              }
            } else {
              pathwaysContaining =
                this.pathwayLayouting.nodePathwayDictionary[symbol];
            }
          } else {
            pathwaysContaining =
              this.pathwayLayouting.nodePathwayDictionary[symbol];
          }
          row._reserved_available = pathwaysContaining
            ? pathwaysContaining.length
            : 0;
          if (pathwaysContaining) available += 1;
        }
      );
      this.tableHeaders[omicsType].forEach((entry: ColType) => {
        if (entry?.name === '_reserved_available') {
          entry.label = `available (${available} of ${total})`;
        }
      });
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
    setModules(val: string[][]) {
      this.modules = val;
    },
    setNoiseClusterExists(val: boolean) {
      this.noiseClusterExists = val;
    },
    setModuleCenters(val: [number, number][]) {
      this.moduleCenters = val;
    },
    setFCS(val: {
      [x: string]: {
        transcriptomics: number[];
        proteomics: number[];
        metabolomics: number[];
      };
    }) {
      this.fcs = val;
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
        //.scaleDiverging(d3.interpolatePRGn) // try rdbu aswell
        .scaleDiverging((d) => d3.interpolateRdBu(1 - d))
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
      transcriptomics: { [key: string]: number[] };
      proteomics: { [key: string]: number[] };
      metabolomics: { [key: string]: number[] };
    }) {
      this.fcsReactome = val;
      const fcsTranscriptomicsAsc = Object.values(val.transcriptomics)
        .flat()
        .sort((a, b) => a - b);
      const fcsProteomicsAsc = Object.values(val.proteomics)
        .flat()
        .sort((a, b) => a - b);
      const fcsMetabolomicsAsc = Object.values(val.metabolomics)
        .flat()
        .sort((a, b) => a - b);
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
        .scaleDiverging(d3.interpolateRdBu)
        .domain([
          quantMetabolomics[1],
          quantMetabolomics[0] < 0.0 ? 0.0 : 1.0,
          quantMetabolomics[0],
        ]);
      // .scaleDiverging(d3.interpolatePRGn) // try rdbu aswell
      // .domain([
      //   quantMetabolomics[0],
      //   quantMetabolomics[0] < 0.0 ? 0.0 : 1.0,
      //   quantMetabolomics[1],
      // ]);

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
        let id = 0;
        for (let index = 0; index <= this.pathwayCompare.length; index++) {
          if (!this.pathwayCompare.some((elem) => elem.id == index)) {
            id = index;
            break;
          }
        }
        if (!this.pathwayCompare.some((elem) => elem.pathway == valClean))
          this.pathwayCompare.unshift({ id: id, pathway: valClean });
      });
    },
    resortPathwayCompare(from: number, to: number) {
      const tarPathway = this.pathwayCompare.splice(from, 1)[0];
      this.pathwayCompare.splice(to, 0, tarPathway);
    },
    removePathwayCompare(val: string) {
      const idx = this.pathwayCompare.findIndex((elem) => elem.pathway == val);
      this.pathwayCompare.splice(idx, 1);
    },
    resetPathwayCompare() {
      this.pathwayCompare = [];
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
