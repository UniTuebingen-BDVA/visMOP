class KeggPathway:
    """ Class representing a KEGG pathway

    """
    def __init__(self, pathway_ID):
        self.kegg_ID = pathway_ID
        self.title = ""
        self.entries = []
        self.relations = []
        self.reactions = []
        self.orig_x_extent = [0,0]
        self.orig_y_extent = [0,0]

    def add_entry(self, entry):
        """ append entry to entries field

        Args:
            entry: entry to be added to the entries field

        """
        self.entries.append(entry)

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
              

    def update_orig_extents(self,x,y):
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

        for entry in self.entries:
            if not self.kegg_ID in entry.extent_applied:
                current_pos = entry.orig_pos[self.kegg_ID]
                new_pos = [current_pos[0]/x_divisor, current_pos[1]/y_divisor] 
                entry.orig_pos[self.kegg_ID] = new_pos
                entry.extent_applied[self.kegg_ID] = True
            
    def return_pathway_node_list(self):
        current_entries = [entry.kegg_ID for entry in self.entries if not entry.is_empty]
        return self.kegg_ID, current_entries 

    def return_formated_title(self):
        return {"text": self.kegg_ID +" - "+ self.title, "value" : self.kegg_ID}

    def asdict(self):
        """ return the KeggPathway  as dictionary 
        """
        return {'keggID': self.kegg_ID, 'entries': self.entries, 'relations': self.relations, 'reactions': self.reactions,"orig_x_extent": self.orig_x_extent, "orig_y_extent": self.orig_y_extent}        

class KeggPathwayEntry:
    """ Class for a single entry of the KEGG Pathway KGML
    """

    def __init__(self, kegg_ID, values):
        ###self.entry_ID = entry_ID
        self.kegg_ID = kegg_ID
        self.trascriptomicsValue = values["transcriptomics"]
        self.proteomicsValue = values["proteomics"]
        self.name = None
        self.orig_pos = {}
        self.entry_type = None
        self.pathway_edges = {}
        self.outgoing_edges = []
        self.incoming_edges = []
        self.is_empty = False # TODO: only temporary
        self.extent_applied = {}

    def add_orig_pos(self, id, pos):
        self.orig_pos[id] = pos

    #def add_incoming(self, id, obj):
    #    self.incoming_edges[id] = obj

    def add_pathway_edge(self, id, source, target):
        if id in self.pathway_edges.keys():
            self.pathway_edges[id].append(source+"+"+target)
        else:
            self.pathway_edges[id] = [source+"+"+target]       

    def add_outgoing(self, obj):
        self.outgoing_edges.append(obj)

    def add_incoming(self, obj):
        self.incoming_edges.append(obj) 

    def asdict(self):

        #self.is_empty = (len(self.incoming_edges) < 1) and ((len(self.outgoing_edges) < 1))

        return {
        'kegg_ID': self.kegg_ID,
        'trascriptomicsValue': self.trascriptomicsValue,
        'proteomicsValue': self.proteomicsValue,
        'name': self.name,
        'orig_pos': self.orig_pos,
        'entry_type': self.entry_type,
        'incoming_edges': self.incoming_edges,
        'outgoing_edges': self.outgoing_edges,
        'pathway_edges': self.pathway_edges,
        'isempty': self.is_empty
        }

class KeggPathwayRelation:
    """ Class for a single relation of the KEGG Pathway KGML
    """
    def __init__(self, entry1, entry2, relation_type, relation_subtypes, pathway_ID, pathway_name):
        self.entry1 = entry1
        self.entry2 = entry2
        self.relation_type = relation_type
        self.relation_subtype = relation_subtypes
        self.relation_ID = entry1 + "+" + entry2
        self.pathway_ID = pathway_ID
        self.pathway_name = pathway_name
    def asdict(self):
        """ return the KeggPathwayRelation  as dictionary 
        """
        return {
            'edgeType': "relation",
            'relation_ID': self.relation_ID,
            'source': self.entry1,
            'target': self.entry2,
            'relation_type': self.relation_type,
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
            'relation_ID': self.reaction_ID,
            'source': self.source_elem,
            'target': self.target_elem,
            'reaction_type': self.reaction_type,
            'pathway_ID': self.pathway_ID,
            'pathway_name': self.pathway_name}

"""
OLD FUNCTIONS
"""

class KeggPathwayReactionOLD:
    """ Class for a single reaction of the KEGG Pathway KGML
    """
    def __init__(self, r_elem, s_elem, p_elem, r_type):
        self.reaction_elem = r_elem
        self.substrate_elem = s_elem
        self.product_elem = p_elem
        self.reaction_type = r_type
    def asdict(self):
        """ return the KeggPathwayReaction  as dictionary 
        """
        return {'reaction_elem': self.reaction_elem, 'substrate_elem': self.substrate_elem, 'product_elem': self.product_elem, "reaction_type": self.reaction_type}

