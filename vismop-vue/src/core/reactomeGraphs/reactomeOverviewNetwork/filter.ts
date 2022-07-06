import { PlainObject } from 'sigma/types';
import { animateNodes } from 'sigma/utils/animate';
import { filterValues } from '../../generalTypes';
import overviewGraph from './overviewNetwork';

/**
 * Function used to apply the GUI filter to a single overview node
 * @param attributes node attributes
 * @returns boolean, indicating pass or block by filter
 */
function filterFunction(
  this: overviewGraph,
  attributes: Record<string, number>
) {
  if (attributes.isRoot) {
    return false;
  } else if (
    this.filterFuncTrans(attributes.averageTranscriptomics) &&
    this.filterFuncProt(attributes.averageProteomics) &&
    this.filterFuncMeta(attributes.averageMetabolonmics)
  ) {
    return false;
  } else {
    return true;
  }
}

/**
 * Apply GUI filter to graph
 */
export function filterElements(this: overviewGraph) {
  if (this.filtersChanged) {
    this.filtersChanged = false;
    const tarPositions: PlainObject<PlainObject<number>> = {};
    this.graph.forEachNode((node, attributes) => {
      if (!filterFunction.bind(this)(attributes)) attributes.hidden = false;
    });
    this.graph.forEachNode((node, attributes) => {
      if (
        filterFunction.bind(this)(attributes) &&
        attributes.nodeType !== 'moduleNode'
      ) {
        tarPositions[node] = {
          x: this.graph.getNodeAttribute(attributes.rootId, 'layoutX'),
          y: this.graph.getNodeAttribute(attributes.rootId, 'layoutY'),
        };
      } else {
        tarPositions[node] = {
          x: attributes.layoutX,
          y: attributes.layoutY,
        };
      }
    });
    this.cancelCurrentAnimation = animateNodes(
      this.graph,
      tarPositions,
      {
        duration: 2000,
        //easing: 'quadraticOut',
      },
      () => {
        this.graph.forEachNode((node, attributes) => {
          filterFunction.bind(this)(attributes)
            ? (attributes.hidden = true)
            : (attributes.hidden = false);
        });
      }
    );
  }
}

/**
 * Call this function when GUI filters are changed to set member variables to the new filter functions
 * @param transcriptomics set of transcriptomics GUI filter values
 * @param proteomics  set of proteomics GUI filter values
 * @param metabolomics  set of metabolomics GUI filter values
 */
export function setAverageFilter(
  this: overviewGraph,
  transcriptomics: filterValues,
  proteomics: filterValues,
  metabolomics: filterValues
) {
  this.averageFilter.transcriptomics = transcriptomics;
  this.averageFilter.proteomics = proteomics;
  this.averageFilter.metabolomics = metabolomics;

  this.filterFuncTrans = this.averageFilter.transcriptomics.filterActive
    ? this.averageFilter.transcriptomics.inside
      ? (x: number) => {
          return (
            x <= this.averageFilter.transcriptomics.value.max &&
            x >= this.averageFilter.transcriptomics.value.min
          );
        }
      : (x: number) => {
          return (
            x >= this.averageFilter.transcriptomics.value.max ||
            x <= this.averageFilter.transcriptomics.value.min
          );
        }
    : (_x: number) => true;
  this.filterFuncProt = this.averageFilter.proteomics.filterActive
    ? this.averageFilter.proteomics.inside
      ? (x: number) => {
          return (
            x <= this.averageFilter.proteomics.value.max &&
            x >= this.averageFilter.proteomics.value.min
          );
        }
      : (x: number) => {
          return (
            x >= this.averageFilter.proteomics.value.max ||
            x <= this.averageFilter.proteomics.value.min
          );
        }
    : (_x: number) => true;
  this.filterFuncMeta = this.averageFilter.metabolomics.filterActive
    ? this.averageFilter.metabolomics.inside
      ? (x: number) => {
          return (
            x <= this.averageFilter.metabolomics.value.max &&
            x >= this.averageFilter.metabolomics.value.min
          );
        }
      : (x: number) => {
          return (
            x >= this.averageFilter.metabolomics.value.max ||
            x <= this.averageFilter.metabolomics.value.min
          );
        }
    : (_x: number) => true;
  this.filtersChanged = true;
  this.renderer.refresh();
}
