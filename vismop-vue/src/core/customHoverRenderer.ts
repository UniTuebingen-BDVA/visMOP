// TODO
// adapted from default hover renderer from SIGMA v.2 TODO License stuff!!!!!
// TODO

/**
 * Sigma.js Canvas Renderer Hover Component
 * =========================================
 *
 * Function used by the canvas renderer to display a single node's hovered
 * state.
 * @module
 */
import { Settings } from 'sigma/settings'
import { NodeDisplayData, PartialButFor } from 'sigma/types'

function drawLabel (
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  if (!data.label) {
    return
  }
  const size = settings.labelSize
  const font = settings.labelFont
  const weight = settings.labelWeight
  const labelText = data.label.split('\n')
  context.fillStyle = '#000'
  context.font = `${weight} ${size}px ${font}`
  labelText.forEach((row, i) => {
    context.fillText(
      row,
      data.x + data.size + 3,
      data.y + size / 3 + (i - (labelText.length / 2 - 0.5)) * size
    )
  })
}
/**
 * Draw an hovered node.
 * - if there is no label => display a shadow on the node
 * - if the label box is bigger than node size => display a label box that contains the node with a shadow
 * - else node with shadow and the label box
 */
export default function drawHover (
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  const size = settings.labelSize
  const font = settings.labelFont
  const weight = settings.labelWeight

  context.font = `${weight} ${size}px ${font}`

  // Then we draw the label background
  context.fillStyle = '#FFF'
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.shadowBlur = 8
  context.shadowColor = '#000'

  const MARGIN = 2

  if (typeof data.label === 'string') {
    let textWidth = 0
    const splitText = data.label.split('\n')
    splitText.forEach((row) => {
      const currTextWidth = context.measureText(row).width
      if (currTextWidth > textWidth) {
        textWidth = currTextWidth
      }
    })
    const boxWidth = Math.round(textWidth + 9)
    const boxHeight = Math.round(size * splitText.length + 2 * MARGIN)
    const radious = Math.max(data.size, (size * splitText.length) / 2) + MARGIN

    const angleRadian = Math.asin(boxHeight / 2 / radious)
    const xDeltaCoord = Math.sqrt(
      Math.abs(Math.pow(radious, 2) - Math.pow(boxHeight / 2, 2))
    )

    context.beginPath()
    context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2)
    context.lineTo(data.x + radious + boxWidth, data.y + boxHeight / 2)
    context.lineTo(data.x + radious + boxWidth, data.y - boxHeight / 2)
    context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2)
    context.arc(data.x, data.y, radious, angleRadian, -angleRadian)
    context.closePath()
    context.fill()
  } else {
    context.beginPath()
    context.arc(data.x, data.y, data.size + MARGIN, 0, Math.PI * 2)
    context.closePath()
    context.fill()
  }

  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.shadowBlur = 0

  // And finally we draw the label
  drawLabel(context, data, settings)
}
