class KeggGet:
    """class for KeggGet
    """
    def __init__(self, keggID):
        self.keggID = keggID
        self.geneName = None
        self.pathways = []
        # self.all_brite_ids = set()
        # self.KO_level_1 = set()
        # self.KO_other_level = set()
        # self.lowest_level = set()
        # self.other_ontologys = set()
        self.brite_hier_superheadings = set()
        self.brite_hier_subcategories = set()
        self.brite_hier_proteinIDs = set()

    def add_pathway(self, pathway_ID):
        self.pathways.append(pathway_ID)

    # def add_brite(self, brite_ID, category):
    #     self.all_brite_ids.add(brite_ID)
    #     if category==1:
    #         self.KO_level_1.add(brite_ID)
    #     elif category==2:
    #         self.KO_other_level.add(brite_ID)
    #     elif category==3:
    #         self.lowest_level.add(brite_ID)
    #     elif category==4:
    #         self.other_ontologys.add(brite_ID)

    def add_brite(self, brite_ID, category):
        if category==1:
            self.brite_hier_superheadings.add(brite_ID)
        elif category==2:
            self.brite_hier_subcategories.add(brite_ID)
        elif category==3:
            self.brite_hier_proteinIDs.add(brite_ID)
