import { useMainStore } from '@/stores';
import _ from 'lodash';
import { glyphData, omicsData } from '../reactomeGraphs/reactomeTypes';

/**
 * Uses Omics Data from main pinia store and generates the data needed to draw the overview glyphs
 * @returns
 */
export function generateGlyphDataReactome(targetMeasurement: 'fc' | 'slope'): {
  [key: string]: glyphData;
} {
  const outGlyphData: { [key: string]: glyphData } = {};
  const mainStore = useMainStore();

  // contains pathway lists
  const omicsRecieved = mainStore.omicsRecieved;
  const overviewData = mainStore.overviewData;
  for (const pathwayID in overviewData) {
    const pathway = overviewData[pathwayID];
    const transcriptomicsData: omicsData = {
      available: omicsRecieved.transcriptomics,
      measurements: [],
      meanMeasure: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const proteomicsData: omicsData = {
      available: omicsRecieved.proteomics,
      measurements: [],
      meanMeasure: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const metabolomicsData: omicsData = {
      available: omicsRecieved.metabolomics,
      meanMeasure: 0,
      measurements: [],
      nodeState: { total: 0, regulated: 0 },
    };

    transcriptomicsData.nodeState.total = pathway.entries.transcriptomics.total;
    for (const measureKey in pathway.entries.transcriptomics.measured) {
      const entry = pathway.entries.transcriptomics.measured[measureKey];
      transcriptomicsData.measurements.push(entry);
      transcriptomicsData.nodeState.regulated += 1;
    }

    proteomicsData.nodeState.total = pathway.entries.proteomics.total;
    for (const measureKey in pathway.entries.proteomics.measured) {
      const entry = pathway.entries.proteomics.measured[measureKey];
      proteomicsData.measurements.push(entry);
      proteomicsData.nodeState.regulated += 1;
    }

    metabolomicsData.nodeState.total = pathway.entries.metabolomics.total;
    for (const measureKey in pathway.entries.metabolomics.measured) {
      const entry = pathway.entries.metabolomics.measured[measureKey];
      metabolomicsData.measurements.push(entry);
      metabolomicsData.nodeState.regulated += 1;
    }

    const accessor =
      targetMeasurement === 'fc' ? 'value' : 'regressionData.slope';
    transcriptomicsData.measurements.sort(
      (a, b) => _.get(a, accessor) - _.get(b, accessor)
    );
    proteomicsData.measurements.sort(
      (a, b) => _.get(a, accessor) - _.get(b, accessor)
    );
    metabolomicsData.measurements.sort(
      (a, b) => _.get(a, accessor) - _.get(b, accessor)
    );
    transcriptomicsData.meanMeasure =
      transcriptomicsData.measurements.reduce(
        (a, b) => a + _.get(b, accessor),
        0
      ) / transcriptomicsData.measurements.length;
    proteomicsData.meanMeasure =
      proteomicsData.measurements.reduce((a, b) => a + _.get(b, accessor), 0) /
      proteomicsData.measurements.length;
    metabolomicsData.meanMeasure =
      metabolomicsData.measurements.reduce(
        (a, b) => a + _.get(b, accessor),
        0
      ) / metabolomicsData.measurements.length;

    outGlyphData[pathway.pathwayId] = {
      pathwayID: pathway.pathwayId,
      transcriptomics: transcriptomicsData,
      proteomics: proteomicsData,
      metabolomics: metabolomicsData,
    };
  }
  return outGlyphData;
}
