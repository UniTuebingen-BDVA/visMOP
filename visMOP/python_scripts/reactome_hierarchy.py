import json
import statistics
import pandas as pd
import os
from operator import itemgetter

from typing import List, Dict, DefaultDict, Tuple, Union, Literal, Iterator
import collections
from visMOP.python_scripts.hierarchy_types import (
    HierarchyMetadata,
    OmicMeasurement,
    SubdiagramOmicEntry,
    ReactomeGraphJSON,
    ModifiedReactomeGraphJSON,
    EntityNode,
    EventNode,
    SubpathwayNode,
    EntityOccurrence,
    HierarchyEntryDict,
    HierarchyEntryMeasurment,
)
from visMOP.python_scripts.omicsTypeDefs import ReactomePickleEntry
from pathlib import Path

from visMOP.python_scripts.timeseries_analysis import get_regression_data

stat_vals = {
    "common": [
        "common_numVals",
        "common_reg",
        "common_unReg",
        "common_measured",
    ],
    "slope": [
        "timeseries_meanSlopeAbove",
        "timeseries_meanSlopeBelow",
        "timeseries_percentSlopeBelow",
        "timeseries_percentSlopeAbove",
        "timeseries_meanSeAbove",
        "timeseries_meanSeBelow",
        "timeseries_percentSeAbove",
        "timeseries_percentSeBelow",
    ],
    "fc": [
        "fc_meanFcAbove",
        "fc_percentFcAbove",
        "fc_meanFcBelow",
        "fc_percentFcBelow",
    ],
}


def get_PathwaySummaryData_omic(
    num_entries: int,
    all_values: List[OmicMeasurement],
    limits: List[float],
    mode: str,
    omics_type: str,
) -> Dict[str, Union[float, int]]:
    num_val_omic = len(all_values)
    pathway_summary_data: Dict[str, float] = {}
    statics_to_calculate: list[str] = [*stat_vals["common"], *stat_vals[mode]]

    # statistics for products produced in a significant higher amount
    def calculate_mean(vals: List[float]) -> float:
        return sum(vals) / len(vals) if vals else float("nan")

    def calculate_percent(vals: List[float]) -> float:
        return len(vals) / num_val_omic if num_val_omic else 0

    if (
        "timeseries_meanSlopeAbove" in statics_to_calculate
        or "timeseries_percentSlopeAbove" in statics_to_calculate
    ):
        vals_higher_ul = [
            val["regressionData"]["slope"]
            for val in all_values
            if val["regressionData"] and val["regressionData"]["slope"] > limits[1]
        ]
        if "timeseries_meanSlopeAbove" in statics_to_calculate:
            pathway_summary_data[
                omics_type + "_timeseries_meanSlopeAbove"
            ] = calculate_mean(vals_higher_ul)

        if "timeseries_percentSlopeAbove" in statics_to_calculate:
            pathway_summary_data[
                omics_type + "_timeseries_percentSlopeAbove"
            ] = calculate_percent(vals_higher_ul)

    if (
        "timeseries_meanSlopeBelow" in statics_to_calculate
        or "timeseries_percentSlopeBelow" in statics_to_calculate
    ):
        vals_smaller_ll = [
            val["regressionData"]["slope"]
            for val in all_values
            if val["regressionData"] and val["regressionData"]["slope"] < limits[0]
        ]
        if "timeseries_meanSlopeBelow" in statics_to_calculate:
            pathway_summary_data[
                omics_type + "_timeseries_meanSlopeBelow"
            ] = calculate_mean(vals_smaller_ll)

        if "timeseries_percentSlopeBelow" in statics_to_calculate:
            pathway_summary_data[
                omics_type + "_timeseries_percentSlopeBelow"
            ] = calculate_percent(vals_smaller_ll)

    if (
        "timeseries_meanSeAbove" in statics_to_calculate
        or "timeseries_percentSeAbove" in statics_to_calculate
    ):
        vals_higher_ul = [
            val["regressionData"]["std_err"]
            for val in all_values
            if val["regressionData"] and val["regressionData"]["std_err"] > limits[3]
        ]
        if "timeseries_meanSeAbove" in statics_to_calculate:
            pathway_summary_data[
                omics_type + "_timeseries_meanSeAbove"
            ] = calculate_mean(vals_higher_ul)

        if "timeseries_percentSeAbove" in statics_to_calculate:
            pathway_summary_data[
                omics_type + "_timeseries_percentSeAbove"
            ] = calculate_percent(vals_higher_ul)

    if (
        "timeseries_meanSeBelow" in statics_to_calculate
        or "timeseries_percentSeBelow" in statics_to_calculate
    ):
        vals_smaller_ll = [
            val["regressionData"]["std_err"]
            for val in all_values
            if val["regressionData"] and val["regressionData"]["std_err"] < limits[2]
        ]
        if "timeseries_meanSeBelow" in statics_to_calculate:
            pathway_summary_data[
                omics_type + "_timeseries_meanSeBelow"
            ] = calculate_mean(vals_smaller_ll)

        if "timeseries_percentSeBelow" in statics_to_calculate:
            pathway_summary_data[
                omics_type + "_timeseries_percentSeBelow"
            ] = calculate_percent(vals_smaller_ll)

    # fold change mean and percent above
    if (
        "fc_meanFcAbove" in statics_to_calculate
        or "fc_percentFcAbove" in statics_to_calculate
    ):
        vals_higher_ul = [
            val["measurement"][0]
            for val in all_values
            if isinstance(val["measurement"], float) and val["measurement"] > limits[1]
        ]
        if "fc_meanFcAbove" in statics_to_calculate:
            pathway_summary_data[omics_type + "_fc_meanFcAbove"] = calculate_mean(
                vals_higher_ul
            )

        if "fc_percentFcAbove" in statics_to_calculate:
            pathway_summary_data[omics_type + "_fc_percentFcAbove"] = calculate_percent(
                vals_higher_ul
            )

    # fold change mean and percent below
    if (
        "fc_meanFcBelow" in statics_to_calculate
        or "fc_percentFcBelow" in statics_to_calculate
    ):
        vals_smaller_ll = [
            val["measurement"][0]
            for val in all_values
            if isinstance(val["measurement"], float) and val["measurement"] < limits[0]
        ]
        if "fc_meanFcBelow" in statics_to_calculate:
            pathway_summary_data[omics_type + "_fc_meanFcBelow"] = calculate_mean(
                vals_smaller_ll
            )

        if "fc_percentFcBelow" in statics_to_calculate:
            pathway_summary_data[omics_type + "_fc_percentFcBelow"] = calculate_percent(
                vals_smaller_ll
            )

    # common statistics
    if "common_numVals" in statics_to_calculate:
        pathway_summary_data["common_numVals"] = num_val_omic
    if "common_reg" in statics_to_calculate:
        measurement = [
            val["measurement"]
            if isinstance(val["measurement"], float)
            else statistics.fmean(val["measurement"])
            for val in all_values
        ]
        pathway_summary_data[omics_type + "_common_reg"] = (
            sum(val > limits[1] or val < limits[0] for val in measurement)
            / num_val_omic
            if num_val_omic
            else 0
        )
    if "common_unReg" in statics_to_calculate:
        measurement = [
            val["measurement"]
            if isinstance(val["measurement"], float)
            else statistics.fmean(val["measurement"])
            for val in all_values
        ]
        pathway_summary_data[omics_type + "_common_unReg"] = (
            sum(val < limits[1] and val > limits[0] for val in measurement)
            / num_val_omic
            if num_val_omic
            else 0
        )
    if "common_measured" in statics_to_calculate:
        pathway_summary_data[omics_type + "_common_measured"] = (
            num_val_omic / num_entries if num_entries != 0 else 0
        )

    return pathway_summary_data


