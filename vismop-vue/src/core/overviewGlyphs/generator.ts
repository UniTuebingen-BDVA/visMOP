import { glyphData } from '../generalTypes';
import { HighDetailGlyph } from './highDetailGlyph';
import { LowDetailGlyph } from './lowDetailGlyph';

/**
 * Generates a glyph for each prepared data block in the supplied object
 * @param inputData glyph data
 * @param diameter target diamenter of glyphs
 * @returns object with urls and svgs for each glyph
 */
export function generateGlyphs(
  inputData: { [key: string]: glyphData },
  glyphType: typeof HighDetailGlyph | typeof LowDetailGlyph,
  diameter = 28
): {
  url: { [key: string]: string };
  svg: { [key: string]: SVGElement };
} {
  const outObjURL: { [key: string]: string } = {};
  const outObjSVG: { [key: string]: SVGElement } = {};
  let idx = 0;
  for (const key in inputData) {
    const glyphData = inputData[key];
    const serializer = new XMLSerializer();
    const currentGlyph = new glyphType(glyphData, false, idx, diameter, true);
    const glyphSVGstring = serializer.serializeToString(
      currentGlyph.generateGlyphSvg()
    );
    const svgBlob = new Blob([glyphSVGstring], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const svgURL = window.URL.createObjectURL(svgBlob);
    currentGlyph.setDrawLabels(true);

    // const glyphSVGstringlegend = serializer.serializeToString(glyphSVGlegend)
    // const svgBloblegend = new Blob([glyphSVGstringlegend], { type: 'image/svg+xml;charset=utf-8' })
    // const svgURLlegend = window.URL.createObjectURL(svgBloblegend)
    outObjURL[key] = svgURL;
    outObjSVG[key] = currentGlyph.generateGlyphSvg();
    idx += 1;
  }

  return { url: outObjURL, svg: outObjSVG };
}
