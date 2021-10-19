def get_overview(pathway_node_dict, without_empty, global_dict_entries, pathway_titles):
    print('+++++NOTE: pathways that are not in global_dict_entries are NOT USED!!+++++')
    # Get pathways from dropdown menu --> main pathways for overview
    displayed_pathways = list(pathway_node_dict.keys())

    pathway_connection_dict = {}  # same format as with_init_pos
    for item in displayed_pathways:
        key = "path:" + str(item)
        pathway_connection_dict[key] = {
            'incoming_edges': [], 'outgoing_edges': [], 'entry_type': "pathway", 'isempty': False, "name": [key], "kegg_ID": key}
    print("pathway_connection_dict", pathway_connection_dict)
    # Remove compounds from pathway_node_dict --> keep only genes/pathways for finding intersections
    copy_pathway_node_dict = pathway_node_dict.copy()
    for key in pathway_node_dict:
        for item in pathway_node_dict[key]:
            if item.startswith('cpd'):
                copy_pathway_node_dict[key].remove(item)
    """
    # get intersections to find out how dropdown pathways are connected (shared genes = connection)
    for item1 in pathway_connection_dict.copy():
        ind1 = item1[5:8] + item1[8::]  # slice correct index to use pathway_node_dict
        if ind1 in copy_pathway_node_dict:  # len(pathway_connection_dict.copy()[item1]['outgoing_edges']) == 0 and
            all_nodes_item1 = copy_pathway_node_dict[ind1]
            # pathway_connection_dict[item1] = {}
            for item2 in pathway_connection_dict.copy():
                ind2 = item2[5:8] + item2[8::]  # slice correct index to use pathway_node_dict
                if item1 != item2 and ind2 in copy_pathway_node_dict and item1 in global_dict_entries and item2 in global_dict_entries:
                    all_nodes_item2 = copy_pathway_node_dict[ind2]
                    intersect = list(set(all_nodes_item1) & set(all_nodes_item2))
                    if len(intersect) > 0:
                        source = str(item1[5::])  # slice the 'path:' bit off
                        target = str(item2[5::])
                        pathway_connection_dict[item1]['incoming_edges'].append({'edgeType': 'relation',
                                                                                 'relation_ID': source + '+' + target,
                                                                                 # properly format the ID
                                                                                 'source': item2,
                                                                                 'target': item1,
                                                                                 'relation_type': 'pathCon',
                                                                                 # imaginary type for proper color later
                                                                                 'relation_subtype': [
                                                                                     'pathCon'],
                                                                                 'pathway_ID': target,
                                                                                 'pathway_name': 'None'})
                        pathway_connection_dict[item1]['outgoing_edges'].append({'edgeType': 'relation',
                                                                                 'relation_ID': target + '+' + source,
                                                                                 # properly format the ID
                                                                                 'source': item1,
                                                                                 'target': item2,
                                                                                 'relation_type': 'pathCon',
                                                                                 # imaginary type for proper color later
                                                                                 'relation_subtype': [
                                                                                     'pathCon'],
                                                                                 'pathway_ID': source,
                                                                                 'pathway_name': 'None'})

                        pathway_connection_dict[item2]['outgoing_edges'].append({'edgeType': 'relation',
                                                                                 'relation_ID': source + '+' + target,
                                                                                 # properly format the ID
                                                                                 'source': item2,
                                                                                 'target': item1,
                                                                                 'relation_type': 'pathCon',
                                                                                 # imaginary type for proper color later
                                                                                 'relation_subtype': [
                                                                                     'pathCon'],
                                                                                 'pathway_ID': target,
                                                                                 'pathway_name': 'None'})
                        pathway_connection_dict[item2]['incoming_edges'].append({'edgeType': 'relation',
                                                                                 'relation_ID': target + '+' + source,
                                                                                 # properly format the ID
                                                                                 'source': item1,
                                                                                 'target': item2,
                                                                                 'relation_type': 'pathCon',
                                                                                 # imaginary type for proper color later
                                                                                 'relation_subtype': [
                                                                                     'pathCon'],
                                                                                 'pathway_ID': source,
                                                                                 'pathway_name': 'None'})
    """

    # remove all genes from the without_empty --> keep only pathways to identify relevant maplinks
    copy_without_empty = without_empty.copy()
    for k in without_empty.keys():
        if not k.startswith('path'):
            copy_without_empty.pop(k)

    # add pathways with maplink nodes to pathway_connection dict
    # add only if either source or target is already in pathway_connection_dict --> relevant maplink connections
    for key in copy_without_empty:
        if len(copy_without_empty[key]['outgoing_edges']) > 0:
            for i in copy_without_empty[key]['outgoing_edges']:
                if (i['relation_type'] == 'maplink'):
                    if (key in pathway_connection_dict.keys() and i["target"] in pathway_connection_dict.keys()):
                        print("key", key)
                        print("Maplink",i)
                        pathway_connection_dict[key]["outgoing_edges"].append(i)

      
    # remove duplicate entries that might be in incoming/outgoing edges
    # add information about kegg_id, etc.
    """
    for key in pathway_connection_dict.copy():
        try:

            pathway_connection_dict[key]['incoming_edges'] = [i for n, i in
                                                              enumerate(
                                                                  pathway_connection_dict[key]['incoming_edges'])
                                                              if
                                                              i not in pathway_connection_dict[key]['incoming_edges'][
                                                                  n + 1:]]
            pathway_connection_dict[key]['outgoing_edges'] = [i for n, i in
                                                              enumerate(
                                                                  pathway_connection_dict[key]['outgoing_edges'])
                                                              if
                                                              i not in pathway_connection_dict[key]['outgoing_edges'][
                                                                  n + 1:]]

            pathway_connection_dict[key]['kegg_ID'] = key
            #pathway_connection_dict[key]['value'] = global_dict_entries[key]['value']
            try:
                pathway_connection_dict[key]['name'] = pathway_titles[key]
            except:
                pathway_connection_dict[key]['name'] = global_dict_entries[key]['name']
            #pathway_connection_dict[key]['orig_pos'] = global_dict_entries[key]['orig_pos']
            # global_dict_entries[key]['entry_type']
            pathway_connection_dict[key]['entry_type'] = 'pathCon'
            #pathway_connection_dict[key]['pathway_edges'] = global_dict_entries[key]['pathway_edges']
            pathway_connection_dict[key]['isempty'] = False

        except:
            # remove empty keys from pathway node dictionary (keys without 'path:')
            print(key, 'empty! Removed from pathway_connection_dict!')
            del pathway_connection_dict[key]
    """
    return pathway_connection_dict