class ReactomePathway:
    """Pathway Class for ractome pathway entries

    Args:
        Reactome_sID: Stable Reactome ID for pathway

    """

    def __init__(self, reactome_sID: str, has_diagram: bool):
        self.is_root: bool = False
        self.is_leaf: bool = False
        self.has_data: bool = False
        self.has_diagram: bool = has_diagram
        self.is_overview: bool = True
        self.name: str = ""
        self.layout_json_file: Dict[str, str] = {}
        self.graph_json_file: ModifiedReactomeGraphJSON = {
            "nodes": {},
            "edges": {},
            "subpathways": {},
            "dbId": 0,
            "stId": "",
        }
        self.reactome_sID: str = reactome_sID
        self.db_Id: int = 0
        self.children: List[str] = []
        self.children_with_data: List[str] = []
        self.subtree_ids: List[str] = []
        self.diagram_entry: Union[ReactomePathway, None] = None
        self.own_measured_proteins: List[str] = []
        self.own_measured_genes: List[str] = []
        self.own_measured_metabolites: List[str] = []
        self.own_measured_maplinks: List[str] = []
        self.total_measured_proteins: Dict[str, OmicMeasurement] = {}
        self.total_measured_genes: Dict[str, OmicMeasurement] = {}
        self.total_measured_metabolites: Dict[str, OmicMeasurement] = {}
        self.total_measured_maplinks: Dict[str, OmicMeasurement] = {}
        self.subdiagrams_measured_proteins: Dict[
            Union[str, int], SubdiagramOmicEntry
        ] = {}
        self.subdiagrams_measured_genes: Dict[Union[str, int], SubdiagramOmicEntry] = {}
        self.subdiagrams_measured_metabolites: Dict[
            Union[str, int], SubdiagramOmicEntry
        ] = {}
        self.subdiagrams_measured_maplinks: Dict[
            Union[str, int], SubdiagramOmicEntry
        ] = {}
        self.total_proteins: Dict[str, Dict[int, EntityOccurrence]] = {}
        self.total_metabolites: Dict[str, Dict[int, EntityOccurrence]] = {}
        self.maplinks: Dict[str, Dict[int, EntityOccurrence]] = {}
        self.parents: List[str] = []
        self.parents_with_data: List[str] = []
        self.level: int = -1
        self.root_id: str = ""

    __getitem__ = object.__getattribute__

    def asdict(self):
        """Returns Object as dictionary"""
        return {
            "reactome_sID": self.reactome_sID,
            "children": self.children,
            "parents": self.parents,
            "is_leaf": self.is_leaf,
            "is_root": self.is_root,
            "level": self.level,
            "root_id": self.root_id,
        }

    def assert_leaf_root_state(self):
        """Checks if pathway is root or leaf"""
        if len(self.children) == 0:
            self.is_leaf = True
        if len(self.parents) == 0:
            self.is_root = True


