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
  attributes: Record<
    string,
    string | number | typeof NaN | { regulated: number; total: number }
  >
): boolean {
  if (attributes.isRoot || attributes.nodeType == 'moduleNode') {
    return false;
  } else if (
    this.filterFuncTrans(attributes.averageTranscriptomics as number) &&
    this.filterFuncProt(attributes.averageProteomics as number) &&
    this.filterFuncMeta(attributes.averageMetabolonmics as number) &&
    this.filterFuncSumRegulatedAbsolute(
      getRegSum(
        false,
        attributes as Record<string, { regulated: number; total: number }>
      )
    ) &&
    this.filterFuncSumRegulatedRelative(
      getRegSum(
        true,
        attributes as Record<string, { regulated: number; total: number }>
      )
    )
  ) {
    return false;
  } else {
    return true;
  }
}

function getRegSum(
  relative: boolean,
  attributes: Record<string, { regulated: number; total: number }>
): number {
  if (relative) {
    const enumerator =
      attributes.transcriptomicsNodeState.regulated +
      attributes.proteomicsNodeState.regulated +
      attributes.metabolomicsNodeState.regulated;

    const divisor =
      attributes.transcriptomicsNodeState.total +
      attributes.proteomicsNodeState.total +
      attributes.metabolomicsNodeState.total;
    const val = (enumerator / divisor) * 100;
    return val;
  } else {
    const val =
      attributes.transcriptomicsNodeState.regulated +
      attributes.proteomicsNodeState.regulated +
      attributes.metabolomicsNodeState.regulated;
    return val;
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
      if (!filterFunction.bind(this)(attributes))
        attributes.filterHidden = false;
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
            ? (attributes.filterHidden = true)
            : (attributes.filterHidden = false);
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
  metabolomics: filterValues,
  sumRegulated: { relative: filterValues; absolute: filterValues }
) {
  this.averageFilter.transcriptomics = transcriptomics;
  this.averageFilter.proteomics = proteomics;
  this.averageFilter.metabolomics = metabolomics;
  this.regulatedFilter.relative = sumRegulated.relative;
  this.regulatedFilter.absolute = sumRegulated.absolute;

  this.filterFuncTrans = filterFactory(this.averageFilter.transcriptomics);
  this.filterFuncProt = filterFactory(this.averageFilter.proteomics);
  this.filterFuncMeta = filterFactory(this.averageFilter.metabolomics);
  this.filterFuncSumRegulatedRelative = filterFactory(
    this.regulatedFilter.relative
  );
  this.filterFuncSumRegulatedAbsolute = filterFactory(
    this.regulatedFilter.absolute
  );

  this.filtersChanged = true;
  this.renderer.refresh();
}

function filterFactory(filterObj: filterValues): (X: number) => boolean {
  if (filterObj.filterActive) {
    if (filterObj.inside) {
      return (x: number) => {
        return x <= filterObj.value.max && x >= filterObj.value.min;
      };
    } else
      return (x: number) => {
        return x >= filterObj.value.max || x <= filterObj.value.min;
      };
  } else {
    return (_x: number) => true;
  }
}
