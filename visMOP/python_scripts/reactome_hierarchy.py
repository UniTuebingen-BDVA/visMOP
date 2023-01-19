import json
import pathlib
import pandas as pd
import pickle
import os
from operator import itemgetter
from copy import deepcopy
import collections


def get_PathwaySummaryData_omic(num_entries, all_values, limits):
    num_val_omic = len(all_values)
    # statistics for products produced in a significant higher amount
    vals_higher_ul = [val for val in all_values if val > limits[1]]
    mean_val_higher_ul = (
        sum(vals_higher_ul) / len(vals_higher_ul)
        if len(vals_higher_ul) > 0
        else float("nan")
    )
    pc_vals_higher_ul = (
        len(vals_higher_ul) / num_val_omic if num_val_omic != 0 else 0
    )  # float('nan')

    # statistics for products produced in a significant smaller amount
    vals_smaller_ll = [val for val in all_values if val < limits[0]]
    mean_val_smaller_ll = (
        sum(vals_smaller_ll) / len(vals_smaller_ll)
        if len(vals_smaller_ll) > 0
        else float("nan")
    )
    pc_vals_smaller_ll = (
        len(vals_smaller_ll) / num_val_omic if num_val_omic != 0 else 0
    )  # float('nan')

    # procentage of products produced in a significant differnt amount
    pcReg = (
        sum(val > limits[1] or val < limits[0] for val in all_values) / num_val_omic
        if num_val_omic != 0
        else 0
    )  # float('nan')

    # procentage of products not produced in a significant differnt amount
    pcUnReg = (
        sum(val < limits[1] and val > limits[0] for val in all_values) / num_val_omic
        if num_val_omic != 0
        else 0
    )  ## float('nan')

    pc_with_val_for_omic = num_val_omic / num_entries if num_entries != 0 else 0

    pathway_summary_data = [
        num_val_omic,
        mean_val_higher_ul,
        pc_vals_higher_ul,
        mean_val_smaller_ll,
        pc_vals_smaller_ll,
        pcReg,
        pcUnReg,
        pc_with_val_for_omic,
    ]
    return pathway_summary_data


class ReactomePathway:
    """Pathway Class for ractome pathway entries

    Args:
        Reactome_sID: Stable Reactome ID for pathway

    """

    def __init__(self, reactome_sID, has_diagram):
        self.is_root = False
        self.is_leaf = False
        self.has_data = False
        self.has_diagram = has_diagram
        self.is_overview = True
        self.name = ""
        self.layout_json_file = None
        self.graph_json_file = None
        self.reactome_sID = reactome_sID
        self.db_Id = ""
        self.children = []
        self.children_with_data = []
        self.subtree_ids = []
        self.diagram_entry = ""
        self.own_measured_proteins = []
        self.own_measured_genes = []
        self.own_measured_metabolites = []
        self.own_measured_maplinks = []
        self.total_measured_proteins = {}
        self.total_measured_genes = {}
        self.total_measured_metabolites = {}
        self.total_measured_maplinks = {}
        self.subdiagrams_measured_proteins = {}
        self.subdiagrams_measured_genes = {}
        self.subdiagrams_measured_metabolites = {}
        self.subdiagrams_measured_maplinks = {}
        self.total_proteins = {}
        self.total_metabolites = {}
        self.maplinks = {}
        self.parents = []
        self.parents_with_data = []
        self.level = -1
        self.root_id = ""

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