class ReactomeHierarchy(dict[str, ReactomePathway]):
    """Class for pathway hierarchy

    functions as main datastructure for reactome data
    """

    def __getitem__(self, key: str) -> ReactomePathway:
        return super().__getitem__(key)

    def __init__(self, metadata: HierarchyMetadata) -> None:
        super(ReactomeHierarchy, self).__init__()
        self.levels: Dict[int, List[str]] = {}
        self.omics_recieved: List[bool] = []
        self.amt_timesteps: int = metadata["amt_timesteps"]
        self.omics_recieved = metadata["omics_recieved"]
        self.load_data(metadata["relational_data_path"], metadata["target_organism"])
        self.add_json_data(metadata["json_data_path"])

    def add_hierarchy_levels(self) -> None:
        """Adds hierarchy levels to all entries.
        With 0 Being root and each increase is one level further
        """
        for k, v in self.items():
            final_entries: List[List[str]] = []
            self._hierarchy_levels_recursion(k, [], final_entries)
            shortest_path: List[str] = min(final_entries, key=len)
            level: int = len(shortest_path) - 1
            v.level = level
            v.root_id = shortest_path[level]
            if level in self.levels:
                self.levels[level].append(v.reactome_sID)
            else:
                self.levels[level] = [v.reactome_sID]

    def _hierarchy_levels_recursion(
        self, entry_id: str, path: List[str], final_entries: List[List[str]]
    ) -> None:
        current_entry: ReactomePathway = self[entry_id]
        path.append(entry_id)
        if self[entry_id].is_root:
            final_entries.append(path)
        else:
            for parent in current_entry.parents:
                self._hierarchy_levels_recursion(parent, path, final_entries)

    def hierarchyInfo(self) -> Dict[str, int]:
        """Prints info about hierarchy"""
        entries: int = len(self.keys())
        leafs: int = len([v for v in self.values() if v.is_leaf])
        roots: int = len([v for v in self.values() if v.is_root])
        return {"size": entries, "leafs": leafs, "roots": roots}

    def generate_parents_children_with_data(self) -> None:
        for entry in self.values():
            for parent_entry in entry.parents:
                entryObject: ReactomePathway = self[parent_entry]
                if entryObject.has_data:
                    entry.parents_with_data.append(parent_entry)
            for child_entry in entry.children:
                entryObject: ReactomePathway = self[child_entry]
                if entryObject.has_data:
                    entry.children_with_data.append(child_entry)

    def add_json_data(self, json_path: Path) -> None:
        """Adds json data to the pathways

        this includes names, aswell as detail level pathway information

        Args:
            json_path: path at which to find the json diagram files
        """
        current_level = 0
        key_list = list(self.levels.keys())
        key_list.sort()
        for current_level in key_list:
            current_level_ids: List[str] = self.levels[current_level]
            for key in current_level_ids:
                entry: ReactomePathway = self[key]
                if entry.has_diagram:
                    with open(json_path / (key + ".json"), encoding="utf8") as fh:
                        json_file_layout = json.load(fh)
                        entry.layout_json_file = json_file_layout
                        entry.name = json_file_layout["displayName"]

                if entry.has_diagram:
                    with open(json_path / (key + ".graph.json"), encoding="utf8") as fh:
                        json_file_graph: ReactomeGraphJSON = json.load(fh)
                        json_file_mod: ModifiedReactomeGraphJSON = format_graph_json(
                            json_file_graph
                        )
                        entry.graph_json_file = json_file_mod
                        (
                            prot,
                            molec,
                            contained_maplinks,
                            is_overview,
                        ) = get_contained_entities_graph_json(
                            list(entry.graph_json_file["nodes"].keys()),
                            entry.graph_json_file,
                        )
                        entry.total_proteins = prot
                        entry.total_metabolites = molec
                        entry.diagram_entry = entry
                        entry.maplinks = contained_maplinks
                        entry.is_overview = is_overview
                        entry.db_Id = entry.graph_json_file["dbId"]

        current_level = 0

        for current_level in key_list:
            current_level_ids = self.levels[current_level]

            for key in current_level_ids:
                entry = self[key]
                if not entry.has_diagram:
                    entries_with_diagram: List[Tuple[str, int]] = []
                    self._find_diagram_recursion(key, entries_with_diagram, 0)
                    shortest_path_key = min(entries_with_diagram, key=itemgetter(1))[0]
                    entry_with_diagram = self[shortest_path_key]
                    (
                        prot,
                        molec,
                        contained_maplinks,
                        is_overview,
                        name,
                        db_Id,
                    ) = get_subpathway_entities_graph_json(
                        entry_with_diagram.graph_json_file, key
                    )
                    entry.diagram_entry = entry_with_diagram
                    entry.name = name
                    entry.db_Id = db_Id
                    entry.total_proteins = prot
                    entry.total_metabolites = molec
                    entry.maplinks = contained_maplinks
                    entry.is_overview = is_overview

    def _find_diagram_recursion(
        self, entry_id: str, final_entries: List[Tuple[str, int]], steps: int
    ) -> None:
        arrived_at_diagram = False
        current_entry: ReactomePathway = self[entry_id]

        arrived_at_diagram: bool = current_entry.has_diagram
        if arrived_at_diagram:
            final_entries.append((entry_id, steps))
        else:
            if len(current_entry.parents) > 0:
                for parent in current_entry.parents:
                    self._find_diagram_recursion(parent, final_entries, steps + 1)
            else:
                if not arrived_at_diagram:
                    print("did not find diagram for: ", entry_id)

    def aggregate_pathways(self) -> None:
        """Aggregates data from low level nodes to higher level nodes

        as the supplied omics data is only mapped to leaf nodes, data has to be aggregated to the higher level nodes
        """
        # sort levels descending that propagation is correctly from the leaves to the root nodes
        # still strange bug that some insanely high levels > 20,50 are encountered
        levels_descending: List[int] = sorted(self.levels.keys(), reverse=True)
        for level in levels_descending:
            for entry_key in self.levels[level]:
                v: ReactomePathway = self[entry_key]
                # if not v.is_leaf:
                subtree: List[str] = self.get_subtree_target(v.reactome_sID)
                own_measured_proteins: List[str] = list(set(v.own_measured_proteins))
                own_measured_genes: List[str] = list(set(v.own_measured_genes))
                own_measured_metabolites: List[str] = list(
                    set(v.own_measured_metabolites)
                )
                own_measured_maplinks: List[str] = list(set(v.own_measured_maplinks))
                total_measured_proteins: Dict[
                    str, OmicMeasurement
                ] = v.total_measured_proteins
                total_measured_genes: Dict[
                    str, OmicMeasurement
                ] = v.total_measured_genes
                total_measured_metabolites: Dict[
                    str, OmicMeasurement
                ] = v.total_measured_metabolites
                total_measured_maplinks: Dict[
                    str, OmicMeasurement
                ] = v.total_measured_maplinks  # ?
                subdiagrams_measured_proteins: Dict[
                    Union[str, int], SubdiagramOmicEntry
                ] = {}
                subdiagrams_measured_genes: Dict[
                    Union[str, int], SubdiagramOmicEntry
                ] = {}
                subdiagrams_measured_metabolites: Dict[
                    Union[str, int], SubdiagramOmicEntry
                ] = {}
                subdiagrams_measured_maplinks: Dict[
                    Union[str, int], SubdiagramOmicEntry
                ] = {}  # ?
                total_proteins: Dict[
                    str, Dict[int, EntityOccurrence]
                ] = v.total_proteins
                total_metabolites: Dict[
                    str, Dict[int, EntityOccurrence]
                ] = v.total_metabolites
                subtree_ids = subtree
                subtree_ids.append(v.reactome_sID)
                v.subtree_ids = subtree_ids

                for node in v.children:
                    current_node = self[node]
                    if current_node.has_diagram:
                        # current_node.db_Id is only internal ID, later we might also need the stable id
                        if len(current_node.total_measured_proteins.keys()) > 0:
                            subdiagrams_measured_proteins[current_node.db_Id] = {
                                "stableID": current_node.reactome_sID,
                                "nodes": list(
                                    current_node.total_measured_proteins.keys()
                                ),
                            }
                        if len(current_node.total_measured_genes.keys()) > 0:
                            subdiagrams_measured_genes[current_node.db_Id] = {
                                "stableID": current_node.reactome_sID,
                                "nodes": list(current_node.total_measured_genes.keys()),
                            }
                        if len(current_node.total_measured_metabolites.keys()) > 0:
                            subdiagrams_measured_metabolites[current_node.db_Id] = {
                                "stableID": current_node.reactome_sID,
                                "nodes": list(
                                    current_node.total_measured_metabolites.keys()
                                ),
                            }
                        if len(current_node.total_measured_maplinks.keys()) > 0:
                            subdiagrams_measured_maplinks[current_node.db_Id] = {
                                "stableID": current_node.reactome_sID,
                                "nodes": list(
                                    current_node.total_measured_maplinks.keys()
                                ),
                            }
                    else:
                        own_measured_proteins = list(
                            set(
                                own_measured_proteins
                                + current_node.own_measured_proteins
                            )
                        )
                        own_measured_genes = list(
                            set(own_measured_genes + current_node.own_measured_genes)
                        )
                        own_measured_metabolites = list(
                            set(
                                own_measured_metabolites
                                + current_node.own_measured_metabolites
                            )
                        )
                        own_measured_maplinks = list(
                            set(
                                own_measured_maplinks
                                + current_node.own_measured_maplinks
                            )
                        )

                    subdiagrams_measured_proteins = {
                        **subdiagrams_measured_proteins,
                        **current_node.subdiagrams_measured_proteins,
                    }
                    subdiagrams_measured_genes = {
                        **subdiagrams_measured_genes,
                        **current_node.subdiagrams_measured_genes,
                    }
                    subdiagrams_measured_metabolites = {
                        **subdiagrams_measured_metabolites,
                        **current_node.subdiagrams_measured_metabolites,
                    }
                    subdiagrams_measured_maplinks = {
                        **subdiagrams_measured_maplinks,
                        **current_node.subdiagrams_measured_maplinks,
                    }
                    total_measured_proteins = {
                        **total_measured_proteins,
                        **current_node.total_measured_proteins,
                    }
                    total_measured_genes = {
                        **total_measured_genes,
                        **current_node.total_measured_genes,
                    }
                    total_measured_metabolites = {
                        **total_measured_metabolites,
                        **current_node.total_measured_metabolites,
                    }
                    total_measured_maplinks = {
                        **total_measured_maplinks,
                        **current_node.total_measured_maplinks,
                    }
                    total_proteins = {**total_proteins, **current_node.total_proteins}
                    total_metabolites = {
                        **total_metabolites,
                        **current_node.total_metabolites,
                    }

                v.total_measured_proteins = total_measured_proteins
                v.total_measured_genes = total_measured_genes
                v.total_measured_metabolites = total_measured_metabolites
                v.total_measured_maplinks = total_measured_maplinks
                v.own_measured_proteins = list(set(own_measured_proteins))
                v.own_measured_genes = list(set(own_measured_genes))
                v.own_measured_metabolites = list(set(own_measured_metabolites))
                v.own_measured_maplinks = list(set(own_measured_maplinks))
                v.subdiagrams_measured_proteins = subdiagrams_measured_proteins
                v.subdiagrams_measured_genes = subdiagrams_measured_genes
                v.subdiagrams_measured_metabolites = subdiagrams_measured_metabolites
                v.subdiagrams_measured_maplinks = subdiagrams_measured_maplinks
                v.total_proteins = total_proteins
                v.total_metabolites = total_metabolites
                if (
                    (len(v.total_measured_proteins) > 0)
                    or (len(v.total_measured_genes) > 0)
                    or (len(v.total_measured_metabolites) > 0)
                ):
                    v.has_data = True

    def get_subtree_target(self, tar_id: str) -> List[str]:
        """Gets all leaves found for target entry

        Args:
            tar_id: String: entry id for which to retrieve leaves
        """
        subtree: List[str] = []
        self._subtree_recursive(tar_id, subtree)
        return subtree

    def _subtree_recursive(self, entry_id: str, subtree: List[str]):
        """
        Recursive function to get all leaves for a given entry id

        Args:
            entry_id: String: entry id for which to retrieve leaves
            subtree: List: list of leaves
        """
        if (
            entry_id in self
        ):  # NOTE was if entry_id is not None, so if its not working get back here
            if len(self[entry_id].children) == 0:
                pass  # leaves.append(entry_id)
            for elem in self[entry_id].children:
                self._subtree_recursive(elem, subtree)
            subtree.append(entry_id)

    def add_query_data(
        self,
        entity_data: ReactomePickleEntry,
        query_type: Literal["protein", "gene", "metabolite"],
        query_key: str,
        mode: Literal["slope", "fc"],
    ) -> None:
        """Adds query data (i.e. experimental omics data, to hierarchy structure)"""
        current_reactome_id = entity_data["reactome_id"]
        for pathway in entity_data["pathways"]:
            if self[pathway[0]].name == "":
                self[pathway[0]].name = pathway[1]
            if query_type == "protein":
                if query_key in self[pathway[0]].total_measured_proteins:
                    self[pathway[0]].total_measured_proteins[query_key]["forms"][
                        current_reactome_id
                    ] = {
                        "name": entity_data["name"],
                        "toplevelId": list(
                            self[pathway[0]].total_proteins[current_reactome_id].keys()
                        ),
                    }
                    self[pathway[0]].own_measured_proteins.append(query_key)
                else:
                    measurement = entity_data.get("measurement")
                    omic_measurment: OmicMeasurement = {
                        "measurement": measurement if measurement else [0],
                        "regressionData": get_regression_data(measurement)
                        if measurement and mode == "slope"
                        else None,
                        "forms": {
                            current_reactome_id: {
                                "name": entity_data["name"],
                                "toplevelId": list(
                                    self[pathway[0]]
                                    .total_proteins[current_reactome_id]
                                    .keys()
                                ),
                            }
                        },
                    }
                    self[pathway[0]].total_measured_proteins[
                        query_key
                    ] = omic_measurment
                    self[pathway[0]].own_measured_proteins.append(query_key)
            elif query_type == "gene":
                if query_key in self[pathway[0]].total_measured_genes:
                    self[pathway[0]].total_measured_genes[query_key]["forms"][
                        current_reactome_id
                    ] = {
                        "name": entity_data["name"],
                        "toplevelId": list(
                            self[pathway[0]].total_proteins[current_reactome_id].keys()
                        ),
                    }
                    if query_key not in self[pathway[0]].own_measured_genes:
                        self[pathway[0]].own_measured_genes.append(query_key)
                else:
                    measurement: List[float] | None = entity_data.get("measurement")
                    omic_measurment: OmicMeasurement = {
                        "measurement": measurement if measurement else [0],
                        "regressionData": get_regression_data(measurement)
                        if measurement and mode == "slope"
                        else None,
                        "forms": {
                            current_reactome_id: {
                                "name": entity_data["name"],
                                "toplevelId": list(
                                    self[pathway[0]]
                                    .total_proteins[current_reactome_id]
                                    .keys()
                                ),
                            }
                        },
                    }
                    self[pathway[0]].total_measured_genes[query_key] = omic_measurment
                    self[pathway[0]].own_measured_genes.append(query_key)
            elif query_type == "metabolite":
                if query_key in self[pathway[0]].total_measured_metabolites:
                    self[pathway[0]].total_measured_metabolites[query_key]["forms"][
                        current_reactome_id
                    ] = {
                        "name": entity_data["name"],
                        "toplevelId": list(
                            self[pathway[0]]
                            .total_metabolites[current_reactome_id]
                            .keys()
                        ),
                    }
                    self[pathway[0]].own_measured_metabolites.append(query_key)
                else:
                    measurement: List[float] | None = entity_data.get("measurement")
                    omic_measurment: OmicMeasurement = {
                        "measurement": measurement if measurement else [0],
                        "regressionData": get_regression_data(measurement)
                        if measurement and mode == "slope"
                        else None,
                        "forms": {
                            current_reactome_id: {
                                "name": entity_data["name"],
                                "toplevelId": list(
                                    self[pathway[0]]
                                    .total_metabolites[current_reactome_id]
                                    .keys()
                                ),
                            }
                        },
                    }
                    self[pathway[0]].total_measured_metabolites[
                        query_key
                    ] = omic_measurment
                    self[pathway[0]].own_measured_metabolites.append(query_key)

    def load_data(self, path: Path, organism: str) -> None:
        """Load hierarchy data into datastructure
        Args:
            path: path to data folder

            organism: 3 letter abbrev for target organism
        """
        diagram_files = os.listdir(path / "diagram")
        with open(path / "ReactomePathwaysRelation.txt") as fh:
            for line in fh:
                line_list = line.strip().split("\t")
                left_entry = line_list[0]
                right_entry = line_list[1]
                left_entry_has_diagram = left_entry + ".graph.json" in diagram_files
                right_entry_has_diagram = right_entry + ".graph.json" in diagram_files
                if organism in left_entry:
                    if left_entry not in self.keys():
                        self[left_entry] = ReactomePathway(
                            left_entry, left_entry_has_diagram
                        )
                        self[left_entry].children.append(right_entry)
                    else:
                        self[left_entry].children.append(right_entry)
                    if right_entry not in self.keys():
                        self[right_entry] = ReactomePathway(
                            right_entry, right_entry_has_diagram
                        )
                        self[right_entry].parents.append(left_entry)
                    else:
                        self[right_entry].parents.append(left_entry)

        for v in self.values():
            v.assert_leaf_root_state()
        self.add_hierarchy_levels()

    def get_subtree_non_overview(self, tar_id: str) -> List[str]:
        """Gets all leaves found for target entry

        Args:
            tar_id: String: entry id for which to retrieve leaves
        """
        subtree: List[str] = []
        self._get_subtree_non_overview_recursion(tar_id, subtree)
        return subtree

    def _get_subtree_non_overview_recursion(self, entry_id: str, subtree: List[str]):
        """Recursive function for leaf retrieval"""
        if (
            entry_id in self
        ):  # NOTE was if entry_id is not None, so if its not working get back here
            if not self[entry_id].is_overview:
                if not self[entry_id].is_root:
                    subtree.append(entry_id)
                    return
            if self[entry_id].is_overview or self[entry_id].is_root:
                for elem in self[entry_id].children:
                    self._get_subtree_non_overview_recursion(elem, subtree)

    def generate_overview_data(
        self,
        omic_limits: List[List[float]],
        verbose: bool,
        mode: str,
        onlyCompletePathways: bool = False,
    ) -> Tuple[
        List[HierarchyEntryDict],
        List[str],
        Dict[str, List[str]],
        List[Dict[str, str]],
        List[str],
        DefaultDict[str, List[str]],
        pd.DataFrame,
        List[bool],
    ]:
        """Generates data to be exported to the frontend
        Args:
            omic_limits: dictionary: limits for omic data
            verbose: boolean: If total proteins/metabolite ids should be transmitted
            mode: string: "slope" or "fc"
            onlyCompletePathways: boolean: if only pathways with all omics should be returned
        Returns:
            List of pathway overview entries, with each element being one pathway
            Dictionary of which query (accession Ids, e.g. uniprot/ensmbl) maps to which pathways
            List of pathways
            List of contained hierarchy nodes
        """
        out_data: List[HierarchyEntryDict] = []
        central_nodes_out: List[str] = []
        central_nodes: List[str] = []
        # pathway_ids = self.levels[level]
        pathway_ids: List[str] = []
        for root in self.levels[0]:
            central_nodes.extend(self.get_subtree_non_overview(root))
        # central_nodes.extend(self.levels[0])
        central_nodes = list(set(central_nodes))
        for root in self.levels[0]:
            pathway_ids.extend(self.get_subtree_target(root))
        pathway_ids.extend(self.levels[0])
        pathway_ids = list(set(pathway_ids))
        query_pathway_dict: Dict[str, List[str]] = {}
        root_subpathways: DefaultDict[str, List[str]] = collections.defaultdict(list)
        pathway_dropdown: List[Dict[str, str]] = []
        root_ids: List[str] = []
        pathways_root_names: Dict[str, List[str]] = {}
        pathway_summary_stats_dict = {}
        self.generate_parents_children_with_data()
        for pathway in pathway_ids:
            entry: ReactomePathway = self[pathway]
            if entry.has_data:
                amount_timesteps = self.amt_timesteps if mode == "individual" else 1
                for timepoint in range(amount_timesteps):
                    pathway_dict: HierarchyEntryDict
                    dropdown_entry: Dict[str, str]
                    pathway_summary_data: Dict[str, float]
                    (
                        pathway_dict,
                        dropdown_entry,
                        pathway_summary_data,
                    ) = generate_overview_pathway_entry(
                        entry,
                        pathway in central_nodes,
                        pathway,
                        mode,
                        timepoint,
                        amount_timesteps,
                        query_pathway_dict,
                        verbose,
                        omic_limits,
                        self.omics_recieved,
                    )
                    # only consider entries which do have data for all supplied omics (recieved from frontend)
                    if onlyCompletePathways:
                        zip_omics_recived_strings: Iterator[
                            Tuple[
                                Literal[
                                    "transcriptomics", "proteomics", "metabolomics"
                                ],
                                bool,
                            ]
                        ] = zip(
                            ["transcriptomics", "proteomics", "metabolomics"],
                            self.omics_recieved,
                        )

                        omics_recived_strings: List[
                            Literal["transcriptomics", "proteomics", "metabolomics"]
                        ] = [
                            omic
                            for (omic, boolean) in zip_omics_recived_strings
                            if boolean
                        ]
                        if not all(
                            [
                                len(pathway_dict["entries"][omic]["measured"]) > 0
                                for omic in omics_recived_strings
                            ]
                        ):
                            continue

                    pathway_dropdown.append(dropdown_entry)
                    out_data.append(pathway_dict)
                    if pathway in central_nodes:
                        central_nodes_out.append(pathway_dict["pathwayId"])
                    root_ids.append(pathway_dict["rootId"])
                    pathways_root_names[pathway_dict["rootId"]] = [
                        self[entry.root_id].name
                    ]
                    # pathways_root_names[entry.reactome_sID].append(hierarchical_roots)

                    # print(pathways_root_names[entry.reactome_sID])
                    root_subpathways[pathway_dict["rootId"]].extend(
                        pathway_dict["subtreeIds"]
                    )
                    pathway_summary_stats_dict[
                        pathway_dict["pathwayId"]
                    ] = pathway_summary_data

        stat_vals_combined = [*stat_vals["common"], *stat_vals[mode]]
        omics = [o for i, o in enumerate(["t_", "p_ ", "m_"]) if self.omics_recieved[i]]
        stat_vals_colnames = [o + stat for o in omics for stat in stat_vals_combined]
        stat_vals_colnames.append("pathway_size")
        return (
            out_data,
            central_nodes_out,
            query_pathway_dict,
            pathway_dropdown,
            list(set(root_ids)),
            root_subpathways,
            pd.DataFrame.from_dict(pathway_summary_stats_dict, orient="index"),
            self.omics_recieved,
        )


