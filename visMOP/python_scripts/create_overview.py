def get_overview(pathway_node_dict, without_empty, global_dict_entries, pathway_titles):
    # at the moment only maplinks are considered
    print('+++++NOTE: pathways that are not in global_dict_entries are NOT USED!!+++++')
    # Get pathways from dropdown menu --> main pathways for overview
    displayed_pathways = list(pathway_node_dict.keys())

    pathway_connection_dict = {}  # same format as with_init_pos
    for item in displayed_pathways:
        key = "path:" + str(item)
        pathway_connection_dict[key] = {
            'incoming_edges': [], 'outgoingEdges': [], 'entryType': "pathway", 'isempty': False, "name": [key], "keggID": key}
 
    # remove all genes from the without_empty --> keep only pathways to identify relevant maplinks
    copy_without_empty = without_empty.copy()
    for k in without_empty.keys():
        if not k.startswith('path'):
            copy_without_empty.pop(k)

    # add pathways with maplink nodes to pathway_connection dict
    for key in copy_without_empty:
        if len(copy_without_empty[key]['outgoingEdges']) > 0:
            for i in copy_without_empty[key]['outgoingEdges']:
                if (i['relationType'] == 'maplink'):
                    if (key in pathway_connection_dict.keys() and i["target"] in pathway_connection_dict.keys()):
                        #print("key", key)
                        #print("Maplink",i)
                        pathway_connection_dict[key]["outgoingEdges"].append(i)

    return pathway_connection_dict
