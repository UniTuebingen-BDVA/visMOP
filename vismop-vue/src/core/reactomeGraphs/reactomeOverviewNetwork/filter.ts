import { overviewNodeAttr } from '@/core/reactomeGraphs/reactomeOverviewNetwork/overviewTypes';
import { PlainObject } from 'sigma/types';
import { animateNodes } from 'sigma/utils';
import { filterValues } from '@/core/reactomeGraphs/reactomeOverviewNetwork/overviewTypes';
import FilterData from './filterData';
import OverviewGraph from './overviewNetwork';

/**
 * Class containing all the functionality needed for the graphical filtering as controlled by the on screen interface of the overview network view
 */
export default class OverviewFilter {
  overviewGraph: OverviewGraph;

  filtersChanged = false;

  funcNegativeRoot: (x: string) => boolean = (_x: string) => true;
  funcRoot: (x: string) => boolean = (_x: string) => true;
  funcTrans: (x: number) => boolean = (_x: number) => true;
  funcAmtAbsTrans: (x: number) => boolean = (_x: number) => true;
  funcAmtRelTrans: (x: number) => boolean = (_x: number) => true;
  funcProt: (x: number) => boolean = (_x: number) => true;
  funcAmtAbsProt: (x: number) => boolean = (_x: number) => true;
  funcAmtRelProt: (x: number) => boolean = (_x: number) => true;
  funcMeta: (x: number) => boolean = (_x: number) => true;
  funcAmtAbsMeta: (x: number) => boolean = (_x: number) => true;
  funcAmtRelMeta: (x: number) => boolean = (_x: number) => true;
  funcAmtRelSum: (x: number) => boolean = (_x: number) => true;
  funcAmtAbsSum: (x: number) => boolean = (_x: number) => true;

  regulateFilterTrans = {
    relative: new FilterData(),
    absolute: new FilterData(),
  };
  regulateFilterProt = {
    relative: new FilterData(),
    absolute: new FilterData(),
  };
  regulateFilterMeta = {
    relative: new FilterData(),
    absolute: new FilterData(),
  };

  regulatedFilter = {
    relative: new FilterData(),
    absolute: new FilterData(),
  };
  averageFilter: {
    transcriptomics: filterValues;
    proteomics: filterValues;
    metabolomics: filterValues;
  } = {
    transcriptomics: new FilterData(),
    proteomics: new FilterData(),
    metabolomics: new FilterData(),
  };

  constructor(overviewGraph: OverviewGraph) {
    this.overviewGraph = overviewGraph;
  }