###
# Auxilliary Functions
###
def extract_measurement_data(
    data: List[OmicMeasurement],
    timepoint_index: int,
    mode: str,
) -> List[OmicMeasurement]:
    """Extracts measurement data for each timepount from OmicMeasurement objects
    Args:
        data: dictionary of OmicMeasurement objects
        timepoint_index: index of timepoint to extract
        mode: string: "slope" or "fc"
    Returns:
        List of dictionaries, each containing one omic measurement

    """
    out_list: List[OmicMeasurement] = []
    for elem in data:
        if mode == "fc":
            new_elem = elem.copy()
            new_elem["measurement"] = [elem["measurement"][timepoint_index]]
            out_list.append(new_elem)
        else:
            out_list.append(elem)
    return out_list


def add_data_to_pathway_dict(
    entry: ReactomePathway,
    timepoint_index: int,
    mode: str,
    pathway_Id: str,
    pathway_dict: HierarchyEntryDict,
    query_pathway_dict: Dict[str, List[str]],
    data_type: Tuple[str, str],
) -> None:
    for k, v in entry[f"total_measured_{data_type[0]}"].items():
        name = v["forms"][list(v["forms"].keys())[0]]["name"].split(" [")[0]
        dict_entry: HierarchyEntryMeasurment = {
            "queryId": k,
            "value": v["measurement"][timepoint_index]
            if mode == "fc"
            else v["measurement"][0],
            "name": name,
            "forms": v["forms"],
            "regressionData": v["regressionData"] if mode == "slope" else None,
        }
        pathway_dict["entries"][data_type[1]]["measured"][k] = dict_entry
        if k in query_pathway_dict.keys():
            query_pathway_dict[k].append(pathway_Id)
        else:
            query_pathway_dict[k] = [pathway_Id]


