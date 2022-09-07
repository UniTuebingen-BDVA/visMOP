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
import { Settings } from 'sigma/settings';
import { NodeDisplayData, PartialButFor } from 'sigma/types';

function splitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth = 100
): { text: string[]; maxWidth: number } {
  const internalText = text.replaceAll('\n', ' ');
  const internalTextArray = internalText.split(' ');
  const firstWord = internalTextArray.shift();
  const textRows = [firstWord ? firstWord : ''];
  let longestRowWidth = 0;
  let currentRow = 0;
  internalTextArray.forEach((word) => {
    const currRowWidth = context.measureText(textRows[currentRow]).width;
    const currWordWidth = context.measureText(' ' + word).width;
    if (currRowWidth + currWordWidth < maxWidth) {
      if (textRows[currentRow].length != 0) textRows[currentRow] += ' ';
      textRows[currentRow] += word;
    } else {
      currentRow += 1;
      textRows.push(word);
    }
  });
  textRows.forEach((row) => {
    const currentRowWidth = context.measureText(row).width;
    if (currentRowWidth > longestRowWidth) {
      longestRowWidth = currentRowWidth;
    }
  });
  return { text: textRows, maxWidth: longestRowWidth };
}

export function drawLabel(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  if (!data.label) {
    return;
  }
  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;
  const labelText = splitText(context, data.label);
  context.fillStyle = '#000';
  context.font = `${weight} ${size}px ${font}`;
  labelText.text.forEach((row, i) => {
    context.fillText(
      row,
      data.layoutX < 0 && data.isRoot
        ? data.x - labelText.maxWidth - data.size - 3
        : data.x + data.size + 3,
      data.y + size / 3 + (i - (labelText.text.length / 2 - 0.5)) * size
    );
  });
}
/**
 * Draw an hovered node.
 * - if there is no label => display a shadow on the node
 * - if the label box is bigger than node size => display a label box that contains the node with a shadow
 * - else node with shadow and the label box
 */
export function drawHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;

  context.font = `${weight} ${size}px ${font}`;

  // Then we draw the label background
  context.fillStyle = '#FFF';
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 8;
  context.shadowColor = '#000';

  const MARGIN = 2;

  if (typeof data.label === 'string') {
    const labelText = splitText(context, data.label);
    const boxWidth = Math.round(labelText.maxWidth + 9);
    const boxHeight = Math.round(size * labelText.text.length + 2 * MARGIN);
    const radius =
      Math.max(data.size, (size * labelText.text.length) / 2) + MARGIN;

    const angleRadian = Math.asin(boxHeight / 2 / radius);
    const xDeltaCoord = Math.sqrt(
      Math.abs(Math.pow(radius, 2) - Math.pow(boxHeight / 2, 2))
    );
    console.log('labelData', data.layoutX);
    if (data.layoutX < 0 && data.isRoot) {
      context.beginPath();
      context.moveTo(data.x - xDeltaCoord, data.y + boxHeight / 2);
      context.lineTo(data.x - radius - boxWidth, data.y + boxHeight / 2);
      context.lineTo(data.x - radius - boxWidth, data.y - boxHeight / 2);
      context.lineTo(data.x - xDeltaCoord, data.y - boxHeight / 2);
      context.arc(data.x, data.y, radius, -angleRadian, angleRadian);
      context.closePath();
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
      context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
      context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
      context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
      context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
      context.closePath();
      context.fill();
    }
  } else {
    context.beginPath();
    context.arc(data.x, data.y, data.size + MARGIN, 0, Math.PI * 2);
    context.closePath();
    context.fill();
  }

  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;

  // And finally we draw the label
  drawLabel(context, data, settings);
}
