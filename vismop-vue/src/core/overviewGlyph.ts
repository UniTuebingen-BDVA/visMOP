import store from '@/store'
import * as d3 from 'd3'
import { PieArcDatum } from 'd3-shape'
import { entry } from './graphTypes'
import { generateColorScale } from './utils'

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
    const nodeIDs = pathwayLayouting.pathwayNodeDictionary[pathway.value]
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
    // const glyphData = inputData[key]
    const serializer = new XMLSerializer()
    const glyphSVG = generateGlyph()
    const glyphSVGstring = serializer.serializeToString(glyphSVG)
    const svgBlob = new Blob([glyphSVGstring], { type: 'image/svg+xml;charset=utf-8' })
    const svgURL = window.URL.createObjectURL(svgBlob)
    outObj[key] = svgURL
  }

  return outObj
}

function generateGlyph (): SVGElement {
  const diameter = 240
  const width = diameter + 4
  const height = diameter + 4

  const dummyDatUp = [
    { data: 1, value: 1, index: 0, startAngle: 1.5 * Math.PI, endAngle: 2.5 * Math.PI, padAngle: 0 },
    { data: 2, value: 2, index: 1, startAngle: 0.5 * Math.PI, endAngle: 1.5 * Math.PI, padAngle: 0 }
  ]
  const dummyDatdown = [
    { data: 1, value: 1, index: 0, startAngle: 0.5 * Math.PI, endAngle: 1.5 * Math.PI, padAngle: 0 },
    { data: 2, value: 2, index: 1, startAngle: 1.5 * Math.PI, endAngle: 2.5 * Math.PI, padAngle: 0 }
  ]

  const color1 = ['red', 'gray']
  const color2 = ['blue', 'gray']
  const color3 = ['green', 'gray']

  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)

  const outermostRadius = 120
  const firstLayer = 90
  const secondLayer = 60
  const innermostRadius = 30
  const arcOuter = d3.arc<PieArcDatum<number>>().innerRadius(firstLayer).outerRadius(outermostRadius)
  const arcMiddle = d3.arc<PieArcDatum<number>>().innerRadius(secondLayer).outerRadius(firstLayer)
  const arcInner = d3.arc<PieArcDatum<number>>().innerRadius(innermostRadius).outerRadius(secondLayer)

  // segment order: transcriptomics = outer, proteomics = middle, metabolomics = inner
  g.selectAll('g')
    .data(dummyDatUp)
    .enter()
    .append('path')
    .attr('d', arcOuter)
    .attr('fill', (d, i) => color1[i])
  g.selectAll('g')
    .data(dummyDatdown)
    .enter()
    .append('path')
    .attr('d', arcMiddle)
    .attr('fill', (d, i) => color2[i])
  g.selectAll('g')
    .data(dummyDatUp)
    .enter()
    .append('path')
    .attr('d', arcInner)
    .attr('fill', (d, i) => color3[i])
  console.log('PIECHART', svg.node())
  return svg.node() as SVGElement
}