def generate_overview_pathway_entry(
    entry: ReactomePathway,
    is_central: bool,
    pathway_Id: str,
    mode: str,
    timepoint_index: int,
    amt_timesteps: int,
    query_pathway_dict: Dict[str, List[str]],
    verbose: bool,
    omic_limits: List[List[float]],
    omics_recieved: list[bool],
) -> Tuple[HierarchyEntryDict, Dict[str, str], Dict[str, float]]:
    """generates pathway entry for overview
    Args:
        entry: entry object
        is_central: boolean if entry is in the central nodes
        pathway_Id: if of pathway
        mode: string: "slope" or "fc"
        timepoint_index: int: index of timepoint
        amt_timesteps: int: amount of timepoints
        query_pathway_dict: dictionary associating query id to pathways in which query is appearing
        verbose: boolean if total proteins should be enumerated or if only number should be used
        omic_limits: dictionary: limits for omic data
        omics_recieved: list of booleans: if omic data was recieved

    Returns:
        formatted json file dictionary

    """
    pathway_dict: HierarchyEntryDict = {
        "pathwayName": "",
        "pathwayId": "",
        "rootId": "",
        "nodeType": "",
        "isCentral": is_central,
        "isOverview": False,
        "maplinks": {},
        "subtreeIds": [],
        "parents": [],
        "children": [],
        "insetPathwayEntryIDs": {
            "proteomics": {},
            "transcriptomics": {},
            "metabolomics": {},
        },
        "ownMeasuredEntryIDs": {
            "proteomics": [],
            "transcriptomics": [],
            "metabolomics": [],
        },
        "entries": {
            "proteomics": {"measured": {}, "total": 0},
            "transcriptomics": {"measured": {}, "total": 0},
            "metabolomics": {"measured": {}, "total": 0},
        },
    }
    if amt_timesteps > 1:
        string_suffix = "_" + str(timepoint_index)
    else:
        string_suffix = ""
    pathway_dict["pathwayName"] = entry.name + string_suffix
    pathway_dict["pathwayId"] = entry.reactome_sID + string_suffix
    pathway_dict["rootId"] = entry.root_id + string_suffix
    pathway_dict["nodeType"] = (
        "root" if entry.is_root else "regular" if is_central else "hierarchical"
    )
    pathway_dict["maplinks"] = entry.maplinks
    pathway_dict["subtreeIds"] = [elem + string_suffix for elem in entry.subtree_ids]
    pathway_dict["isOverview"] = entry.is_overview
    pathway_dict["parents"] = [elem + string_suffix for elem in entry.parents_with_data]
    pathway_dict["children"] = [
        elem + string_suffix for elem in entry.children_with_data
    ]
    pathway_dict["ownMeasuredEntryIDs"]["proteomics"] = list(
        set(entry.own_measured_proteins)
    )
    pathway_dict["ownMeasuredEntryIDs"]["transcriptomics"] = list(
        set(entry.own_measured_genes)
    )
    pathway_dict["ownMeasuredEntryIDs"]["metabolomics"] = list(
        set(entry.own_measured_metabolites)
    )
    pathway_dict["insetPathwayEntryIDs"][
        "proteomics"
    ] = entry.subdiagrams_measured_proteins
    pathway_dict["insetPathwayEntryIDs"][
        "transcriptomics"
    ] = entry.subdiagrams_measured_genes
    pathway_dict["insetPathwayEntryIDs"][
        "metabolomics"
    ] = entry.subdiagrams_measured_metabolites

    pathway_dropdown_entry: dict[str, str] = {
        "text": entry.reactome_sID + ": " + entry.name + string_suffix,
        "value": entry.reactome_sID + string_suffix,
        "title": entry.name,
    }

    pathway_dict["entries"]["proteomics"]["total"] = (
        entry.total_proteins if verbose else len(entry.total_proteins)
    )
    pathway_dict["entries"]["transcriptomics"]["total"] = (
        entry.total_proteins if verbose else len(entry.total_proteins)
    )
    pathway_dict["entries"]["metabolomics"]["total"] = (
        entry.total_metabolites if verbose else len(entry.total_metabolites)
    )

    # fill statistical datat for pathway
    pathway_summary_data = {}
    # num_entries = len(
    #     set(
    #         list(entry.total_measured_genes.keys())
    #         + list(entry.total_measured_proteins.keys())
    #         + list(entry.total_measured_metabolites.keys())
    #     )
    # )
    values_per_omic: list[list[OmicMeasurement]] = [
        extract_measurement_data(
            list(entry.total_measured_genes.values()), timepoint_index, mode
        ),
        extract_measurement_data(
            list(entry.total_measured_proteins.values()), timepoint_index, mode
        ),
        extract_measurement_data(
            list(entry.total_measured_metabolites.values()), timepoint_index, mode
        ),
    ]

    num_entries_omics = [
        len(entry.total_proteins),
        len(entry.total_proteins),
        len(entry.total_metabolites),
    ]
    # perc_vals_total = sum([len(vals) /num_total for vals, num_total in zip(values_per_omic, num_entries_omics) if num_total > 0])
    perc_vals_total = len(
        [value for values_omic in values_per_omic for value in values_omic]
    ) / sum(num_entries_omics)

    for omic_recieved, omic_values_dict, num_entries_omic, limits, omicsType in zip(
        omics_recieved,
        values_per_omic,
        num_entries_omics,
        omic_limits,
        ["t", "p", "m", "nonOmic"],
    ):
        if omic_recieved:
            omic_values = [vals for vals in omic_values_dict]
            # print(num_entries_omic, omic_values, limits)
            pathway_summary_data: Dict[str, Union[float, int]] = {
                **pathway_summary_data,
                **get_PathwaySummaryData_omic(
                    num_entries_omic, omic_values, limits, mode, omicsType
                ),
            }

    # pathway_summary_data.append(len(entry.subtree_ids))
    pathway_summary_data["nonOmic_percentMeasured"] = perc_vals_total
    add_data_to_pathway_dict(
        entry,
        timepoint_index,
        mode,
        pathway_Id,
        pathway_dict,
        query_pathway_dict,
        ("proteins", "proteomics"),
    )
    add_data_to_pathway_dict(
        entry,
        timepoint_index,
        mode,
        pathway_Id,
        pathway_dict,
        query_pathway_dict,
        ("genes", "transcriptomics"),
    )
    add_data_to_pathway_dict(
        entry,
        timepoint_index,
        mode,
        pathway_Id,
        pathway_dict,
        query_pathway_dict,
        ("metabolites", "metabolomics"),
    )
    return pathway_dict, pathway_dropdown_entry, pathway_summary_data


