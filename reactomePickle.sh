#!/bin/bash
python ./visMOP/python_scripts/reactome_mapping.py ./reactome_data Ensembl2Reactome_PE_Pathway.txt 
python ./visMOP/python_scripts/reactome_mapping.py ./reactome_data UniProt2Reactome_PE_Pathway.txt 
python ./visMOP/python_scripts/reactome_mapping.py ./reactome_data ChEBI2Reactome_PE_Pathway.txt 