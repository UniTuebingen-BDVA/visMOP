import _ from 'lodash';
import { glyphData, omicsData } from '../generalTypes';
import { ModuleSummaryGlyph } from './moduleSummaryGlyph';

/**
 * Generates a glyph for each prepared data block in the supplied object
 * @param inputData glyph data
 * @param diameter target diamenter of glyphs
 * @returns object with urls and svgs for each glyph
 */
export function generateGlyphs(
  inputData: { [key: string]: glyphData },
  diameter = 28,
  moduleNodeMapping: string[][]
): {
  [key: string]: string;
} {
  const outObjURL: { [key: string]: string } = {};
  const moduleGlyphData = generateModuleGlyphData(inputData, moduleNodeMapping);
  for (const key in moduleGlyphData) {
    if (Object.prototype.hasOwnProperty.call(moduleGlyphData, key)) {
      const element = moduleGlyphData[key];
      const serializer = new XMLSerializer();
      const currentGlyph = new ModuleSummaryGlyph(element, key, diameter);
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

export function generateModuleGlyphData(
  inputData: { [key: string]: glyphData },
  moduleNodeMapping: string[][]
): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {};

  // contains pathway lists

  moduleNodeMapping.forEach( (currentModuleKeys, key) => {
    const transcriptomicsData: omicsData = {
      available: false,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    };

    const proteomicsData: omicsData = {
      available: false,
      foldChanges: [],
      meanFoldchange: 0,
      nodeState: { total: 0, regulated: 0 },
    };
    const metabolomicsData: omicsData = {
      available: false,
      meanFoldchange: 0,
      foldChanges: [],
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

    for (const pathwayKey of currentModuleKeys) {
      const glyphData = inputData[pathwayKey];

      omicsDataArray.forEach((arrEntry) => {
        if (glyphData[arrEntry[1]].available) {
          arrEntry[0].available = true;
          glyphData[arrEntry[1]].foldChanges.forEach((element) => {
            if (
              arrEntry[0].foldChanges.every(
                (entry) => entry.queryID !== element.queryID
              )
            ) {
              arrEntry[0].foldChanges.push(element);
            }
          });
        }
      });
    }
    omicsDataArray.forEach((arrEntry) => {
      const fcVals = arrEntry[0].foldChanges.map((elem) => elem.value);
      arrEntry[0].meanFoldchange = _.mean(fcVals);
    });




    outGlyphData[key] = {
      pathwayID: key + "",
      transcriptomics: transcriptomicsData,
      proteomics: proteomicsData,
      metabolomics: metabolomicsData,
    };

  });
  return outGlyphData;
}
