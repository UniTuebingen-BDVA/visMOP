import store from '@/store'
import * as d3 from 'd3'
import { layoutJSON, reactomeEdge, shape, connector, segment, reactomeNode } from '../core/reactomeTypes'
import { glyphData, generateGlyphVariation } from '../core/overviewGlyph'

const colorsAlternative: {[key: string]: string} = {
  // from https://github.com/reactome-pwp/diagram/blob/master/src/main/resources/org/reactome/web/diagram/profiles/diagram/profile_02.json
  Chemical: '#A5D791',
  ChemicalDrug: '#B89AE6',
  compartment: 'rgba(235, 178, 121, 0.5)',
  compartmentEdge: 'rgb(235, 178, 121)',
  Complex: '#ABD1E3',
  Entity: '#A5D791',
  EntitySet: '#A0BBCD',
  Gene: '#F3D1AF',
  ProcessNode: '#A5D791',
  EncapsulatedNode: '#A5D791',
  Protein: '#8DC7BB',
  RNA: '#A5D791',
  ComplexDrug: '#FFFFFF',
  EntitySetDrug: '#FFFFFF'
}

const colors: {[key: string]: string} = {
  Chemical: '#FFFFFF',
  ChemicalDrug: '#FFFFFF',
  compartment: 'rgba(180, 180, 180, 0.5)',
  compartmentEdge: 'rgb(180, 180, 180)',
  Complex: '#FFFFFF',
  Entity: '#FFFFFF',
  EntitySet: '#FFFFFF',
  Gene: '#FFFFFF',
  ProcessNode: '#FFFFFF',
  EncapsulatedNode: '#FFFFFF',
  Protein: '#FFFFFF',
  RNA: '#FFFFFF',
  ComplexDrug: '#FFFFFF',
  EntitySetDrug: '#FFFFFF'
}

const fontSize = '10px'
const compartmentFontSize = '16px'

export default class ReactomeDetailView {
  private mainSVG: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>
  private mainChartArea: d3.Selection<SVGGElement, unknown, HTMLElement, any>
  private comparmentG: d3.Selection<SVGGElement, unknown, HTMLElement, any>
  private nodesG: d3.Selection<SVGGElement, unknown, HTMLElement, any>
  private linesG: d3.Selection<SVGGElement, unknown, HTMLElement, any>
  private tooltipG: d3.Selection<SVGGElement, unknown, HTMLElement, any>
  private layoutData: layoutJSON
  private containerID: string
  private colorScaleTranscriptomics = store.state.fcScales.transcriptomics
  private colorScaleProteomics = store.state.fcScales.proteomics
  private colorScaleMetabolomics = store.state.fcScales.metabolomics
  private foldChanges: {prot: {[key: number]: number}, gen:{[key: number]: number}, chem:{[key: number]: number}}
  private foldChangeReactome: { [key: number]: glyphData }
  constructor (layoutData: layoutJSON, containerID: string, foldchanges: {prot: {[key: number]: number}, gen:{[key: number]: number}, chem:{[key: number]: number}}, foldChangeReactome: { [key: number]: glyphData}) {
    this.containerID = containerID
    this.layoutData = layoutData
    this.foldChanges = foldchanges
    this.foldChangeReactome = foldChangeReactome
    console.log(foldChangeReactome)
    const box = document.querySelector(containerID)?.getBoundingClientRect()
    const width = box?.width as number
    const height = box?.height as number
    this.mainSVG = d3.select(containerID).append('svg').attr('width', width).attr('height', height).attr('viewBox', [0, 0, this.layoutData.maxX, this.layoutData.maxY])
    this.mainChartArea = this.mainSVG.append('g')
    this.comparmentG = this.mainChartArea.append('g')
    this.linesG = this.mainChartArea.append('g')
    this.nodesG = this.mainChartArea.append('g')
    this.tooltipG = this.mainChartArea.append('g').attr('id', 'tooltipG').on('click', (event, d) => { d3.select('#tooltipG').selectAll('svg').remove() })
    this.drawCompartments()
    this.drawNodes()
    this.drawSegments()
    this.drawConnectors()
    this.drawReactionNodes()
    this.drawEndShapes()
    this.drawLinks()
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .on('zoom', (event) => {
        const { transform } = event
        this.mainChartArea.attr('transform', transform)
      })
    this.mainSVG.call(zoom)
  }