  /**
   * Function used to apply the GUI filter to a single overview node
   * @param attributes node attributes
   * @returns boolean, indicating pass or block by filter
   */
  filterFunction(node: string, attributes: overviewNodeAttr): boolean {
    if (attributes.isRoot || attributes.nodeType == 'cluster') {
      return false;
    } else if (
      this.funcNegativeRoot(node) &&
      this.funcRoot(node) &&
      this.funcTrans(attributes.fcAverages.transcriptomics as number) &&
      this.funcAmtAbsTrans(attributes.nodeState.transcriptomics.regulated) &&
      this.funcAmtRelTrans(
        (attributes.nodeState.transcriptomics.regulated /
          attributes.nodeState.transcriptomics.total) *
          100
      ) &&
      this.funcProt(attributes.fcAverages.proteomics as number) &&
      this.funcAmtAbsProt(attributes.nodeState.proteomics.regulated) &&
      this.funcAmtRelProt(
        (attributes.nodeState.proteomics.regulated /
          attributes.nodeState.proteomics.total) *
          100
      ) &&
      this.funcAmtAbsMeta(attributes.nodeState.metabolomics.regulated) &&
      this.funcAmtRelMeta(
        (attributes.nodeState.metabolomics.regulated /
          attributes.nodeState.metabolomics.total) *
          100
      ) &&
      this.funcMeta(attributes.fcAverages.metabolomics as number) &&
      this.funcAmtAbsSum(getRegSum(false, attributes)) &&
      this.funcAmtRelSum(getRegSum(true, attributes))
    ) {
      return false;
    } else {
      return true;
    }
  }
  /**
   * Apply GUI filter to graph
   */
  filterElements() {
    if (this.filtersChanged) {
      this.filtersChanged = false;
      const tarPositions: PlainObject<PlainObject<number>> = {};
      this.overviewGraph.graph.forEachNode((node, attributes) => {
        if (!this.filterFunction.bind(this)(node, attributes))
          attributes.filterHidden = false;
      });
      this.overviewGraph.graph.forEachNode((node, attributes) => {
        if (
          this.filterFunction.bind(this)(node, attributes) &&
          attributes.nodeType == 'regular'
        ) {
          const visibleParentNode = this.overviewGraph.getVisibleParent(node);
          const parentAttributes =
            this.overviewGraph.graph.getNodeAttributes(visibleParentNode);
          tarPositions[node] = {
            x: parentAttributes['x'],
            y: parentAttributes['y'],
          };
        } else if (attributes.nodeType == 'regular') {
          tarPositions[node] = {
            x: attributes.layoutX,
            y: attributes.layoutY,
          };
        }
      });
      this.overviewGraph.cancelCurrentAnimation = animateNodes(
        this.overviewGraph.graph,
        tarPositions,
        {
          duration: 2000,
          //easing: 'quadraticOut',
        },
        () => {
          this.overviewGraph.graph.forEachNode((node, attributes) => {
            if (attributes.nodeType == 'regular') {
              this.filterFunction.bind(this)(node, attributes)
                ? (attributes.filterHidden = true)
                : (attributes.filterHidden = false);
            }
          });
          this.overviewGraph.renderer.refresh();
          this.overviewGraph.setVisibleSubtree();
          this.overviewGraph.renderer.refresh();
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
  setAverageFilter(
    transcriptomics: filterValues,
    transcriptomicsRegulated: {
      relative: filterValues;
      absolute: filterValues;
    },
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

    this.funcTrans = filterFactory(this.averageFilter.transcriptomics);
    this.funcAmtAbsTrans = filterFactory(this.regulateFilterTrans.absolute);
    this.funcAmtRelTrans = filterFactory(this.regulateFilterTrans.relative);

    this.funcProt = filterFactory(this.averageFilter.proteomics);
    this.funcAmtAbsProt = filterFactory(this.regulateFilterProt.absolute);
    this.funcAmtRelProt = filterFactory(this.regulateFilterProt.relative);
    this.funcMeta = filterFactory(this.averageFilter.metabolomics);
    this.funcAmtAbsMeta = filterFactory(this.regulateFilterMeta.absolute);
    this.funcAmtRelMeta = filterFactory(this.regulateFilterMeta.relative);
    this.funcAmtRelSum = filterFactory(this.regulatedFilter.relative);
    this.funcAmtAbsSum = filterFactory(this.regulatedFilter.absolute);

    this.filtersChanged = true;
    this.overviewGraph.renderer.refresh();
  }

  /**
   * Set a positive filter for a root pathway, i.e., a filter which, if chosen, filters out all but the pathways belonging to the root pathway
   * @param rootFilter object containing whether the root filter is applied and if so for which rootID
   */
  setRootFilter(rootFilter: { filterActive: boolean; rootID: string }) {
    if (rootFilter.filterActive && rootFilter.rootID) {
      const rootSubtree = this.overviewGraph.graph.neighbors(rootFilter.rootID);
      this.funcRoot = (x: string) => {
        return x === rootFilter.rootID || rootSubtree.includes(x);
      };
    } else {
      this.funcRoot = (_x: string) => true;
    }
    this.filtersChanged = true;
    this.overviewGraph.renderer.refresh();
  }

  /**
   * Set a negative filter for a root pathway, i.e., a filter which, if chosen, filters out the pathways belonging to one of the chosen root pathways
   * @param rootNegativeFilter object containing whether the filter is applied and if so for which rootIDs
   */

  setRootNegativeFilter(rootNegativeFilter: {
    filterActive: boolean;
    rootIDs: string[];
  }) {
    if (
      rootNegativeFilter.filterActive &&
      rootNegativeFilter.rootIDs.length > 0
    ) {
      const filteredNodeKeys = this.overviewGraph.graph.filterNodes(
        (node, attr) => {
          return !rootNegativeFilter.rootIDs.includes(attr.rootId);
        }
      );
      this.funcNegativeRoot = (x: string) => {
        return filteredNodeKeys.includes(x);
      };
    } else {
      this.funcNegativeRoot = (_x: string) => true;
    }
    this.filtersChanged = true;
    this.overviewGraph.renderer.refresh();
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
      attributes.nodeState.transcriptomics.regulated +
      attributes.nodeState.proteomics.regulated +
      attributes.nodeState.metabolomics.regulated;

    const divisor =
      attributes.nodeState.transcriptomics.total +
      attributes.nodeState.proteomics.total +
      attributes.nodeState.metabolomics.total;
    const val = (enumerator / divisor) * 100;
    return val;
  } else {
    const val =
      attributes.nodeState.transcriptomics.regulated +
      attributes.nodeState.proteomics.regulated +
      attributes.nodeState.metabolomics.regulated;
    return val;
  }
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
