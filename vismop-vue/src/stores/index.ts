import _ from 'lodash';
import * as d3 from 'd3';
import { defineStore } from 'pinia';
import { graphData } from '@/core/graphTypes';
import { ColType } from '@/core/generalTypes';
import {
  measure,
  reactomeEntry,
  glyphData,
} from '@/core/reactomeGraphs/reactomeTypes';

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
  usedSymbolCols: {
    transcriptomics: string;
    proteomics: string;
    metabolomics: string;
  };
  graphData: graphData;

  fcScales: {
    transcriptomics: d3.ScaleDiverging<string, never>;
    proteomics: d3.ScaleDiverging<string, never>;
    metabolomics: d3.ScaleDiverging<string, never>;
  };

  slopeScales: {
    transcriptomics: d3.ScaleDiverging<string, never>;
    proteomics: d3.ScaleDiverging<string, never>;
    metabolomics: d3.ScaleDiverging<string, never>;
  };

  pathwayList: [{ text: string; value: string; title: string }];
  queryToPathwayDictionary: { [key: string]: string[] };
  rootIds: string[];

  selectedPathway: string;
  detailDropdown: string;
  omicsRecieved: {
    proteomics: boolean;
    transcriptomics: boolean;
    metabolomics: boolean;
  };
  amtTimepoints: number;
  timepointMethod: 'aggregate' | 'individual';
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
  clusterData: {
    clusters: string[][];
    noiseClusterExists: boolean;
    clusterCenters: [number, number][];
  };

  keggChebiTranslate: { [key: string]: string[] };
}

export const useMainStore = defineStore('mainStore', {
  state: (): State => ({
    sideBarExpand: true,
    overviewData: {},
    targetDatabase: 'reactome',
    tableHeaders: { transcriptomics: [], proteomics: [], metabolomics: [] },
    tableData: { transcriptomics: [], proteomics: [], metabolomics: [] },
    usedSymbolCols: { transcriptomics: '', proteomics: '', metabolomics: '' },
    graphData: {
      attributes: {},
      nodes: [],
      edges: [],
      options: null,
    },

    fcScales: {
      transcriptomics: d3.scaleDiverging(),
      proteomics: d3.scaleDiverging(),
      metabolomics: d3.scaleDiverging(),
    },

    slopeScales: {
      transcriptomics: d3.scaleDiverging(),
      proteomics: d3.scaleDiverging(),
      metabolomics: d3.scaleDiverging(),
    },

    pathwayList: [{ text: 'empty', value: 'empty', title: 'empty' }],
    queryToPathwayDictionary: {},
    rootIds: [],

    selectedPathway: '',
    detailDropdown: '',
    omicsRecieved: {
      transcriptomics: false,
      proteomics: false,
      metabolomics: false,
    },
    amtTimepoints: 0,
    timepointMethod: 'aggregate',
    pathayAmountDict: {},
    pathwayCompare: [],
    glyphData: {},
    glyphs: { url: {}, svg: {} },
    clusterData: {
      clusters: [],
      noiseClusterExists: false,
      clusterCenters: [],
    },
    keggChebiTranslate: {},
  }),
  actions: {
    resetStore() {
      //this.$reset();
      this.pathwayCompare = [];
    },
    setTargetDatabase(val: string) {
      this.targetDatabase = val;
    },
    setOverviewData(val: { [key: string]: reactomeEntry }) {
      this.overviewData = val;
      this.setOmicsScales(val);
    },
    setAmtTimepoints(val: number) {
      this.amtTimepoints = val;
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
                      ...this.queryToPathwayDictionary[element]
                    );
                  } catch (error) {
                    //
                  }
                });
              }
            } else {
              pathwaysContaining = this.queryToPathwayDictionary[symbol];
            }
          } else {
            pathwaysContaining = this.queryToPathwayDictionary[symbol];
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
    setClusterData(val: {
      clusters: string[][];
      noiseClusterExists: boolean;
      clusterCenters: [number, number][];
    }) {
      this.clusterData = val;
    },

    /**
     * reduce the reactome data to a single object containing all the measured data
     * @param baseData
     * @param omicsType
     * @returns
     */
    reduceReactomeData(
      baseData: { [key: string]: reactomeEntry },
      omicsType: 'transcriptomics' | 'proteomics' | 'metabolomics'
    ) {
      return Object.keys(baseData)
        .map((key) => baseData[key].entries[omicsType].measured)
        .reduce(
          (acc, cur) => ({ ...acc, ...cur }),
          {} as { [key: string]: measure }
        );
    },

    /**
     * function to set the fold change scales for the omics data
     * @param baseData
     * @param omicsType
     * @returns
     */
    generateFoldChangeScale(
      baseData: { [key: string]: reactomeEntry },
      omicsType: 'transcriptomics' | 'proteomics' | 'metabolomics'
    ) {
      const data = this.reduceReactomeData(baseData, omicsType);
      const dataValues = Object.values(data).map((entry) => entry.value);
      return this.generateQuantileColorscale(dataValues, d3.interpolateRdBu);
    },

    /**
     * function to set the slope scales for the omics data
     * @param baseData
     * @param omicsType
     * @returns
     */
    generateSlopeScale(
      baseData: { [key: string]: reactomeEntry },
      omicsType: 'transcriptomics' | 'proteomics' | 'metabolomics'
    ) {
      const data = this.reduceReactomeData(baseData, omicsType);
      const dataValues = Object.values(data).map(
        (entry) => entry.regressionData.slope
      );
      return this.generateQuantileColorscale(dataValues, d3.interpolatePRGn);
    },

    /**
     * function to generate a quantile colorscale
     * @param dataValues
     * @param interpolator
     * @returns
     */
    generateQuantileColorscale(
      dataValues: number[],
      interpolator: (t: number) => string
    ) {
      const sortedValues = dataValues.sort((a, b) => a - b);

      const colorScale = d3
        .scaleDiverging(interpolator)
        .domain([
          d3.quantile(sortedValues, 0.05) as number,
          (d3.quantile(sortedValues, 0.05) as number) < 0.0 ? 0.0 : 1.0,
          d3.quantile(sortedValues, 0.95) as number,
        ]);

      return colorScale;
    },

    setOmicsScales(val: { [key: string]: reactomeEntry }) {
      this.fcScales = {
        transcriptomics: this.generateFoldChangeScale(val, 'transcriptomics'),
        proteomics: this.generateFoldChangeScale(val, 'proteomics'),
        metabolomics: this.generateFoldChangeScale(val, 'metabolomics'),
      };
      if (this.timepointMethod === 'aggregate' && this.amtTimepoints > 1) {
        this.slopeScales = {
          transcriptomics: this.generateSlopeScale(val, 'transcriptomics'),
          proteomics: this.generateSlopeScale(val, 'proteomics'),
          metabolomics: this.generateSlopeScale(val, 'metabolomics'),
        };
      }
    },
    setPathwayList(val: [{ text: string; value: string; title: string }]) {
      this.pathwayList = val;
    },
    setQueryToPathwayDictionary(val: { [key: string]: string[] }) {
      this.queryToPathwayDictionary = val;
    },
    setRootIds(val: string[]) {
      this.rootIds = val;
    },
    focusPathwayViaOverview(val: { nodeID: string; label: string }) {
      this.selectedPathway = val.nodeID.split('_')[0];
      this.detailDropdown = val.nodeID;
    },
    focusPathwayViaDropdown(val: {
      title: string;
      value: string;
      text: string;
    }) {
      this.selectedPathway = val.value.split('_')[0];
      this.detailDropdown = val.value;
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