  private drawCompartments () {
    this.comparmentG
      .selectAll()
      .data(this.layoutData.compartments)
      .enter()
      .append('rect')
      .attr('id', function (d, i) {
        return 'compartment' + i
      })
      .attr('x', d => d.prop.x)
      .attr('y', d => d.prop.y)
      .attr('width', d => d.prop.width)
      .attr('height', d => d.prop.height)
      .attr('stroke-width', 6)
      .attr('stroke', colors.compartmentEdge)
      .attr('fill', colors.compartment)

    const entriesWithInsets = this.layoutData.compartments.filter(d => { return ('insets' in d) })
    this.comparmentG
      .selectAll()
      .data(entriesWithInsets)
      .enter()
      .append('rect')
      .attr('id', function (d, i) {
        return 'compartment_inset' + i
      })
      .attr('x', d => d.insets.x)
      .attr('y', d => d.insets.y)
      .attr('width', d => d.insets.width)
      .attr('height', d => d.insets.height)
      .attr('stroke-width', 6)
      .attr('stroke', colors.compartmentEdge)
      .attr('fill', 'none')
    this.comparmentG
      .selectAll()
      .data(this.layoutData.compartments)
      .enter()
      .append('text')
      .attr('x', d => d.textPosition.x)
      .attr('y', d => d.textPosition.y)
      .attr('dy', '1em')
      .style('font-size', compartmentFontSize)
      .style('font-weight', 'bold')
      .text(d => d.displayName)
  }

  private drawReactionNodes () {
    const entriesWithReactionShape = this.layoutData.edges.filter(d => { return ('reactionShape' in d) })
    this.nodesG.append('g')
      .selectAll('path')
      .data(entriesWithReactionShape)
      .enter()
      .append('path')
      .attr('d', d => this.drawDecorators(d.reactionShape))
      .attr('stroke', 'black')
      .attr('fill', d => d.reactionShape.empty ? 'white' : 'black')
  }

  private drawConnectors () {
    const connectorsLineG = this.linesG.append('g')
    const connectorsShapeG = this.nodesG.append('g')

    const connectors: connector[] = []
    for (const node of this.layoutData.nodes) {
      if ('connectors' in node) {
        for (const connector of node.connectors) {
          connectors.push(connector)
        }
      }
    }
    connectorsLineG
      .selectAll('path')
      .data(connectors)
      .enter()
      .append('path')
      .attr('d', d => this.segmentsToPath(d.segments))
      .attr('stroke', 'black')
      .attr('fill', 'none')

    const connectorsWithEndShape = connectors.filter(d => { return ('endShape' in d) })
    connectorsShapeG
      .selectAll('path')
      .data(connectorsWithEndShape)
      .enter()
      .append('path')
      .attr('d', d => this.drawDecorators(d.endShape))
      .attr('stroke', 'black')
      .attr('fill', d => d.endShape.empty ? 'white' : 'black')
  }

  private drawEndShapes () {
    const entriesWithEndShape = this.layoutData.edges.filter(d => { return ('endShape' in d) })
    this.nodesG.append('g')
      .selectAll('path')
      .data(entriesWithEndShape)
      .enter()
      .append('path')
      .attr('d', d => this.drawDecorators(d.endShape))
      .attr('stroke', 'black')
      .attr('fill', d => d.endShape.empty ? 'white' : 'black')
  }

