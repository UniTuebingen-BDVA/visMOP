import { useMainStore } from '@/stores';
import { glyphData, omicsData } from '../generalTypes';
import { reactomeEntry } from '../reactomeTypes';

export function generateGlyphData(): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {};
  const mainStore = useMainStore();
  // contains pathway lists
  const pathwayLayouting = mainStore.pathwayLayouting;
  const fcs = mainStore.fcs;
  const omicsRecieved = mainStore.omicsRecieved;
  const pathwayAmounts = mainStore.pathayAmountDict;
  for (const pathway of pathwayLayouting.pathwayList) {
    const transcriptomicsData: omicsData = {
      available: omicsRecieved.transcriptomics,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const proteomicsData: omicsData = {
      available: omicsRecieved.proteomics,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const metabolomicsData: omicsData = {
      available: omicsRecieved.metabolomics,
      meanFoldchange: 0,
      foldChanges: [],
      nodeState: { total: 0, regulated: 0 },
    };
    const currentAmounts = pathwayAmounts[pathway.value];
    const nodeIDs = pathwayLayouting.pathwayNodeDictionary[pathway.value].map(
      (elem) => elem.split(';')
    );
    const usedIDs: string[] = [];
    nodeIDs.forEach((element) => {
      element.forEach((entry) => {
        const currentEntry = entry.replace('cpd:', '').replace('gl:', '');
        try {
          if (!usedIDs.includes(currentEntry)) {
            const fcsCurrent = fcs[currentEntry];
            if (typeof fcsCurrent.transcriptomics === 'number') {
              transcriptomicsData.foldChanges.push({
                name: mainStore.transcriptomicsKeggIDDict[currentEntry],
                value: fcsCurrent.transcriptomics,
                queryID: '',
              });
              transcriptomicsData.nodeState.regulated += 1;
            }
            if (typeof fcsCurrent.proteomics === 'number') {
              proteomicsData.foldChanges.push({
                name: mainStore.proteomicsKeggIDDict[currentEntry],
                value: fcsCurrent.proteomics,
                queryID: '',
              });
              proteomicsData.nodeState.regulated += 1;
            }
            if (typeof fcsCurrent.metabolomics === 'number') {
              metabolomicsData.foldChanges.push({
                name: currentEntry,
                value: fcsCurrent.metabolomics,
                queryID: '',
              });
              metabolomicsData.nodeState.regulated += 1;
            }
            usedIDs.push(currentEntry);
          }
        } catch (error) {
          console.log('Glyph Data: ', error);
        }
      });
    });
    // transcriptomicsData.foldChanges.sort((a, b) => a.value - b.value)
    // proteomicsData.foldChanges.sort((a, b) => a.value - b.value)
    // metabolomicsData.foldChanges.sort((a, b) => a.value - b.value)
    proteomicsData.nodeState.total = currentAmounts.genes;
    transcriptomicsData.nodeState.total = currentAmounts.genes;
    metabolomicsData.nodeState.total = currentAmounts.compounds;
    transcriptomicsData.meanFoldchange =
      transcriptomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      transcriptomicsData.foldChanges.length;
    proteomicsData.meanFoldchange =
      proteomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      proteomicsData.foldChanges.length;
    metabolomicsData.meanFoldchange =
      metabolomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      metabolomicsData.foldChanges.length;

    outGlyphData[pathway.value] = {
      pathwayID: pathway.value,
      transcriptomics: transcriptomicsData,
      proteomics: proteomicsData,
      metabolomics: metabolomicsData,
    };
  }
  return outGlyphData;
}

export function generateGlyphDataReactome(): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {};
  const mainStore = useMainStore();

  // contains pathway lists
  const omicsRecieved = mainStore.omicsRecieved;
  const overviewData = mainStore.overviewData as reactomeEntry[];
  for (const pathway of overviewData) {
    const transcriptomicsData: omicsData = {
      available: omicsRecieved.transcriptomics,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const proteomicsData: omicsData = {
      available: omicsRecieved.proteomics,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const metabolomicsData: omicsData = {
      available: omicsRecieved.metabolomics,
      meanFoldchange: 0,
      foldChanges: [],
      nodeState: { total: 0, regulated: 0 },
    };

    transcriptomicsData.nodeState.total = pathway.entries.transcriptomics.total;
    for (const measureKey in pathway.entries.transcriptomics.measured) {
      const entry = pathway.entries.transcriptomics.measured[measureKey];
      transcriptomicsData.foldChanges.push({
        name: entry.name,
        value: entry.value,
        queryID: entry.queryId,
      });
      transcriptomicsData.nodeState.regulated += 1;
    }

    proteomicsData.nodeState.total = pathway.entries.proteomics.total;
    for (const measureKey in pathway.entries.proteomics.measured) {
      const entry = pathway.entries.proteomics.measured[measureKey];
      proteomicsData.foldChanges.push({
        name: entry.name,
        value: entry.value,
        queryID: entry.queryId,
      });
      proteomicsData.nodeState.regulated += 1;
    }

    metabolomicsData.nodeState.total = pathway.entries.metabolomics.total;
    for (const measureKey in pathway.entries.metabolomics.measured) {
      const entry = pathway.entries.metabolomics.measured[measureKey];
      metabolomicsData.foldChanges.push({
        name: entry.name,
        value: entry.value,
        queryID: entry.queryId,
      });
      metabolomicsData.nodeState.regulated += 1;
    }

    transcriptomicsData.foldChanges.sort((a, b) => a.value - b.value);
    proteomicsData.foldChanges.sort((a, b) => a.value - b.value);
    metabolomicsData.foldChanges.sort((a, b) => a.value - b.value);
    transcriptomicsData.meanFoldchange =
      transcriptomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      transcriptomicsData.foldChanges.length;
    proteomicsData.meanFoldchange =
      proteomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      proteomicsData.foldChanges.length;
    metabolomicsData.meanFoldchange =
      metabolomicsData.foldChanges.reduce((a, b) => a + b.value, 0) /
      metabolomicsData.foldChanges.length;

    outGlyphData[pathway.pathwayId] = {
      pathwayID: pathway.pathwayId,
      transcriptomics: transcriptomicsData,
      proteomics: proteomicsData,
      metabolomics: metabolomicsData,
    };
  }
  return outGlyphData;
}
