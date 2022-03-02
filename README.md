Pre-Run instructions:

make directory: 'reactome_data', in project root folder.

In This Folder: subfolder 'pickles'

and download following files into the 'reactome_data' folder:
ReactomePathwaysRelation.txt
UniProt2Reactome_PE_Pathway.txt
Ensembl2Reactome_PE_Pathway.txt
ChEBI2Reactome_PE_Pathway.txt

additionally download diagram.tgz and unpack to 'reactome_data'

from https://reactome.org/download/current

afterwards run reactome mapping with two args for each of the *2Reactome_PE_Pathway.txt files:

`python reactome_mapping.py \<path to reactome_data folder\> \<filename\>` to generate the pickled data objects.