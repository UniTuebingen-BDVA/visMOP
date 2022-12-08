import { overviewNodeAttr } from '@/core/graphTypes';
import { PlainObject } from 'sigma/types';
import { animateNodes } from 'sigma/utils/animate';
import { filterValues } from '../../generalTypes';
import OverviewGraph from './overviewNetwork';

/**
 * Function used to apply the GUI filter to a single overview node
 * @param attributes node attributes
 * @returns boolean, indicating pass or block by filter
 */
function filterFunction(
  this: OverviewGraph,
  node: string,
  attributes: overviewNodeAttr
): boolean {
  if (attributes.isRoot || attributes.nodeType == 'moduleNode') {
    return false;
  } else if (
    this.filterFuncNegativeRoot(node) &&
    this.filterFuncRoot(node) &&
    this.filterFuncTrans(attributes.averageTranscriptomics as number) &&
    this.filterFuncAmtAbsTrans(attributes.transcriptomicsNodeState.regulated) &&
    this.filterFuncAmtRelTrans(
      (attributes.transcriptomicsNodeState.regulated /
        attributes.transcriptomicsNodeState.total) *
        100
    ) &&
    this.filterFuncProt(attributes.averageProteomics as number) &&
    this.filterFuncAmtAbsProt(attributes.proteomicsNodeState.regulated) &&
    this.filterFuncAmtRelProt(
      (attributes.proteomicsNodeState.regulated /
        attributes.proteomicsNodeState.total) *
        100
    ) &&
    this.filterFuncAmtAbsMeta(attributes.metabolomicsNodeState.regulated) &&
    this.filterFuncAmtRelMeta(
      (attributes.metabolomicsNodeState.regulated /
        attributes.metabolomicsNodeState.total) *
        100
    ) &&
    this.filterFuncMeta(attributes.averageMetabolomics as number) &&
    this.filterFuncAmtAbsSum(getRegSum(false, attributes)) &&
    this.filterFuncAmtRelSum(getRegSum(true, attributes))
  ) {
    return false;
  } else {
    return true;
  }
}
/**
 * Returns how many Entities are regulated (i.e. have an associated fold change) in a given pathway.
 * Using the relative parameter determine if this is an absolute or a relative measure
 * @param relative if a relative (to all entities in a pathway) or an absoulate abundance is returned
 * @param attributes the node attributes of the patway in question
 * @returns abundance of summed up entity abundance
 */
function getRegSum(relative: boolean, attributes: overviewNodeAttr): number {
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
export function filterElements(this: OverviewGraph) {
  if (this.filtersChanged) {
    this.filtersChanged = false;
    const tarPositions: PlainObject<PlainObject<number>> = {};
    this.graph.forEachNode((node, attributes) => {
      if (!filterFunction.bind(this)(node, attributes))
        attributes.filterHidden = false;
    });
    this.graph.forEachNode((node, attributes) => {
      if (
        filterFunction.bind(this)(node, attributes) &&
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
          filterFunction.bind(this)(node, attributes)
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
  this: OverviewGraph,
  transcriptomics: filterValues,
  transcriptomicsRegulated: { relative: filterValues; absolute: filterValues },
  proteomics: filterValues,
  proteomicsRegulated: { relative: filterValues; absolute: filterValues },
  metabolomics: filterValues,
  metabolomicsRegulated: { relative: filterValues; absolute: filterValues },
  sumRegulated: { relative: filterValues; absolute: filterValues }
) {
  this.averageFilter.transcriptomics = transcriptomics;
  this.regulateFilterTrans.relative = transcriptomicsRegulated.relative;
  this.regulateFilterTrans.absolute = transcriptomicsRegulated.absolute;
  this.averageFilter.proteomics = proteomics;
  this.regulateFilterProt.relative = proteomicsRegulated.relative;
  this.regulateFilterProt.absolute = proteomicsRegulated.absolute;
  this.averageFilter.metabolomics = metabolomics;
  this.regulateFilterMeta.relative = metabolomicsRegulated.relative;
  this.regulateFilterMeta.absolute = metabolomicsRegulated.absolute;
  this.regulatedFilter.relative = sumRegulated.relative;
  this.regulatedFilter.absolute = sumRegulated.absolute;

  this.filterFuncTrans = filterFactory(this.averageFilter.transcriptomics);
  this.filterFuncAmtAbsTrans = filterFactory(this.regulateFilterTrans.absolute);
  this.filterFuncAmtRelTrans = filterFactory(this.regulateFilterTrans.relative);

  this.filterFuncProt = filterFactory(this.averageFilter.proteomics);
  this.filterFuncAmtAbsProt = filterFactory(this.regulateFilterProt.absolute);
  this.filterFuncAmtRelProt = filterFactory(this.regulateFilterProt.relative);

  this.filterFuncMeta = filterFactory(this.averageFilter.metabolomics);
  this.filterFuncAmtAbsMeta = filterFactory(this.regulateFilterMeta.absolute);
  this.filterFuncAmtRelMeta = filterFactory(this.regulateFilterMeta.relative);

  this.filterFuncAmtRelSum = filterFactory(this.regulatedFilter.relative);
  this.filterFuncAmtAbsSum = filterFactory(this.regulatedFilter.absolute);

  this.filtersChanged = true;
  this.renderer.refresh();
}

/**
 * Generates a filter function to act as a band-pass or band-stop filter
 * @param filterObj filter object containing data min and max aswell as the
 * chosen limits and if the filter should act as band-pass or stop
 * @returns
 */
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

export function setRootFilter(
  this: OverviewGraph,
  rootFilter: { filterActive: boolean; rootID: string }
) {
  if (rootFilter.filterActive && rootFilter.rootID) {
    const rootSubtree = this.graph.neighbors(rootFilter.rootID);
    this.filterFuncRoot = (x: string) => {
      return x === rootFilter.rootID || rootSubtree.includes(x);
    };
  } else {
    this.filterFuncRoot = (_x: string) => true;
  }
  this.filtersChanged = true;
  this.renderer.refresh();
}

export function setRootNegativeFilter(
  this: OverviewGraph,
  rootNegativeFilter: { filterActive: boolean; rootIDs: string[] }
) {
  if (
    rootNegativeFilter.filterActive &&
    rootNegativeFilter.rootIDs.length > 0
  ) {
    const filteredNodeKeys = this.graph.filterNodes((node, attr) => {
      return !rootNegativeFilter.rootIDs.includes(attr.rootId);
    });
    this.filterFuncNegativeRoot = (x: string) => {
      return filteredNodeKeys.includes(x);
    };
  } else {
    this.filterFuncNegativeRoot = (_x: string) => true;
  }
  this.filtersChanged = true;
  this.renderer.refresh();
}
