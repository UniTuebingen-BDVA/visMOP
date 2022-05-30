def get_overview(
    pathway_node_dict, without_empty, global_dict_entries, pathway_titles, pathway_objs
):
    # at the moment only maplinks are considered
    print("+++++NOTE: pathways that are not in global_dict_entries are NOT USED!!+++++")
    # Get pathways from dropdown menu --> main pathways for overview
    displayed_pathways = list(pathway_node_dict.keys())

    pathway_connection_dict = {}  # same format as with_init_pos
    for item in displayed_pathways:
        key = "path:" + str(item)
        pathway_connection_dict[key] = {
            "incoming_edges": [],
            "outgoingEdges": [],
            "outgoingOnceRemoved": [],
            "entryType": "pathway",
            "isempty": False,
            "name": [key],
            "keggID": key,
        }

    # remove all genes from the without_empty --> keep only pathways to identify relevant maplinks
    for pathway in pathway_objs:
        pathwayKey = "path:" + str(pathway.keggID)
        for maplink in pathway.maplinks:
            if str(maplink).replace("path:", "") in displayed_pathways:
                if not (maplink == pathwayKey):
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

    """
    copy_without_empty = without_empty.copy()
    for k in without_empty.keys():
        if not k.startswith('path'):
            copy_without_empty.pop(k)
    # TODO fails if maplink is disconnected i.e. has  no outgoing/incoming edges
    # add pathways with maplink nodes to pathway_connection dict
    for key in copy_without_empty:
        if len(copy_without_empty[key]['outgoingEdges']) > 0:
            for i in copy_without_empty[key]['outgoingEdges']:
                if (i['relationType'] == 'maplink'):
                    if (key in pathway_connection_dict.keys() and i["target"] in pathway_connection_dict.keys()):
                        #print("key", key)
                        #print("Maplink",i)
                        pathway_connection_dict[key]["outgoingEdges"].append(i)

    # search for connections that are once removed, i.e., having one pathway inbetween
    
    for idxOuter, (kOuter,vOuter) in enumerate(pathway_connection_dict.items()):
        outerOutgoingTars  = [elem['target'] for elem in vOuter['outgoingEdges']]
        #print("OUTER OUTGOING ", vOuter)
        for idxInner, (kInner, vInner) in enumerate(pathway_connection_dict.items(), start = idxOuter+1):
            innerOutgoingTars  = [elem['target'] for elem in vInner['outgoingEdges']]
            #print("INNER OUTGOING ", innerOutgoingTars)

            if not set(outerOutgoingTars).isdisjoint(innerOutgoingTars):
                #print("FOUND SOMETHING")
                pathway_connection_dict[kOuter]["outgoingOnceRemoved"].append({'edgeType': 'relation', 'relationID': kOuter+"+"+kInner, 'source': kOuter, 'target': kInner, 'relationType': 'maplinkOnceRemoved', 'relation_subtype': ['compound'], 'pathway_ID': kOuter, 'pathway_name': ''})
    """

    return pathway_connection_dict
