def get_overview_reactome(displayed_pathways, central_nodes):
    # at the moment only maplinks are considered
    # print("+++++NOTE: pathways that are not in global_dict_entries are NOT USED!!+++++")
    # Get pathways from dropdown menu --> main pathways for overview

    pathway_connection_dict = {}  # same format as with_init_pos #pathwayName
    displayed_pathway_names = [pathway["pathwayId"] for pathway in displayed_pathways]

    # remove all genes from the without_empty --> keep only pathways to identify relevant maplinks
    for pathway in displayed_pathways:
        pathwayKey = pathway["pathwayId"]
        pathway_connection_dict[pathwayKey] = {
            "incoming_edges": [],
            "outgoingEdges": [],
            "outgoingOnceRemoved": [],
            "entryType": "pathway",
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
                        "pathway_name": "",
                    }
                )

    return pathway_connection_dict
