import random

def get_PathwaySummaryData_omic(num_entries, all_values, limits):
    num_val_omic = len(all_values)
    # statistics for products produced in a significant higher amount
    vals_higher_ul = [val for val in all_values if val > limits[1]]
    mean_val_higher_ul = sum(
        vals_higher_ul) / len(vals_higher_ul) if len(vals_higher_ul) > 0 else float('nan')
    pc_vals_higher_ul = len(vals_higher_ul) / num_val_omic if num_val_omic!=0 else float('nan')

    # statistics for products produced in a significant smaller amount
    vals_smaller_ll = [val for val in all_values if val < limits[0]]
    mean_val_smaller_ll = sum(
        vals_smaller_ll) / len(vals_smaller_ll) if len(vals_smaller_ll) > 0 else float('nan')
    pc_vals_smaller_ll = len(vals_smaller_ll) / num_val_omic if num_val_omic!=0 else float('nan')

    # procentage of products produced in a significant differnt amount
    pcReg = sum(val > limits[1] or val < limits[0] for val in all_values) / num_val_omic if num_val_omic!=0 else float('nan')
    
    # procentage of products not produced in a significant differnt amount
    pcUnReg = sum(val < limits[1] and val > limits[0] for val in all_values) / num_val_omic if num_val_omic!=0 else float('nan')

    pc_with_val_for_omic = num_val_omic/num_entries if num_entries!=0 else 0

    pathway_summary_data = [num_val_omic, mean_val_higher_ul, pc_vals_higher_ul,
                            mean_val_smaller_ll, pc_vals_smaller_ll, pcReg, pcUnReg, pc_with_val_for_omic]
    return pathway_summary_data

class KeggPathway:
    """ Class representing a KEGG pathway

    """
    def __init__(self, pathway_ID):
        self.keggID = pathway_ID
        self.title = ""
        self.entries = {}
        self.relations = []
        self.reactions = []
        self.orig_x_extent = [0, 0]
        self.orig_y_extent = [0, 0]
        self.maplinks = []
        self.amount_genes = 0
        self.amount_maplinks = 0
        self.amount_compounds = 0
        self.all_values = {'transcriptomics': [],
                           'proteomics': [], 'metabolomics': []}
        # self.all_brite_ids = {}
        # self.KO_level_1 = {}
        # self.KO_other_level = {}
        # self.lowest_level = {}
        # self.other_ontologys = {}
        self.brite_hier_superheadings = {}
        self.brite_hier_subcategories = {}
        self.brite_hier_proteinIDs = {}
        self.prot_in_pathway_StringIds = []
        self.num_entry_with_kegg_get = 0

    def add_entry(self, entry):
        """ append entry to entries field

        Args:
            entry: entry to be added to the entries field

        """
        if entry.entryType == 'gene':
            self.amount_genes += 1
        elif entry.entryType == 'map':
            self.amount_maplinks += 1
            self.maplinks.append(entry.keggID)
        elif entry.entryType == 'compound':
            self.amount_compounds += 1
        for omic, val in zip(['transcriptomics', 'proteomics', 'metabolomics'], [entry.trascriptomicsValue, entry.proteomicsValue, entry.metabolomicsValue]):
            if not isinstance(val, str):
                self.all_values[omic].append(val)
        self.entries[entry.keggID] = entry

    def add_kegg_info(self, kegg_gets):
        if len(kegg_gets)>0:
            for kegg_get in kegg_gets:
                self.num_entry_with_kegg_get += 1
                for category_entry, category_pathway in zip([kegg_get.brite_hier_superheadings,kegg_get.brite_hier_subcategories ,kegg_get.brite_hier_proteinIDs],[self.brite_hier_superheadings,self.brite_hier_subcategories ,self.brite_hier_proteinIDs]):
                    for brite_id in category_entry:
                        if brite_id in category_pathway:
                            category_pathway[brite_id] += 1
                        else:
                            category_pathway[brite_id] = 1
    
    def add_stringIds(self, stringIDs):
        self.prot_in_pathway_StringIds += stringIDs


    def get_PathwaySummaryData(self, recieved_omics, omic_limits):
        pathway_summary_data = []
        num_entries = len(self.entries)
        for recieved, omic, limits in zip(recieved_omics, self.all_values.keys(), omic_limits):
            if recieved:
                pathway_summary_data += get_PathwaySummaryData_omic(num_entries, self.all_values[omic], limits)
        pathway_summary_data.append(num_entries)
        return pathway_summary_data

    def add_relation(self, relation):
        """ append relation to relations field

        Args:
            relation: relation to be added to the relations field

        """
        self.relations.append(relation)

    def add_reaction(self, reaction):
        """ append reaction to reactions field

        Args:
            relation: reaction to be added to the reactions field

        """
        self.reactions.append(reaction)

    def update_orig_extents(self, x, y):
        """ updates pathway extents, i.e. the extents of the original kegg layout in pixels

        Args:
            x: x value
            y: y value
        """
        if x < self.orig_x_extent[0]:
            self.orig_x_extent = (x, self.orig_x_extent[1])
        if x > self.orig_x_extent[1]:
            self.orig_x_extent = (self.orig_x_extent[0], x)
        if y < self.orig_y_extent[0]:
            self.orig_y_extent = (y, self.orig_y_extent[1])
        if y > self.orig_y_extent[1]:
            self.orig_y_extent = (self.orig_y_extent[0], y)

    def apply_extents(self):
        #out_list = []
        x_divisor = self.orig_x_extent[1] - self.orig_x_extent[0]
        y_divisor = self.orig_y_extent[1] - self.orig_y_extent[0]

        for entry in self.entries.values():
            if not self.keggID in entry.extent_applied:
                current_pos = entry.origPos[self.keggID]
                new_pos = [current_pos[0]/x_divisor, current_pos[1]/y_divisor]
                entry.origPos[self.keggID] = new_pos
                entry.extent_applied[self.keggID] = True

    def return_pathway_node_list(self):
        # current_entries = [
        #     entry.keggID for entry in self.entries if not entry.is_empty]
        current_entries = list(self.entries.keys())
        return self.keggID, current_entries 

    def return_pathway_kegg_String_info_dict(self):
        return self.keggID, {'numEntries': len(self.entries), 'StringIds': self.prot_in_pathway_StringIds, 'brite_hier_superheadings': self.brite_hier_superheadings,'brite_hier_subcategories': self.brite_hier_subcategories ,'brite_hier_proteinIDs': self.brite_hier_proteinIDs}

    def return_amounts(self):
        amounts = {"genes": self.amount_genes,
                   "maplinks": self.amount_maplinks, "compounds": self.amount_compounds}
        return self.keggID, amounts

    def return_formated_title(self):
        return {"text": self.keggID +" - "+ self.title, "value" : self.keggID, "title": self.title}

    def asdict(self):
        """ return the KeggPathway  as dictionary 
        """
        return {'keggID': self.keggID, 'entries': self.entries.values(), 'relations': self.relations, 'reactions': self.reactions,"orig_x_extent": self.orig_x_extent, "orig_y_extent": self.orig_y_extent, "maplinks": self.maplinks, "amount_genes": self.amount_genes, "amount_maplinks": self.amount_maplinks, "amount_compounds": self.amount_compounds}        