class PathwayHierarchy(dict):
    """Class for pathway hierarchy

    functions as main datastructure for reactome data
    """

    def __init__(self, amt_timesteps, *arg, **kw):
        super(PathwayHierarchy, self).__init__(*arg, **kw)
        self.levels = {}
        self.omics_recieved = []
        self.layout_settings = {}
        self.amt_timesteps = amt_timesteps

    def set_layout_settings(self, settings):
        self.layout_settings = settings

    def get_pathway_GO_info_dict(self):
        return self.pathwayID, {
            "numEntries": len(self.entries),
            "StringIds": self.prot_in_pathway_StringIds,
            "brite_hier_superheadings": self.brite_hier_superheadings,
            "brite_hier_subcategories": self.brite_hier_subcategories,
            "brite_hier_proteinIDs": self.brite_hier_proteinIDs,
        }

    def set_omics_recieved(self, omics_recieved):
        self.omics_recieved = omics_recieved

    def add_hierarchy_levels(self):
        """Adds hierarchy levels to all entries.
        With 0 Being root and each increase is one level further
        """
        for k, v in self.items():
            final_entries = []
            self._hierarchy_levels_recursion(k, [], final_entries)
            shortest_path = min(final_entries, key=len)
            level = len(shortest_path) - 1
            v.level = level
            v.root_id = shortest_path[level]
            if level in self.levels:
                self.levels[level].append(v.reactome_sID)
            else:
                self.levels[level] = [v.reactome_sID]

    def _hierarchy_levels_recursion(self, entry_id, path, final_entries):
        at_root = False
        current_entry = self[entry_id]

        arrived_at_diagram = current_entry.has_diagram
        path.append(entry_id)
        if self[entry_id].is_root:
            final_entries.append(path)
        else:
            for parent in current_entry.parents:
                self._hierarchy_levels_recursion(parent, path, final_entries)

    def hierarchyInfo(self):
        """Prints info about hierarchy"""
        entries = len(self.keys())
        leafs = len([v for k, v in self.items() if v.is_leaf])
        roots = len([v for k, v in self.items() if v.is_root])
        return {"size": entries, "leafs": leafs, "roots": roots}

    def generate_parents_children_with_data(self):
        for entry in self.values():
            for parent_entry in entry.parents:
                entryObject = self[parent_entry]
                if entryObject.has_data:
                    entry.parents_with_data.append(parent_entry)
            for child_entry in entry.children:
                entryObject = self[child_entry]
                if entryObject.has_data:
                    entry.children_with_data.append(child_entry)

    def add_json_data(self, json_path):
        """Adds json data to the pathways

        this includes names, aswell as detail level pathway information

        Args:
            json_path: path at which to find the json diagram files
        """
        current_level = 0
        key_list = list(self.levels.keys())
        key_list.sort()
        for current_level in key_list:
            current_level_ids = self.levels[current_level]
            for key in current_level_ids:
                entry = self[key]
                if entry.has_diagram:
                    with open(json_path / (key + ".json"), encoding="utf8") as fh:
                        json_file = json.load(fh)
                        entry.layout_json_file = json_file
                        entry.name = json_file["displayName"]

                if entry.has_diagram:
                    with open(json_path / (key + ".graph.json"), encoding="utf8") as fh:
                        json_file = json.load(fh)
                        json_file = format_graph_json(json_file)
                        entry.graph_json_file = json_file
                        (
                            prot,
                            molec,
                            contained_maplinks,
                            is_overview,
                        ) = get_contained_entities_graph_json(
                            entry.graph_json_file["nodes"].keys(), entry.graph_json_file
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
                    entries_with_diagram = []
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

    def _find_diagram_recursion(self, entry_id, final_entries, steps):
        arrived_at_diagram = False
        current_entry = self[entry_id]

        arrived_at_diagram = current_entry.has_diagram
        if arrived_at_diagram:
            final_entries.append((entry_id, steps))
        else:
            if len(current_entry.parents) > 0:
                for parent in current_entry.parents:
                    self._find_diagram_recursion(parent, final_entries, steps + 1)
            else:
                if not arrived_at_diagram:
                    print("did not find diagram for: ", entry_id)

    def aggregate_pathways(self):
        """Aggregates data from low level nodes to higher level nodes

        as the supplied omics data is only mapped to leaf nodes, data has to be aggregated to the higher level nodes
        """
        # sort levels descending that propagation is correctly from the leaves to the root nodes
        # still strange bug that some insanely high levels > 20,50 are encountered
        levels_descending = sorted(self.levels.keys(), reverse=True)
        for level in levels_descending:
            for entry_key in self.levels[level]:
                v = self[entry_key]
                # if not v.is_leaf:
                subtree = self.get_subtree_target(v.reactome_sID)
                own_measured_proteins = v.own_measured_proteins
                own_measured_genes = v.own_measured_genes
                own_measured_metabolites = v.own_measured_metabolites
                own_measured_maplinks = v.own_measured_maplinks
                total_measured_proteins = v.total_measured_proteins
                total_measured_genes = v.total_measured_genes
                total_measured_metabolites = v.total_measured_metabolites
                total_measured_maplinks = v.total_measured_maplinks  # ?
                subdiagrams_measured_proteins = {}
                subdiagrams_measured_genes = {}
                subdiagrams_measured_metabolites = {}
                subdiagrams_measured_maplinks = {}  # ?
                total_proteins = v.total_proteins
                total_metabolites = v.total_metabolites
                total_maplinks = v.maplinks
                subtree_ids = subtree
                subtree_ids.append(v.reactome_sID)
                v.subtree_ids = subtree_ids

                tree_has_diagram = v.has_diagram

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
                    if current_node.has_diagram:
                        tree_has_diagram = True
                v.total_measured_proteins = total_measured_proteins
                v.total_measured_genes = total_measured_genes
                v.total_measured_metabolites = total_measured_metabolites
                v.total_measured_maplinks = total_measured_maplinks
                v.own_measured_proteins = own_measured_proteins
                v.own_measured_genes = own_measured_genes
                v.own_measured_metabolites = own_measured_metabolites
                v.own_measured_maplinks = own_measured_maplinks
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

    def get_subtree_target(self, tar_id):
        """Gets all leaves found for target entry

        Args:
            tar_id: String: entry id for which to retrieve leaves
        """
        subtree = []
        self._subtree_recursive(tar_id, subtree)
        return subtree

    def _subtree_recursive(self, entry_id, subtree):
        """Recursive function for leaf retrieval"""
        if entry_id is not None:
            if len(self[entry_id].children) == 0:
                pass  # leaves.append(entry_id)
            for elem in self[entry_id].children:
                self._subtree_recursive(elem, subtree)
            subtree.append(entry_id)

    def add_query_data(self, entity_data, query_type, query_key):
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
                    self[pathway[0]].total_measured_proteins[query_key] = {
                        "measurement": entity_data["measurement"],
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
                    self[pathway[0]].own_measured_genes.append(query_key)
                else:
                    self[pathway[0]].total_measured_genes[query_key] = {
                        "measurement": entity_data["measurement"],
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
                    self[pathway[0]].total_measured_metabolites[query_key] = {
                        "measurement": entity_data["measurement"],
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
                    self[pathway[0]].own_measured_metabolites.append(query_key)

    def load_data(self, path, organism):
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

        for k, v in self.items():
            v.assert_leaf_root_state()
        self.add_hierarchy_levels()

    def get_subtree_non_overview(self, tar_id):
        """Gets all leaves found for target entry

        Args:
            tar_id: String: entry id for which to retrieve leaves
        """
        subtree = []
        self._get_subtree_non_overview_recursion(tar_id, subtree)
        return subtree

    def _get_subtree_non_overview_recursion(self, entry_id, subtree):
        """Recursive function for leaf retrieval"""
        if entry_id is not None:
            if not self[entry_id].is_overview:
                subtree.append(entry_id)
                if not self[entry_id].is_root:
                    return
            if self[entry_id].is_overview or self[entry_id].is_root:
                for elem in self[entry_id].children:
                    self._get_subtree_non_overview_recursion(elem, subtree)

    def generate_overview_data(self, omic_limits, verbose):
        """Generates data to be exported to the frontend
        Args:
            verbose: boolean: If total proteins/metabolite ids should be transmitted
        Returns:
            List of pathway overview entries, with each element being one pathway
            Dictionary of which query (accession Ids, e.g. uniprot/ensmbl) maps to which pathways
            List of pathways
            List of contained hierarchy nodes
        """
        out_data = []
        central_nodes_out = []
        central_nodes = []
        # pathway_ids = self.levels[level]
        pathway_ids = []
        for root in self.levels[0]:
            central_nodes.extend(self.get_subtree_non_overview(root))
        # central_nodes.extend(self.levels[0])
        central_nodes = list(set(central_nodes))
        for root in self.levels[0]:
            pathway_ids.extend(self.get_subtree_target(root))
        pathway_ids.extend(self.levels[0])
        pathway_ids = list(set(pathway_ids))
        query_pathway_dict = {}
        root_subpathways = collections.defaultdict(list)
        pathway_dropdown = []
        root_ids = []
        pathways_root_names = {}
        pathway_summary_stats_dict = {}
        self.generate_parents_children_with_data()
        for pathway in pathway_ids:
            entry = self[pathway]
            hierarchical_roots = self.get_hierachical_superpathways(entry)
            if entry.has_data:
                for timepoint in range(self.amt_timesteps):
                    (
                        pathway_dict,
                        dropdown_entry,
                        pathway_summary_data,
                    ) = generate_overview_pathway_entry(
                        entry,
                        pathway in central_nodes,
                        pathway,
                        timepoint,
                        query_pathway_dict,
                        verbose,
                        omic_limits,
                        self.omics_recieved,
                    )
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
        stat_vals = [
            "num values",
            "mean exp (high) ",
            "% vals (higher) ",
            "mean exp(lower) ",
            "% vals (lower) ",
            "% Reg",
            "% Unreg",
            "% p with val",
        ]
        omics = [o for i, o in enumerate(["t ", "p ", "m "]) if self.omics_recieved[i]]
        stat_vals_colnames = [o + stat for o in omics for stat in stat_vals]
        stat_vals_colnames.append("pathway size")
        return (
            out_data,
            central_nodes_out,
            query_pathway_dict,
            pathway_dropdown,
            list(set(root_ids)),
            pathways_root_names,
            root_subpathways,
            pd.DataFrame.from_dict(
                pathway_summary_stats_dict, orient="index", columns=stat_vals_colnames
            ),
            self.omics_recieved,
        )

    def get_hierachical_superpathways(self, entry):
        hierarchical_roots = []
        for maplink in entry.maplinks:
            pathway = self[maplink]
            if pathway.is_root:
                hierarchical_roots.append(pathway.name)
        return hierarchical_roots


###
# Auxilliary Functions
###


def generate_overview_pathway_entry(
    entry,
    is_central,
    pathway_Id,
    timepoint_index,
    query_pathway_dict,
    verbose,
    omic_limits,
    omics_recieved,
):
    """generates pathway entry for overview
    Args:
        entry: entry object
        pathway_Id: if of pathway
        query_pathway_dict: dictionary associating query id to pathways in which query is appearing
        verbose: boolean if total proteins should be enumerated or if only number should be used


    Returns:
        formatted json file dictionary

    """
    pathway_dict = {
        "pathwayName": "",
        "pathwayId": "",
        "rootId": "",
        "nodeType": "",
        "isCentral": is_central,
        "maplinks": [],
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
    pathway_dict["pathwayName"] = entry.name + "_" + str(timepoint_index)
    pathway_dict["pathwayId"] = entry.reactome_sID + "_" + str(timepoint_index)
    pathway_dict["rootId"] = entry.root_id + "_" + str(timepoint_index)
    pathway_dict["nodeType"] = (
        "root" if entry.is_root else "regular" if is_central else "hierarchical"
    )
    pathway_dict["maplinks"] = entry.maplinks
    pathway_dict["subtreeIds"] = [
        elem + "_" + str(timepoint_index) for elem in entry.subtree_ids
    ]
    pathway_dict["isOverview"] = entry.is_overview
    pathway_dict["parents"] = [
        elem + "_" + str(timepoint_index) for elem in entry.parents_with_data
    ]
    pathway_dict["children"] = [
        elem + "_" + str(timepoint_index) for elem in entry.children_with_data
    ]
    pathway_dict["ownMeasuredEntryIDs"]["proteomics"] = entry.own_measured_proteins
    pathway_dict["ownMeasuredEntryIDs"]["transcriptomics"] = entry.own_measured_genes
    pathway_dict["ownMeasuredEntryIDs"]["metabolomics"] = entry.own_measured_metabolites
    pathway_dict["insetPathwayEntryIDs"][
        "proteomics"
    ] = entry.subdiagrams_measured_proteins
    pathway_dict["insetPathwayEntryIDs"][
        "transcriptomics"
    ] = entry.subdiagrams_measured_genes
    pathway_dict["insetPathwayEntryIDs"][
        "metabolomics"
    ] = entry.subdiagrams_measured_metabolites

    pathway_dropdown_entry = {
        "text": entry.reactome_sID
        + ": "
        + entry.name
        + "; Timepoint: "
        + str(timepoint_index),
        "value": entry.reactome_sID + "_" + str(timepoint_index),
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
    pathway_summary_data = []
    # num_entries = len(
    #     set(
    #         list(entry.total_measured_genes.keys())
    #         + list(entry.total_measured_proteins.keys())
    #         + list(entry.total_measured_metabolites.keys())
    #     )
    # )
    values_per_omic = [
        [
            {
                "measurement": elem["measurement"][timepoint_index],
                "forms": elem["forms"],
            }
            for elem in entry.total_measured_genes.values()
        ],
        [
            {
                "measurement": elem["measurement"][timepoint_index],
                "forms": elem["forms"],
            }
            for elem in entry.total_measured_proteins.values()
        ],
        [
            {
                "measurement": elem["measurement"][timepoint_index],
                "forms": elem["forms"],
            }
            for elem in entry.total_measured_metabolites.values()
        ],
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

    for omic_recieved, omic_values_dict, num_entries_omic, limits in zip(
        omics_recieved, values_per_omic, num_entries_omics, omic_limits
    ):
        if omic_recieved:
            omic_values = [vals["measurement"] for vals in omic_values_dict]
            # print(num_entries_omic, omic_values, limits)
            pathway_summary_data += get_PathwaySummaryData_omic(
                num_entries_omic, omic_values, limits
            )

    # pathway_summary_data.append(len(entry.subtree_ids))
    pathway_summary_data.append(perc_vals_total)

    for k in entry.total_measured_proteins:
        v = entry.total_measured_proteins[k]
        name = v["forms"][list(v["forms"].keys())[0]]["name"].split(" [")[0]
        pathway_dict["entries"]["proteomics"]["measured"][k] = {
            "queryId": k,
            "value": v["measurement"][timepoint_index],
            "name": name,
            "forms": v["forms"],
        }
        if k in query_pathway_dict.keys():
            query_pathway_dict[k].append(pathway_Id)
        else:
            query_pathway_dict[k] = [pathway_Id]
    for k in entry.total_measured_genes:
        v = entry.total_measured_genes[k]
        name = v["forms"][list(v["forms"].keys())[0]]["name"].split(" [")[0]
        pathway_dict["entries"]["transcriptomics"]["measured"][k] = {
            "queryId": k,
            "value": v["measurement"][timepoint_index],
            "name": name,
            "forms": v["forms"],
        }
        if k in query_pathway_dict.keys():
            query_pathway_dict[k].append(pathway_Id)
        else:
            query_pathway_dict[k] = [pathway_Id]
    for k in entry.total_measured_metabolites:
        v = entry.total_measured_metabolites[k]
        name = v["forms"][list(v["forms"].keys())[0]]["name"].split(" [")[0]
        pathway_dict["entries"]["metabolomics"]["measured"][k] = {
            "queryId": k,
            "value": v["measurement"][timepoint_index],
            "name": name,
            "forms": v["forms"],
        }
        if k in query_pathway_dict.keys():
            query_pathway_dict[k].append(pathway_Id)
        else:
            query_pathway_dict[k] = [pathway_Id]
    return pathway_dict, pathway_dropdown_entry, pathway_summary_data


def format_graph_json(graph_json_file):
    """Formats .graph.json nodes to be easily accessible in dictionary form with
    the keys being node Ids

    Args:
        graph_json_file: loaded graph.json file

    Returns:
        formatted json file dictionary
    """
    intermediate_node_dict = {}
    intermediate_edge_dict = {}
    intermediate_subpathway_dict = {}

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

    graph_json_file["nodes"] = intermediate_node_dict
    graph_json_file["edges"] = intermediate_edge_dict
    graph_json_file["subpathways"] = intermediate_subpathway_dict
    return graph_json_file


def get_contained_entities_graph_json(node_ids, formatted_json):
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
    contained_proteins = {}
    contained_molecules = {}
    contained_maplinks = {}
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


def get_subpathway_entities_graph_json(formatted_json, subpathwayID):
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
    db_Id = ""
    contained_events = []

    for k, v in formatted_json["subpathways"].items():
        # todo we can get pathway name here!!!
        if v["stId"] == subpathwayID:
            contained_events = v["events"]
            name = v["displayName"]
            db_Id = v["dbId"]
            break
    entities = []
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


def get_occurrences_graph_json(intermediate_node_dict, entry_id):
    """Gets occurences of an .graph.json entry
    Reactome graphs can contain complexes, which in turn can contain
    a multide of proteins (or other entities), thus we have to get
    the parents of leaves to identify all occurences of an entities in the graph structure.

    Args:
        intermediate_node_dict: node dictionary containing the graph nodes,
        entry_id: id for which to collect the leaves

    Returns:
        list of parents for a entity
    """
    occurrences = {}
    _occurrences_recursive_graph_json(intermediate_node_dict, entry_id, occurrences)
    return occurrences


def _occurrences_recursive_graph_json(intermediate_node_dict, entry_id, occurrences):
    """recursive function to get .graph.json leaves"""
    if entry_id is not None:
        # print(intermediate_node_dict[entry_id]['children'])
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


def get_leaves_graph_json(intermediate_node_dict, entry_id):
    """Gets leaves of an .graph.json entry

    Args:
        intermediate_node_dict: node dictionary containing the graph nodes,
        entry_id: id for which to collect the leaves

    Returns:
        list of leaf-ids
    """
    leaves = []
    _leaf_recursive_graph_json(intermediate_node_dict, entry_id, leaves)
    return leaves


def _leaf_recursive_graph_json(intermediate_node_dict, entry_id, leaves):
    """recursive function to get .graph.json leaves"""
    if entry_id is not None:
        # print(intermediate_node_dict[entry_id]['children'])
        entry = intermediate_node_dict[entry_id]
        if "children" not in entry:
            leaves.append(entry["dbId"])
        if "children" in entry:
            leaves.append(entry["dbId"])
            for elem in entry["children"]:
                _leaf_recursive_graph_json(intermediate_node_dict, elem, leaves)
