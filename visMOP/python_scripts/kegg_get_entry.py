class KeggGet:
    """class for KeggGet
    """
    def __init__(self, kegg_ID):
        self.keggID = kegg_ID
        self.geneName = None
        self.pathways = []

    def add_pathway(self, pathway_ID):
        self.pathways.append(pathway_ID)
