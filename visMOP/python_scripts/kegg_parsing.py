import xml.etree.cElementTree as cET
from visMOP.python_scripts.kegg_pathway import KeggPathway, KeggPathwayEntry, KeggPathwayRelation, KeggPathwayReaction
from visMOP.python_scripts.keggAccess import kegg_get, parse_get
import pathlib
data_path = pathlib.Path().resolve()

def add_incoming_edges(global_nodes):
    """ adds incoming edges to all nodes 

    """
    for key, entry in global_nodes.items():
            for out_edge in entry.outgoingEdges:
                target = out_edge["target"]
                global_nodes[target].add_incoming(out_edge)

def drop_empty(global_nodes):
    """ drops nodes with no outgoing/incoming edges from the node dictionary

    Args:
        global_nodes: dictionary of nodes

    Returns:
        out_dict: Node dictionary cleared of "empty nodes

    """
    out_dict ={}
    for k,v in global_nodes.items():
        if not v['isempty']:
            out_dict[k] = v

    return out_dict        
    #out_dict = {k: v for k,v in global_nodes.items() if not v['isempty']}

def generate_networkx_dict(global_nodes):
    """ generates a networkX-style network dictionary from a dict of nodes

    Args:
        global_nodes: dictionary of nodes

    Returns:
        out_dict: networkX-style network dictionary

    """
    out_dict = {}

    for key, entry in global_nodes.items():
        curr_node = {}
        for out_edge in entry['outgoingEdges']:
            curr_node[out_edge['target']] = {}
        
        try:
            for test_edge in entry['outgoingOnceRemoved']:
                curr_node[test_edge['target']] = {}
        except:
            pass
            
            
        out_dict[key] = curr_node
        
    return out_dict    