class KeggPathwayEntry:
    """ Class for a single entry of the KEGG Pathway KGML
    """

    def __init__(self, keggID, values):
        ###self.entry_ID = entry_ID
        self.keggID = keggID
        self.trascriptomicsValue = values["transcriptomics"] or "NaN"
        self.proteomicsValue = values["proteomics"] or "NaN"
        self.metabolomicsValue = values["metabolomics"] or "NaN"
        self.name = None
        self.origPos = {}
        self.entryType = None
        self.pathway_edges = {}
        self.outgoingEdges = []
        self.outgoingOnceRemoved = []
        self.incoming_edges = []
        self.is_empty = False  # TODO: only temporary
        self.extent_applied = {}

    def add_origPos(self, id, pos):
        self.origPos[id] = pos

    # def add_incoming(self, id, obj):
    #    self.incoming_edges[id] = obj

    def add_pathway_edge(self, id, source, target):
        if id in self.pathway_edges.keys():
            self.pathway_edges[id].append(source+"+"+target)
        else:
            self.pathway_edges[id] = [source+"+"+target]

    def add_outgoing(self, obj):
        self.outgoingEdges.append(obj)

    def add_incoming(self, obj):
        self.incoming_edges.append(obj)

    def asdict(self):

        #self.is_empty = (len(self.incoming_edges) < 1) and ((len(self.outgoingEdges) < 1))

        return {
            'keggID': self.keggID,
            'trascriptomicsValue': self.trascriptomicsValue,
            'proteomicsValue': self.proteomicsValue,
            'metabolomicsValue': self.metabolomicsValue,
            'name': self.name,
            'origPos': self.origPos,
            'entryType': self.entryType,
            'incoming_edges': self.incoming_edges,
            'outgoingEdges': self.outgoingEdges,
            'outgoingOnceRemoved': self.outgoingOnceRemoved,
            'pathway_edges': self.pathway_edges,
            'isempty': self.is_empty
        }


class KeggPathwayRelation:
    """ Class for a single relation of the KEGG Pathway KGML
    """

    def __init__(self, entry1, entry2, relationType, relation_subtypes, pathway_ID, pathway_name):
        self.entry1 = entry1
        self.entry2 = entry2
        self.relationType = relationType
        self.relation_subtype = relation_subtypes
        self.relationID = entry1 + "+" + entry2
        self.pathway_ID = pathway_ID
        self.pathway_name = pathway_name

    def asdict(self):
        """ return the KeggPathwayRelation  as dictionary 
        """
        return {
            'edgeType': "relation",
            'relationID': self.relationID,
            'source': self.entry1,
            'target': self.entry2,
            'relationType': self.relationType,
            'relation_subtype': self.relation_subtype,
            'pathway_ID': self.pathway_ID,
            'pathway_name': self.pathway_name
        }


class KeggPathwayReaction:
    """ Class for a single reaction of the KEGG Pathway KGML
    """

    def __init__(self, s_elem, t_elem, r_type, pathway_ID, pathway_name):

        self.source_elem = s_elem
        self.target_elem = t_elem
        self.reaction_ID = s_elem + "+" + t_elem
        self.reaction_type = r_type
        self.pathway_ID = pathway_ID
        self.pathway_name = pathway_name

    def asdict(self):
        """ return the KeggPathwayReaction  as dictionary 
        """
        return {
            'edgeType': "reaction",
            'relationID': self.reaction_ID,
            'source': self.source_elem,
            'target': self.target_elem,
            'reaction_type': self.reaction_type,
            'pathway_ID': self.pathway_ID,
            'pathway_name': self.pathway_name}


