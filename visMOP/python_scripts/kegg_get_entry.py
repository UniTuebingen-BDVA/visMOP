class KeggGet:
    """class for KeggGet
    """
    def __init__(self, keggID):
        self.keggID = keggID
        self.geneName = None
        self.pathways = []
        self.all_brite_ids = set()
        self.KO_level_1 = set()
        self.KO_other_level = set()
        self.lowest_level = set()
        self.other_ontologys = set()

    def add_pathway(self, pathway_ID):
        self.pathways.append(pathway_ID)

    def add_brite(self, brite_ID, category):
        self.all_brite_ids.add(brite_ID)
        if category==1:
            self.KO_level_1.add(brite_ID)
        elif category==2:
            self.KO_other_level.add(brite_ID)
        elif category==3:
            self.lowest_level.add(brite_ID)
        elif category==4:
            self.other_ontologys.add(brite_ID)