def format_graph_json(graph_json_file: ReactomeGraphJSON) -> ModifiedReactomeGraphJSON:
    """Formats .graph.json nodes to be easily accessible in dictionary form with
    the keys being node Ids

    Args:
        graph_json_file: loaded graph.json file

    Returns:
        formatted json file dictionary
    """

    intermediate_node_dict: Dict[int, EntityNode] = {}
    intermediate_edge_dict: Dict[int, EventNode] = {}
    intermediate_subpathway_dict: Dict[int, SubpathwayNode] = {}

    try:
        for v in graph_json_file["nodes"]:
            intermediate_node_dict[v["dbId"]] = v
    except:
        pass

    try:
        for v in graph_json_file["edges"]:
            intermediate_edge_dict[v["dbId"]] = v
    except:
        pass

    try:
        for v in graph_json_file["subpathways"]:
            intermediate_subpathway_dict[v["dbId"]] = v
    except:
        pass

    return {
        "nodes": intermediate_node_dict,
        "edges": intermediate_edge_dict,
        "subpathways": intermediate_subpathway_dict,
        "dbId": graph_json_file["dbId"],
        "stId": graph_json_file["stId"],
    }


def get_contained_entities_graph_json(
    node_ids: List[int], formatted_json: ModifiedReactomeGraphJSON
):
    """Gets contained entities (protein/genes, molecules, maplinks)
    In order to properly generate the glyphs and links of the overview visualization,
    all contained entities and maplinks (non hierarchical links from one pathway to another)
    have to be caluclated for a given pathway.

    Args:
        formatted_json: json file formatted by 'format_graph_json'

    Return:
        contained_proteins: list of Ids ofcontained proteins/genes
        contained_molecules: list of Ids of contained molecules
        contained_maplinks: list of Ids of contained maplinks
        is_overview: boolean, is pathway overview (i.e. only contains maplinks)
    """
    contained_proteins: Dict[str, Dict[int, EntityOccurrence]] = {}
    contained_molecules: Dict[str, Dict[int, EntityOccurrence]] = {}
    contained_maplinks: Dict[str, Dict[int, EntityOccurrence]] = {}
    is_overview = True

    for node_id in node_ids:
        node_value = formatted_json["nodes"][node_id]
        if node_value["schemaClass"] == "EntityWithAccessionedSequence":
            contained_proteins[node_value["stId"]] = get_occurrences_graph_json(
                formatted_json["nodes"], node_id
            )
            is_overview = False
        # Maybe not correct to assign them "protein" but they might be proteinogenic
        if node_value["schemaClass"] == "GenomeEncodedEntity":
            contained_proteins[node_value["stId"]] = get_occurrences_graph_json(
                formatted_json["nodes"], node_id
            )
            is_overview = False
        elif node_value["schemaClass"] == "Pathway":
            contained_maplinks[node_value["stId"]] = get_occurrences_graph_json(
                formatted_json["nodes"], node_id
            )
        elif node_value["schemaClass"] == "SimpleEntity":
            contained_molecules[node_value["stId"]] = get_occurrences_graph_json(
                formatted_json["nodes"], node_id
            )
            is_overview = False
    return contained_proteins, contained_molecules, contained_maplinks, is_overview