def parse_KGML(pathway_ID, kgml, global_entry, global_relation, global_reaction, value_dict, parsed_gets, keggID_to_stringID):
    """ parses kgml file and returns a KeggPathway object

    Args:
        pathway_ID: kegg ID of the pathway
        kgml: kgml file 
    Returns:
        pathway: pathway object of the supplied kgml

    """
    pathway = KeggPathway(pathway_ID)
    root = cET.fromstring(kgml)
    entry_keggID_map = {}
    groups = {}
    pathway.title = root.get("title")
    for entry in root.findall('entry'):
        entry_kegg_gets = []
        string_id_prot = []
        entry_ID = entry.get('id')
        # TODO this is a problem, if several entities are represented in a single entry!!!!!
        entry_keggID_list = entry.get('name').split(" ")
        entry_keggID = ";".join(entry_keggID_list)
        if entry_keggID in global_entry.keys():
            current_entry = global_entry[entry_keggID]
        else:
            # TODO atm only the first fc is kept
            for keggID in entry_keggID_list:
                value = False
                try: 
                    string_id_prot.append(keggID_to_stringID[keggID])
                except:
                    asdasda=0
                try:
                    entry_kegg_gets.append(parsed_gets[keggID])
                    # print('success')
                except:
                    x=0
                    #print('keggID:',keggID)
                    # new_kegg_get = kegg_get(keggIDs=[keggID], caching_path=data_path / 'kegg_cache/kegg_gets.json')
                    # if len(new_kegg_get)>0:
                    #     new_parsed_get = parse_get(new_kegg_get[keggID],keggID)
                    #     parsed_gets[keggID] = new_parsed_get
                    #     entry_kegg_gets.append(new_parsed_get)
                try:
                    #replacing probably is a workaround
                    value = value_dict[keggID.replace("cpd:","").replace("glu:", "").replace("ko:", "").replace("dr:", "dr")]
                    # print(value)
                except:
                    if not value:
                        value = {"transcriptomics": "NA", "proteomics": "NA", "metabolomics":"NA"}
            current_entry = KeggPathwayEntry(entry_keggID, value)
            current_entry.entryType = entry.get('type')

        if current_entry.entryType == "group":
            components = []
            for component in entry.findall('component'):
                components.append(component.get('id'))
            groups[entry_ID] = components    

        else:    
            kgml_graphics = entry.find('graphics')
            if(kgml_graphics.get('name')):
                current_entry.name = kgml_graphics.get('name').split(",")
            if(kgml_graphics.get('x') and kgml_graphics.get('y')):
                current_entry.add_origPos(pathway_ID, [int(kgml_graphics.get('x')), int(kgml_graphics.get('y'))])
            #testing
            else:
                coords = kgml_graphics.get('coords')
                coords = coords.split(",")
                coords = [int(elem) for elem in coords]
                x = (coords[0]+coords[1]) / 2
                y = (coords[2]+coords[3]) / 2
                current_entry.origPos[pathway_ID] = [x, y]    
            pathway.update_orig_extents(*current_entry.origPos[pathway_ID])

            pathway.add_entry(current_entry)
            pathway.add_stringIds(string_id_prot)
            pathway.add_kegg_info(entry_kegg_gets)
            # print(pathway.prot_in_pathway_StringIds)
            # print('pathway done: ', pathway.all_brite_ids, pathway.KO_level_1, pathway.KO_other_level, pathway.lowest_level, pathway.other_ontologys)
            entry_keggID_map[entry_ID] = current_entry.keggID

    pathway.apply_extents()
    for entry in pathway.entries:
        global_entry[entry.keggID] = entry

    for relation in root.findall('relation'):
        

        current_entry_1 = relation.get('entry1')
        current_entry_2 = relation.get('entry2')

        if (current_entry_1 in groups.keys()) and (current_entry_2 in groups.keys()):
            group_IDs1 = groups[current_entry_1]
            group_IDs2 = groups[current_entry_2]
            
            for group_ID1 in group_IDs1:
                for group_ID2 in group_IDs2:
                    current_keggID_1 = entry_keggID_map[group_ID1]
                    current_keggID_2 = entry_keggID_map[group_ID2]

                    current_type = relation.get('type')
                    current_subtypes = []
                    for subtype in relation.findall('subtype'):
                        current_subtypes.append(subtype.get('name'))
                    current_relation = KeggPathwayRelation(current_keggID_1,current_keggID_2,current_type, current_subtypes, pathway_ID, pathway.title).asdict()
                    pathway.add_relation(current_relation)
                    global_entry[current_keggID_1].is_empty = False
                    global_entry[current_keggID_2].is_empty = False
                    global_entry[current_keggID_1].add_outgoing(current_relation)
                    global_entry[current_keggID_1].add_pathway_edge(pathway_ID, current_keggID_1,current_keggID_2)
                    #global_entry[current_keggID_2].add_incoming(current_keggID_1, current_relation)

        elif current_entry_1 in groups.keys():
            group_IDs = groups[current_entry_1]
            for group_ID in group_IDs:
                current_keggID_1 = entry_keggID_map[group_ID]
                current_keggID_2 = entry_keggID_map[current_entry_2]

                current_type = relation.get('type')
                current_subtypes = []
                for subtype in relation.findall('subtype'):
                    current_subtypes.append(subtype.get('name'))
                current_relation = KeggPathwayRelation(current_keggID_1,current_keggID_2,current_type, current_subtypes, pathway_ID, pathway.title).asdict()
                pathway.add_relation(current_relation)
                global_entry[current_keggID_1].is_empty = False
                global_entry[current_keggID_2].is_empty = False
                global_entry[current_keggID_1].add_outgoing(current_relation)
                global_entry[current_keggID_1].add_pathway_edge(pathway_ID, current_keggID_1,current_keggID_2)
                #global_entry[current_keggID_2].add_incoming(current_keggID_1, current_relation)

        elif current_entry_2 in groups.keys():
            group_IDs = groups[current_entry_2]
            for group_ID in group_IDs:
                current_keggID_1 = entry_keggID_map[current_entry_1]
                current_keggID_2 = entry_keggID_map[group_ID]

                current_type = relation.get('type')
                current_subtypes = []
                for subtype in relation.findall('subtype'):
                    current_subtypes.append(subtype.get('name'))
                current_relation = KeggPathwayRelation(current_keggID_1,current_keggID_2,current_type, current_subtypes, pathway_ID, pathway.title).asdict()
                pathway.add_relation(current_relation)
                global_entry[current_keggID_1].is_empty = False
                global_entry[current_keggID_2].is_empty = False
                global_entry[current_keggID_1].add_outgoing(current_relation)
                global_entry[current_keggID_1].add_pathway_edge(pathway_ID, current_keggID_1,current_keggID_2)
                #global_entry[current_keggID_2].add_incoming(current_keggID_1, current_relation)
        else:
            current_keggID_1 = entry_keggID_map[current_entry_1]
            current_keggID_2 = entry_keggID_map[current_entry_2]


            current_type = relation.get('type')
            current_subtypes = []
            for subtype in relation.findall('subtype'):
                current_subtypes.append(subtype.get('name'))
            current_relation = KeggPathwayRelation(current_keggID_1,current_keggID_2,current_type, current_subtypes, pathway_ID, pathway.title).asdict()
            pathway.add_relation(current_relation)
            global_entry[current_keggID_1].is_empty = False
            global_entry[current_keggID_2].is_empty = False
            global_entry[current_keggID_1].add_outgoing(current_relation)
            global_entry[current_keggID_1].add_pathway_edge(pathway_ID, current_keggID_1,current_keggID_2)

            #global_entry[current_keggID_2].add_incoming(current_keggID_1, current_relation)

    for reaction in root.findall('reaction'):
        r_elem = entry_keggID_map[reaction.get('id')]
        r_type = reaction.get('type')
        for substrate in reaction.findall('substrate'):
            substrate_keggID = entry_keggID_map[substrate.get('id')]
            global_entry[substrate_keggID].is_empty = False
            global_entry[r_elem].is_empty = False
            current_reaction_part = KeggPathwayReaction(substrate_keggID, r_elem, r_type, pathway_ID, pathway.title).asdict()
            global_entry[substrate_keggID].add_outgoing(current_reaction_part)

        for product in reaction.findall('product'):
            product_keggID = entry_keggID_map[product.get('id')]
            global_entry[product_keggID].is_empty = False
            global_entry[r_elem].is_empty = False
            current_reaction_part = KeggPathwayReaction(r_elem, product_keggID, r_type, pathway_ID, pathway.title).asdict()
            global_entry[r_elem].add_outgoing(current_reaction_part)

    #if pathway_ID == "mmu02010":
        #print(pathway.return_pathway_node_list())
    return pathway



    """
    OLD FUNCTIONS
    
    def parse_KGML_old(pathway_ID, kgml):
     parses kgml file and returns a KeggPathway object
    
    Args:
        pathway_ID: kegg ID of the pathway
        kgml: kgml file 
    Returns:
        pathway: pathway object of the supplied kgml

    
    pathway = KeggPathway(pathway_ID)
    root = cET.fromstring(kgml)
    entry_keggID_map = {}
    groups = {}

    for entry in root.findall('entry'):
        current_entry = KeggPathwayEntry(entry.get('id'))
        current_entry.keggID = entry.get('name').split(" ")
        current_entry.entryType = entry.get('type')
        if current_entry.entryType == "group":
            components = []
            for component in entry.findall('component'):
                components.append(component.get('id'))
            groups[current_entry.entry_ID] = components    

        else:    
            kgml_graphics = entry.find('graphics')
            if(kgml_graphics.get('name')):
                current_entry.name = kgml_graphics.get('name').split(",")
            if(kgml_graphics.get('x') and kgml_graphics.get('y')):   
                current_entry.origPos = [int(kgml_graphics.get('x')), int(kgml_graphics.get('y'))]
            #testing
            else:
                current_entry.origPos = [100, 100]    
            pathway.update_orig_extents(*current_entry.origPos)

            pathway.add_entry(current_entry.asdict())
            entry_keggID_map[current_entry.entry_ID] = current_entry.keggID[0]

    for relation in root.findall('relation'):
        

        current_entry_1 = relation.get('entry1')
        current_entry_2 = relation.get('entry2')

        if (current_entry_1 in groups.keys()) and (current_entry_2 in groups.keys()):
            group_IDs1 = groups[current_entry_1]
            group_IDs2 = groups[current_entry_2]
            
            for group_ID1 in group_IDs1:
                for group_ID2 in group_IDs2:
                    current_keggID_1 = entry_keggID_map[group_ID1]
                    current_keggID_2 = entry_keggID_map[group_ID2]

                    current_type = relation.get('type')
                    current_subtypes = []
                    for subtype in relation.findall('subtype'):
                        current_subtypes.append(subtype.get('name'))
                    current_relation = KeggPathwayRelation(current_keggID_1,current_keggID_2,current_type, current_subtypes).asdict()
                    pathway.add_relation(current_relation)
    

        elif current_entry_1 in groups.keys():
            group_IDs = groups[current_entry_1]
            for group_ID in group_IDs:
                current_keggID_1 = entry_keggID_map[group_ID]
                current_keggID_2 = entry_keggID_map[current_entry_2]

                current_type = relation.get('type')
                current_subtypes = []
                for subtype in relation.findall('subtype'):
                    current_subtypes.append(subtype.get('name'))
                current_relation = KeggPathwayRelation(current_keggID_1,current_keggID_2,current_type, current_subtypes).asdict()
                pathway.add_relation(current_relation)

        elif current_entry_2 in groups.keys():
            group_IDs = groups[current_entry_2]
            for group_ID in group_IDs:
                current_keggID_1 = entry_keggID_map[current_entry_1]
                current_keggID_2 = entry_keggID_map[group_ID]

                current_type = relation.get('type')
                current_subtypes = []
                for subtype in relation.findall('subtype'):
                    current_subtypes.append(subtype.get('name'))
                current_relation = KeggPathwayRelation(current_keggID_1,current_keggID_2,current_type, current_subtypes).asdict()
                pathway.add_relation(current_relation)
 
        else:
            current_keggID_1 = entry_keggID_map[current_entry_1]
            current_keggID_2 = entry_keggID_map[current_entry_2]


            current_type = relation.get('type')
            current_subtypes = []
            for subtype in relation.findall('subtype'):
                current_subtypes.append(subtype.get('name'))
            current_relation = KeggPathwayRelation(current_keggID_1,current_keggID_2,current_type, current_subtypes).asdict()

            pathway.add_relation(current_relation)
    for reaction in root.findall('reaction'):
        r_elem = entry_keggID_map[reaction.get('id')]
        r_type = reaction.get('type')
        s_elem = []
        for substrate in reaction.findall('substrate'):
            s_elem.append(entry_keggID_map[substrate.get('id')])
        p_elem = []
        for product in reaction.findall('product'):
            p_elem.append(entry_keggID_map[product.get('id')])
        current_reaction = KeggPathwayReaction(r_elem,s_elem, p_elem, r_type).asdict()
        pathway.add_reaction(current_reaction)

    return pathway
"""