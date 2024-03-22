from typing import Dict, List, TypedDict
from visMOP.python_scripts.hierarchy_types import HierarchyEntryDict


class EdgeAttribute(TypedDict):
    """
    The attributes of an edge.
    """

    edgeType: str
    relationID: str
    source: str
    target: str
    relationType: str
    relation_subtype: List[str]
    pathway_ID: str


class NodeAttributes(TypedDict):
    """
    The attributes of a node.
    """

    incoming_edges: List[EdgeAttribute]
    outgoingEdges: List[EdgeAttribute]
    outgoingOnceRemoved: List[EdgeAttribute]
    entryType: str
    parents: List[str]
    children: List[str]
    isCentral: bool
    isempty: bool
    name: List[str]
    pathwayID: str


def create_overview_data(
    displayed_pathways: List[HierarchyEntryDict], central_nodes: List[str]
):
    """
    Creates the data for the overview diagram.
    Args:
        displayed_pathways (List[HierarchyEntryDict]): The displayed pathways.
        central_nodes (List[str]): The central nodes.
        Returns:
            Dict[str, NodeAttributes]: The overview data.
    """
    # at the moment only maplinks are considered
    # print("+++++NOTE: pathways that are not in global_dict_entries are NOT USED!!+++++")
    # Get pathways from dropdown menu --> main pathways for overview

    pathway_connection_dict: Dict[str, NodeAttributes] = (
        {}
    )  # same format as with_init_pos #pathwayName
    displayed_pathway_names = [pathway["pathwayId"] for pathway in displayed_pathways]

    # remove all genes from the without_empty --> keep only pathways to identify relevant maplinks
    for pathway in displayed_pathways:
        pathwayKey = pathway["pathwayId"]
        pathway_connection_dict[pathwayKey] = {
            "incoming_edges": [],
            "outgoingEdges": [],
            "outgoingOnceRemoved": [],
            "entryType": "pathway",
            "parents": pathway["parents"],
            "children": pathway["children"],
            "isCentral": pathwayKey in central_nodes,
            "isempty": False,
            "name": [pathwayKey],
            "pathwayID": pathwayKey,
        }
        for maplink in pathway["maplinks"]:
            if maplink in displayed_pathway_names and not (maplink == pathwayKey):
                pathway_connection_dict[pathwayKey]["outgoingEdges"].append(
                    {
                        "edgeType": "relation",
                        "relationID": pathwayKey + "+" + maplink,
                        "source": pathwayKey,
                        "target": maplink,
                        "relationType": "maplink",
                        "relation_subtype": ["compound"],
                        "pathway_ID": pathwayKey,
                    }
                )

    return pathway_connection_dict