def get_subpathway_entities_graph_json(
    formatted_json: ModifiedReactomeGraphJSON, subpathwayID: str
) -> Tuple[
    dict[str, Dict[int, EntityOccurrence]],
    dict[str, Dict[int, EntityOccurrence]],
    dict[str, Dict[int, EntityOccurrence]],
    bool,
    str,
    int,
]:
    """Gets entities for subpathways from higherlevel pathways

    Args:
        formatted_json: formatted json file for SUPERPATHWAY
        subpathwayID: ID of sub-pathway to query

    Return:
        contained_proteins: list of Ids ofcontained proteins/genes
        contained_molecules: list of Ids of contained molecules
        contained_maplinks: list of Ids of contained maplinks
        name: name of query-sub-pathway


    """
    name = ""
    db_Id = 0
    contained_events: List[int] = []

    for v in formatted_json["subpathways"].values():
        # todo we can get pathway name here!!!
        if v["stId"] == subpathwayID:
            contained_events = v["events"]
            name = v["displayName"]
            db_Id = v["dbId"]
            break
    entities: List[int] = []
    for event in contained_events:
        event_node = formatted_json["edges"][event]
        try:
            for elem in event_node["inputs"]:
                leaves = get_leaves_graph_json(formatted_json["nodes"], elem)
                entities.extend(leaves)
        except:
            pass
        try:
            for elem in event_node["outputs"]:
                leaves = get_leaves_graph_json(formatted_json["nodes"], elem)
                entities.extend(leaves)
        except:
            pass
        try:
            for elem in event_node["catalysts"]:
                leaves = get_leaves_graph_json(formatted_json["nodes"], elem)
                entities.extend(leaves)
        except:
            pass
        try:
            for elem in event_node["inhibitors"]:
                leaves = get_leaves_graph_json(formatted_json["nodes"], elem)
                entities.extend(leaves)
        except:
            pass
        try:
            for elem in event_node["activators"]:
                leaves = get_leaves_graph_json(formatted_json["nodes"], elem)
                entities.extend(leaves)
        except:
            pass
        try:
            for elem in event_node["requirements"]:
                leaves = get_leaves_graph_json(formatted_json["nodes"], elem)
                entities.extend(leaves)
        except:
            pass

    (
        contained_proteins,
        contained_molecules,
        contained_maplinks,
        is_overview,
    ) = get_contained_entities_graph_json(entities, formatted_json)

    return (
        contained_proteins,
        contained_molecules,
        contained_maplinks,
        is_overview,
        name,
        db_Id,
    )


