class KeggPathway:
    """ Class representing a KEGG pathway

    """
    def __init__(self, pathway_ID):
        self.keggID = pathway_ID
        self.title = ""
        self.entries = {}
        self.relations = []
        self.reactions = []
        self.orig_x_extent = [0,0]
        self.orig_y_extent = [0,0]
        self.maplinks = []
        self.amount_genes = 0
        self.amount_maplinks = 0
        self.amount_compounds = 0

    def add_entry(self, entry):
        """ append entry to entries field

        Args:
            entry: entry to be added to the entries field

        """
        if(entry.keggID not in self.entries.keys()):
            if entry.entryType == 'gene':
                self.amount_genes += 1
            elif entry.entryType == 'map':
                self.amount_maplinks += 1
                self.maplinks.append(entry.keggID)
            elif entry.entryType == 'compound':
                self.amount_compounds += 1        
        self.entries[entry.keggID] = entry

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

        for entry in self.entries.values():
            if not self.keggID in entry.extent_applied:
                current_pos = entry.origPos[self.keggID]
                new_pos = [current_pos[0]/x_divisor, current_pos[1]/y_divisor] 
                entry.origPos[self.keggID] = new_pos
                entry.extent_applied[self.keggID] = True
            
    def return_pathway_node_list(self):
        #current_entries = [entry.keggID for entry in self.entries if not entry.is_empty]
        current_entries = list(self.entries.keys())
        return self.keggID, current_entries 

    def return_amounts(self):
        amounts =  {"genes": self.amount_genes, "maplinks": self.amount_maplinks, "compounds": self.amount_compounds}
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
        self.is_empty = False # TODO: only temporary
        self.extent_applied = {}


    def add_origPos(self, id, pos):
        self.origPos[id] = pos

    #def add_incoming(self, id, obj):
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