  private drawDecorators (shape: shape): string {
    let outString = ''
    if (shape.type === 'BOX') {
      outString += `M${shape.a.x},${shape.a.y}L${shape.b.x},${shape.a.y}L${shape.b.x},${shape.b.y}L${shape.a.x},${shape.b.y}z`
    }
    if (shape.type === 'ARROW') {
      outString += `M${shape.a.x},${shape.a.y}L${shape.b.x},${shape.b.y}L${shape.c.x},${shape.c.y}z`
    }
    if (shape.type === 'CIRCLE') {
      outString += `M${shape.c.x + shape.r},${shape.c.y}`
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x},${shape.c.y + shape.r}`
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x - shape.r},${shape.c.y}`
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x},${shape.c.y - shape.r}`
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x + shape.r},${shape.c.y}z`
    }
    if (shape.type === 'STOP') {
      outString += `M${shape.a.x},${shape.a.y}L${shape.b.x},${shape.b.y}`
    }
    if (shape.type === 'DOUBLE CIRCLE') {
      outString += `M${shape.c.x + shape.r},${shape.c.y}`
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x},${shape.c.y + shape.r}`
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x - shape.r},${shape.c.y}`
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x},${shape.c.y - shape.r}`
      outString += `A${shape.r},${shape.r},0,0,1,${shape.c.x + shape.r},${shape.c.y}z`
      outString += `M${shape.c.x + shape.r1},${shape.c.y}`
      outString += `A${shape.r1},${shape.r1},0,0,1,${shape.c.x},${shape.c.y + shape.r1}`
      outString += `A${shape.r1},${shape.r1},0,0,1,${shape.c.x - shape.r1},${shape.c.y}`
      outString += `A${shape.r1},${shape.r1},0,0,1,${shape.c.x},${shape.c.y - shape.r1}`
      outString += `A${shape.r1},${shape.r1},0,0,1,${shape.c.x + shape.r1},${shape.c.y}z`
    }
    return outString
  }

  private drawNodes () {
    const chemicals = this.layoutData.nodes.filter(d => { return (d.renderableClass === 'Chemical') })
    const complexes = this.layoutData.nodes.filter(d => { return (d.renderableClass === 'Complex') })
    const proteins = this.layoutData.nodes.filter(d => { return (d.renderableClass === 'Protein') })
    const nonChemicals = this.layoutData.nodes.filter(d => { return ((d.renderableClass !== 'Chemical') && (d.renderableClass !== 'Complex') && ((d.renderableClass !== 'Protein'))) })

    this.drawRect(nonChemicals)
    this.drawProtein(proteins)
    this.drawChemical(chemicals)
    this.drawComplex(complexes)
  }

  private drawRect (data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data)
    const enterG = nodeG.enter().append('g').attr('class', ' nodeG').attr('transform', d => `translate(${d.position.x},${d.position.y})`)
    const textLines: { text: string, textLength: number }[][] = []

    for (const node of data) {
      textLines.push(this.generateLinesFromText(node.displayName, node.prop.width))
    }

    for (const lines of textLines) {
      for (const line of lines) {
        line.textLength = lines.length
      }
    }

    enterG.append('rect')
      .attr('id', function (d, i) { return '' + d.renderableClass + i })
      .attr('x', d => -d.prop.width / 2)
      .attr('y', d => -d.prop.height / 2)
      .attr('width', d => d.prop.width)
      .attr('height', d => d.prop.height)
      .attr('stroke-width', 1)
      .attr('stroke', 'black')
      .attr('fill', d => colors[d.renderableClass])
    enterG
      .append('text').attr('class', 'nodeText')
      .append('tspan')
      .attr('width', d => d.prop.width * 0.9)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', fontSize)
      .selectAll('tspan')
      .data((d, i) => textLines[i])
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => (i - d.textLength / 2 + 0.8) * 12)
      .text(d => d.text)
  }

  private drawProtein (data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data)
    const enterG = nodeG.enter().append('g').attr('class', ' nodeG').attr('transform', d => `translate(${d.position.x},${d.position.y})`)
    const textLines: { text: string, textLength: number }[][] = []

    for (const node of data) {
      textLines.push(this.generateLinesFromText(node.displayName, node.prop.width))
    }

    for (const lines of textLines) {
      for (const line of lines) {
        line.textLength = lines.length
      }
    }

    enterG.append('rect')
      .attr('id', function (d, i) { return 'protein' + i })
      .attr('x', d => -d.prop.width / 2)
      .attr('y', d => -d.prop.height / 2)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('width', d => d.prop.width)
      .attr('height', d => d.prop.height)
      .attr('stroke-width', 1)
      .attr('stroke', 'black')
      .attr('fill', d => (d.reactomeId in this.foldChanges.prot) ? this.colorScaleProteomics(this.foldChanges.prot[d.reactomeId]) : (d.reactomeId in this.foldChanges.gen) ? this.colorScaleTranscriptomics(this.foldChanges.gen[d.reactomeId]) : colors[d.renderableClass])
    enterG
      .append('text').attr('class', 'nodeText')
      .append('tspan')
      .attr('width', d => d.prop.width * 0.9)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', fontSize)
      .selectAll('tspan')
      .data((d, i) => textLines[i])
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => (i - d.textLength / 2 + 0.8) * 12)
      .text(d => d.text)
  }

  private drawComplex (data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data)
    const enterG = nodeG.enter().append('g').attr('class', ' nodeG').attr('transform', d => `translate(${d.position.x},${d.position.y})`)
    const textLines: { text: string, textLength: number }[][] = []
    // tslint:disable no-this-alias
    const self = this
    // tslint:enable no-this-alias
    for (const node of data) {
      textLines.push(this.generateLinesFromText(node.displayName, node.prop.width))
    }

    for (const lines of textLines) {
      for (const line of lines) {
        line.textLength = lines.length
      }
    }
    const complex = enterG.append('path')
      .attr('id', function (d, i) { return 'node' + i })
      .attr('d', d => this.complexPath(d))
      .attr('stroke-width', 1)
      .attr('stroke', 'black')
      .attr('fill', d => (d.reactomeId in this.foldChanges.prot) ? this.colorScaleProteomics(this.foldChanges.prot[d.reactomeId]) : (d.reactomeId in this.foldChanges.gen) ? this.colorScaleTranscriptomics(this.foldChanges.gen[d.reactomeId]) : colors[d.renderableClass])

    complex.on('click', (event, d) => {
      self.tooltipG.selectAll('svg').remove()
      self.tooltipG.attr('transform', `translate(${d.position.x - 50},${d.position.y - 50})`)
      self.tooltipG.append(() => generateGlyphVariation(self.foldChangeReactome[d.reactomeId], true, d.reactomeId, false))
    })
    enterG
      .append('text').attr('class', 'nodeText')
      .append('tspan')
      .attr('width', d => d.prop.width * 0.9)
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('font-size', fontSize)
      .selectAll('tspan')
      .data((d, i) => textLines[i])
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => (i - d.textLength / 2 + 0.8) * 12)
      .text(d => d.text)
  }

  private complexPath (node: reactomeNode) {
    const yHalf = node.prop.height / 2
    const yTwoFifth = node.prop.height / 4
    const xHalf = node.prop.width / 2
    const xTwoFifth = 3 * node.prop.width / 7
    const pathText = `M${-xTwoFifth},${yHalf}L${-xHalf},${yTwoFifth}L${-xHalf},${-yTwoFifth}L${-xTwoFifth},${-yHalf}L${xTwoFifth},${-yHalf}L${xHalf},${-yTwoFifth}L${xHalf},${yTwoFifth}L${xTwoFifth},${yHalf}z`
    return pathText
  }

  private drawChemical (data: reactomeNode[]) {
    const nodeG = this.nodesG.append('g').selectAll().data(data)
    const enterG = nodeG.enter().append('g').attr('class', ' nodeG').attr('transform', d => `translate(${d.position.x},${d.position.y})`)

    enterG
      .append('ellipse')
      .attr('id', function (d, i) {
        return 'chemical' + i
      })
      .attr('rx', d => d.prop.width / 2)
      .attr('ry', d => d.prop.height / 2)
      .attr('stroke-width', 1)
      .attr('stroke', 'black')
      .attr('fill', d => (d.reactomeId in this.foldChanges.chem) ? this.colorScaleProteomics(this.foldChanges.chem[d.reactomeId]) : colors[d.renderableClass])
    enterG
      .append('text').attr('class', 'nodeText')
      .style('text-anchor', 'middle')
      .style('alignment-baseline', 'middle')
      .style('dominant-baseline', 'central')
      .style('font-size', fontSize)
      .text(d => d.displayName)
  }

  private drawSegments () {
    const filteredData = this.layoutData.edges.filter(d => { return ('segments' in d) })
    this.linesG.append('g')
      .selectAll('path')
      .data(filteredData)
      .enter()
      .append('path')
      .attr('d', d => this.makeEdgePath(d))
      .attr('stroke', 'black')
      .attr('fill', 'none')
  }

  private makeEdgePath (datum: reactomeEdge) {
    let outStr = ''
    if (('segments' in datum) && (datum.segments.length > 0)) {
      const startPoint = datum.segments[0]
      const endPoint = datum.segments[datum.segments.length - 1]
      if ('inputs' in datum) {
        for (const input of datum.inputs) {
          if ('points' in input) {
            outStr += `M${input.points[0].x},${input.points[0].y}`
            for (const point of input.points) {
              outStr += `L${point.x},${point.y}`
            }
            outStr += `L${startPoint.from.x},${startPoint.from.y}`
          }
        }
      }
      if ('outputs' in datum) {
        for (const output of datum.outputs) {
          if ('points' in output) {
            outStr += `M${output.points[0].x},${output.points[0].y}`
            for (const point of output.points) {
              outStr += `L${point.x},${point.y}`
            }
            outStr += `L${endPoint.to.x},${endPoint.to.y}`
          }
        }
      }
      outStr += `M${startPoint.from.x},${startPoint.from.y}`
      for (const entry of datum.segments) {
        outStr += `L${entry.to.x},${entry.to.y}`
      }
    }
    // outStr += this.catalystPaths(datum)
    return outStr
  }

  private catalystPaths (datum: reactomeEdge) {
    let outStr = ''
    if ('catalysts' in datum) {
      for (const catalyst of datum.catalysts) {
        if ('points' in catalyst) {
          outStr += `M${catalyst.points[0].x},${catalyst.points[0].y}`
          for (let index = 1; index < catalyst.points.length; index++) {
            const point = catalyst.points[index]
            outStr += `L${point.x},${point.y}`
          }
        }
        outStr += `L${datum.position.x},${datum.position.y}`
      }
    }
    return outStr
  }

  private drawLinks () {
    if ('links' in this.layoutData) {
      this.linesG
        .selectAll()
        .data(this.layoutData.links)
        .enter()
        .append('path')
        .attr('id', (d, i) => 'test' + i)
        .attr('d', d => this.segmentsToPath(d.segments))
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('stroke-dasharray', d => (d.renderableClass === 'EntitySetAndMemberLink' || d.renderableClass === 'EntitySetAndEntitySetLink') ? '4 2' : null)

      const entriesWithReactionShape = this.layoutData.links.filter(d => { return ('reactionShape' in d) })
      this.nodesG.append('g')
        .selectAll('path')
        .data(entriesWithReactionShape)
        .enter()
        .append('path')
        .attr('d', d => this.drawDecorators(d.reactionShape))
        .attr('stroke', 'black')
        .attr('fill', d => d.reactionShape.empty ? 'white' : 'black')

      const entriesWithEndShape = this.layoutData.links.filter(d => { return ('endShape' in d) })
      this.nodesG.append('g')
        .selectAll('path')
        .data(entriesWithEndShape)
        .enter()
        .append('path')
        .attr('d', d => this.drawDecorators(d.endShape))
        .attr('stroke', 'black')
        .attr('fill', d => d.reactionShape.empty ? 'white' : 'black')
    }
  }

  private segmentsToPath (segments: segment[]) {
    let outStr = ''
    for (let index = 0; index < segments.length; index++) {
      const element = segments[index]
      if (index === 0) outStr += `M${element.from.x},${element.from.y}`
      outStr += `L${element.to.x},${element.to.y}`
    }
    return outStr
  }

  private getTextWidth (text: string) {
    const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D
    const width = context.measureText(text).width
    return width
  }

  private generateLinesFromText (text: string, width: number) {
    // adapted from https://observablehq.com/@mbostock/fit-text-to-circle

    const words = text.split(/\s+|,|:/g)
    if (!words[words.length - 1]) words.pop()
    if (!words[0]) words.shift()

    let line : { text: string, textLength: number } = { text: '', textLength: 0 }
    const lines = []
    for (let i = 0; i < words.length; ++i) {
      const lineText = (line.text ? line.text + ' ' : '') + words[i]
      const lineWidth = this.getTextWidth(lineText)
      if (lineWidth < width) {
        line.text = lineText
      } else {
        lines.push(line)
        line = { text: words[i], textLength: 0 }
      }
    }
    lines.push(line)
    return lines
  }

  clearView () {
    this.mainSVG.remove()
  }

  refreshSize () {
    const box = document.querySelector(this.containerID)?.getBoundingClientRect()
    const width = box?.width as number
    const height = box?.height as number
    this.mainSVG.attr('width', width).attr('height', height)
  }
}