def get_occurrences_graph_json(
    intermediate_node_dict: Dict[int, EntityNode], entry_id: int
) -> Dict[int, EntityOccurrence]:
    """Gets occurences of an .graph.json entry.
    Reactome graphs can contain complexes, which in turn can contain
    a multide of proteins (or other entities), thus we have to get
    the parents of leaves to identify all occurences of an entities in the graph structure.

    Args:
        intermediate_node_dict: node dictionary containing the graph nodes,
        entry_id: id for which to collect the leaves

    Returns:
        dict of parents for a entity
    """
    occurrences: Dict[int, EntityOccurrence] = {}
    _occurrences_recursive_graph_json(intermediate_node_dict, entry_id, occurrences)
    return occurrences


def _occurrences_recursive_graph_json(
    intermediate_node_dict: Dict[int, EntityNode],
    entry_id: int,
    occurrences: Dict[int, EntityOccurrence],
) -> None:
    """
    Recursive function to get all parents of a node in a graph

    Args:
        intermediate_node_dict: node dictionary containing the graph nodes,
        entry_id: id for which to collect the leaves
        occurrences: list of parents for a entity
    """
    if (
        entry_id in intermediate_node_dict
    ):  # NOTE was if entry_id is not None, so if its not working get back here
        # print(intermediate_node_dict[entry_id]['children'])
        # TODO if cases do not make sense --> same
        entry = intermediate_node_dict[entry_id]
        if "parents" not in entry:
            occurrences[entry["dbId"]] = {
                "internalID": entry["dbId"],
                "stableID": entry["stId"],
            }
        if "parents" in entry:
            occurrences[entry["dbId"]] = {
                "internalID": entry["dbId"],
                "stableID": entry["stId"],
            }
            for elem in entry["parents"]:
                _occurrences_recursive_graph_json(
                    intermediate_node_dict, elem, occurrences
                )


def get_leaves_graph_json(
    intermediate_node_dict: Dict[int, EntityNode], entry_id: int
) -> List[int]:
    """Gets leaves of an .graph.json entry

    Args:
        intermediate_node_dict: node dictionary containing the graph nodes,
        entry_id: id for which to collect the leaves

    Returns:
        list of leaf-ids
    """
    leaves: List[int] = []
    _leaf_recursive_graph_json(intermediate_node_dict, entry_id, leaves)
    return leaves


def _leaf_recursive_graph_json(
    intermediate_node_dict: Dict[int, EntityNode], entry_id: int, leaves: List[int]
):
    """
    Recursive function to get all leaves of a node in a graph

    Args:
        intermediate_node_dict: node dictionary containing the graph nodes,
        entry_id: id for which to collect the leaves
        leaves: list of leaf-ids
    """
    if (
        entry_id in intermediate_node_dict
    ):  # NOTE was if entry_id is not None, so if its not working get back here
        # print(intermediate_node_dict[entry_id]['children'])
        entry = intermediate_node_dict[entry_id]
        if "children" not in entry:
            leaves.append(entry["dbId"])
        if "children" in entry:
            leaves.append(entry["dbId"])
            for elem in entry["children"]:
                _leaf_recursive_graph_json(intermediate_node_dict, elem, leaves)
