import store from '@/store'
import * as d3 from 'd3'
import { PieArcDatum } from 'd3-shape'
import * as _ from 'lodash'

interface omicsData {
  available: boolean,
  foldChanges: number[],
  nodeState: { total: number, regulated: number }
}

interface glyphData {
  pathwayID: string
  proteomics: omicsData;
  metabolomics: omicsData;
  transcriptomics: omicsData
}

export function generateGlyphData (fcsExtent: number[]): { [key: string]: glyphData } {
  const outGlyphData: { [key: string]: glyphData } = {}
  // contains pathway lists
  const pathwayLayouting = store.state.pathwayLayouting
  const fcs = store.state.fcs
  const omicsRecieved = store.state.omicsRecieved
  const pathwayAmounts = store.state.pathayAmountDict
  // const colorScale = generateColorScale(fcsExtent[0], fcsExtent[1])
  for (const pathway of pathwayLayouting.pathwayList) {
    const transcriptomicsData = { available: omicsRecieved.transcriptomics, foldChanges: [], nodeState: { total: 0, regulated: 0 } } as omicsData
    const proteomicsData = { available: omicsRecieved.proteomics, foldChanges: [], nodeState: { total: 0, regulated: 0 } } as omicsData
    const metabolomicsData = { available: omicsRecieved.metabolomics, foldChanges: [], nodeState: { total: 0, regulated: 0 } } as omicsData
    const currentAmounts = pathwayAmounts[pathway.value]
    const nodeIDs = pathwayLayouting.pathwayNodeDictionary[pathway.value].map(elem => elem.replace('cpd:', '').replace('gl:', ''))
    nodeIDs.forEach(element => {
      try {
        const fcsCurrent = fcs[element]
        if (typeof fcsCurrent.transcriptomics === 'number') {
          transcriptomicsData.foldChanges.push(fcsCurrent.transcriptomics)
          transcriptomicsData.nodeState.regulated += 1
        }
        if (typeof fcsCurrent.proteomics === 'number') {
          proteomicsData.foldChanges.push(fcsCurrent.proteomics)
          proteomicsData.nodeState.regulated += 1
        }
        if (typeof fcsCurrent.metabolomics === 'number') {
          metabolomicsData.foldChanges.push(fcsCurrent.metabolomics)
          metabolomicsData.nodeState.regulated += 1
        }
      } catch (error) {}
    })
    transcriptomicsData.foldChanges.sort()
    proteomicsData.foldChanges.sort()
    metabolomicsData.foldChanges.sort()
    proteomicsData.nodeState.total = currentAmounts.genes
    transcriptomicsData.nodeState.total = currentAmounts.genes
    metabolomicsData.nodeState.total = currentAmounts.compounds

    outGlyphData[pathway.value] = { pathwayID: pathway.value, transcriptomics: transcriptomicsData, proteomics: proteomicsData, metabolomics: metabolomicsData }
  }
  return outGlyphData
}

// glyph data in the future
export function generateGlyphs (inputData: { [key: string]: glyphData }): { [key: string]: string } {
  const outObj: { [key: string]: string } = {}

  for (const key in inputData) {
    const glyphData = inputData[key]
    const serializer = new XMLSerializer()
    const glyphSVG = generateGlyph(glyphData)
    const glyphSVGstring = serializer.serializeToString(glyphSVG)
    const svgBlob = new Blob([glyphSVGstring], { type: 'image/svg+xml;charset=utf-8' })
    const svgURL = window.URL.createObjectURL(svgBlob)
    outObj[key] = svgURL
  }

  return outObj
}

