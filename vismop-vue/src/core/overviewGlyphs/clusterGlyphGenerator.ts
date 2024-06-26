import _ from 'lodash';
import { glyphData, omicsData } from '@/core/reactomeGraphs/reactomeTypes';
import { ClusterSummaryGlyph } from './clusterSummaryGlyph';

/**
 * Generates a glyph for each prepared data block in the supplied object
 * @param inputData glyph data
 * @param diameter target diamenter of glyphs
 * @returns object with urls and svgs for each glyph
 */
export function generateGlyphs(
  inputData: { [key: string]: glyphData },
  targetMeasurement: 'fc' | 'slope',
  diameter = 28,
  clusterNodeMapping: string[][]
): {
  [key: string]: string;
} {
  const outObjURL: { [key: string]: string } = {};
  const clusterGlyphData = generateClusterGlyphData(
    inputData,
    clusterNodeMapping
  );
  for (const key in clusterGlyphData) {
    if (Object.prototype.hasOwnProperty.call(clusterGlyphData, key)) {
      const element = clusterGlyphData[key];
      const serializer = new XMLSerializer();
      const currentGlyph = new ClusterSummaryGlyph(
        element,
        targetMeasurement,
        key,
        diameter
      );
      const glyphSVGstring = serializer.serializeToString(
        currentGlyph.generateGlyphSvg()
      );
      const svgBlob = new Blob([glyphSVGstring], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const svgURL = window.URL.createObjectURL(svgBlob);
      outObjURL[key] = svgURL;
    }
  }

  return outObjURL;
}

export function generateClusterGlyphData(
  inputData: { [key: string]: glyphData },
  clusterNodeMapping: string[][]
): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {};

  // contains pathway lists
  clusterNodeMapping.forEach((clusterNodes, clusterIndex) => {
    const transcriptomicsData: omicsData = {
      available: false,
      measurements: [],
      meanMeasure: 0,
      nodeState: { total: 0, regulated: 0 },
    };

    const proteomicsData: omicsData = {
      available: false,
      measurements: [],
      meanMeasure: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const metabolomicsData: omicsData = {
      available: false,
      measurements: [],
      meanMeasure: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const omicsDataArray: [
      omicsData,
      'transcriptomics' | 'metabolomics' | 'proteomics'
    ][] = [
      [transcriptomicsData, 'transcriptomics'],
      [proteomicsData, 'proteomics'],
      [metabolomicsData, 'metabolomics'],
    ];

    for (const pathwayKey of clusterNodes) {
      const glyphData = inputData[pathwayKey];

      omicsDataArray.forEach((arrEntry) => {
        if (glyphData[arrEntry[1]].available) {
          arrEntry[0].available = true;
          glyphData[arrEntry[1]].measurements.forEach((element) => {
            if (
              arrEntry[0].measurements.every(
                (entry) => entry.queryId !== element.queryId
              )
            ) {
              arrEntry[0].measurements.push(element);
            }
          });
        }
      });
    }
    omicsDataArray.forEach((arrEntry) => {
      const fcVals = arrEntry[0].measurements.map((elem) => elem.value);
      arrEntry[0].meanMeasure = _.mean(fcVals);
    });

    outGlyphData[clusterIndex] = {
      pathwayID: clusterIndex + '',
      transcriptomics: transcriptomicsData,
      proteomics: proteomicsData,
      metabolomics: metabolomicsData,
    };
  });
  return outGlyphData;
}