function generateGlyph (glyphDat: glyphData): SVGElement {
  const diameter = 50
  const width = diameter + 2
  const height = diameter + 2
  const outermostRadius = 25
  const firstLayer = 18
  const secondLayer = 11
  const innermostRadius = 4
  const colorScaleRB = d3.scaleSequential(d3.interpolateRdBu).domain([store.state.fcQuantiles[1], store.state.fcQuantiles[0]])
  const colorScalePG = d3.scaleSequential(d3.interpolatePRGn).domain(store.state.fcQuantiles)
  const colorScaleBrBG = d3.scaleSequential(d3.interpolateBrBG).domain([store.state.fcQuantiles[1], store.state.fcQuantiles[0]])

  // prepare transcriptomics
  let colorsTranscriptomics: string[] = []
  const transcriptomicsArcDat = []
  if (glyphDat.transcriptomics.available) {
    colorsTranscriptomics = glyphDat.transcriptomics.foldChanges.map(elem => colorScaleRB(elem))
    const angleRangeTranscriptomicsFCs = _.range(1.5 * Math.PI, 2.5 * Math.PI + (Math.PI / colorsTranscriptomics.length), Math.PI / colorsTranscriptomics.length)
    colorsTranscriptomics.forEach((element, idx) => {
      transcriptomicsArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeTranscriptomicsFCs[idx], endAngle: angleRangeTranscriptomicsFCs[idx + 1], padAngle: 0 })
    })
    const transcriptomicsRegulatedQuotient = glyphDat.transcriptomics.nodeState.regulated / glyphDat.transcriptomics.nodeState.total
    transcriptomicsArcDat.push({ data: 1, value: 1, index: 0, startAngle: 0.5 * Math.PI, endAngle: 0.5 * Math.PI + Math.PI * transcriptomicsRegulatedQuotient, padAngle: 0 })
    transcriptomicsArcDat.push({ data: 2, value: 2, index: 1, startAngle: 0.5 * Math.PI + Math.PI * transcriptomicsRegulatedQuotient, endAngle: 1.5 * Math.PI, padAngle: 0 })
    colorsTranscriptomics.push('black', 'gray')
  }

  // prepare proteomics
  let colorsProteomics: string[] = []
  const proteomicsArcDat = []
  if (glyphDat.proteomics.available) {
    colorsProteomics = glyphDat.proteomics.foldChanges.map(elem => colorScalePG(elem))
    const angleRangeProteomicsFCs = _.range(0.5 * Math.PI, 1.5 * Math.PI + (Math.PI / colorsProteomics.length), Math.PI / colorsProteomics.length)
    colorsProteomics.forEach((element, idx) => {
      proteomicsArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeProteomicsFCs[idx], endAngle: angleRangeProteomicsFCs[idx + 1], padAngle: 0 })
    })
    const proteomicsRegulatedQuotient = glyphDat.proteomics.nodeState.regulated / glyphDat.proteomics.nodeState.total
    proteomicsArcDat.push({ data: 1, value: 1, index: 0, startAngle: 1.5 * Math.PI, endAngle: 1.5 * Math.PI + Math.PI * proteomicsRegulatedQuotient, padAngle: 0 })
    proteomicsArcDat.push({ data: 2, value: 2, index: 1, startAngle: 1.5 * Math.PI + Math.PI * proteomicsRegulatedQuotient, endAngle: 2.5 * Math.PI, padAngle: 0 })
    colorsProteomics.push('black', 'gray')
  }
  // prepare metabolomics
  let colorsMetabolomics: string[] = []
  const metabolomicsArcDat = []
  if (glyphDat.metabolomics.available) {
    colorsMetabolomics = glyphDat.metabolomics.foldChanges.map(elem => colorScaleBrBG(elem))
    const angleRangeMetabolomicsFCs = _.range(1.5 * Math.PI, 2.5 * Math.PI + (Math.PI / colorsMetabolomics.length), Math.PI / colorsMetabolomics.length)
    colorsMetabolomics.forEach((element, idx) => {
      metabolomicsArcDat.push({ data: idx + 1, value: idx + 1, index: idx, startAngle: angleRangeMetabolomicsFCs[idx], endAngle: angleRangeMetabolomicsFCs[idx + 1], padAngle: 0 })
    })
    const metabolomicsRegulatedQuotient = glyphDat.metabolomics.nodeState.regulated / glyphDat.metabolomics.nodeState.total
    metabolomicsArcDat.push({ data: 1, value: 1, index: 0, startAngle: 0.5 * Math.PI, endAngle: 0.5 * Math.PI + Math.PI * metabolomicsRegulatedQuotient, padAngle: 0 })
    metabolomicsArcDat.push({ data: 2, value: 2, index: 1, startAngle: 0.5 * Math.PI + Math.PI * metabolomicsRegulatedQuotient, endAngle: 1.5 * Math.PI, padAngle: 0 })
    colorsMetabolomics.push('black', 'gray')
  }

  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)

  const arcOuter = d3.arc<PieArcDatum<number>>().innerRadius(firstLayer).outerRadius(outermostRadius)
  const arcMiddle = d3.arc<PieArcDatum<number>>().innerRadius(secondLayer).outerRadius(firstLayer)
  const arcInner = d3.arc<PieArcDatum<number>>().innerRadius(innermostRadius).outerRadius(secondLayer)

  // segment order: transcriptomics = outer, proteomics = middle, metabolomics = inner
  g.selectAll('g')
    .data(transcriptomicsArcDat)
    .enter()
    .append('path')
    .attr('d', arcOuter)
    .attr('fill', (d, i) => colorsTranscriptomics[i])
  g.selectAll('g')
    .data(proteomicsArcDat)
    .enter()
    .append('path')
    .attr('d', arcMiddle)
    .attr('fill', (d, i) => colorsProteomics[i])
  g.selectAll('g')
    .data(metabolomicsArcDat)
    .enter()
    .append('path')
    .attr('d', arcInner)
    .attr('fill', (d, i) => colorsMetabolomics[i])
  return svg.node() as SVGElement
}
