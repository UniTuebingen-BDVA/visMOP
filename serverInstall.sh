#!/bin/bash
#bash ./installScript.sh
#bash ./reactomePickle.sh
echo "Updating conda"
if conda update -y -n base -c defaults conda; then
    echo "Conda successfully updated"
else
    echo "Conda update failed"
fi

if conda env update -y --prefix= ./visMOPenv --file environment_defaults.yml --prune; then
    echo "Environment successfully updated/created"
else
    echo "Environment wupdate/creation failed"
fi

echo "Activating visMOP environment"
conda activate visMOP
echo "Installing visMOP"
if pip install .; then
    echo "visMOP successfully installed"
else
    echo "visMOP installation failed"
fi

echo "Verifying folder structure"
mkdir session_cache reactome_data reactome_data/pickles

echo "Verifying reactome files"

#switch to reactome_data folder and check if diagram.tgz is already present and up to date
# if not download the file from the server and extract it replacing the old ones
cd reactome_data
if wget -N --spider https://reactome.org/download/current/diagram.tgz 2>&1 | grep "HTTP/1.1 200 OK"; then
    echo "diagram.tgz is not up to date"
    rm -r ./diagram
    wget https://reactome.org/download/current/diagram.tgz
    tar -xzf diagram.tgz
    rm diagram.tgz
else
    echo "diagram.tgz is up to date"
fi
#check if ReactomePathwayRelations.txt is already present and up to date
# if not download the file from the server and replace the old one
if wget -N --spider https://reactome.org/download/current/ReactomePathwayRelations.txt 2>&1 | grep "HTTP/1.1 200 OK"; then
    echo "ReactomePathwayRelations.txt is not up to date"
    wget https://reactome.org/download/current/ReactomePathwayRelations.txt
else
    echo "ReactomePathwayRelations.txt is up to date"
fi
#check if if Ensembl2Reactome_PE_Pathway.txt is already present and up to date
# if not download the file from the server and replace the old one and create a pickle file using /visMOP/python_scripts/reactome_mapping.py
if wget -N --spider https://reactome.org/download/current/Ensembl2Reactome_PE_Pathway.txt 2>&1 | grep "HTTP/1.1 200 OK"; then
    echo "Ensembl2Reactome_PE_Pathway.txt is not up to date"
    wget https://reactome.org/download/current/Ensembl2Reactome_PE_Pathway.txt
    python ../../visMOP/python_scripts/reactome_mapping.py ./ Ensembl2Reactome_PE_Pathway.txt
else
    echo "Ensembl2Reactome_PE_Pathway.txt is up to date"
fi
#check if if UniProt2Reactome_PE_Pathway.txt is already present and up to date
# if not download the file from the server and replace the old one and create a pickle file using /visMOP/python_scripts/reactome_mapping.py
if wget -N --spider https://reactome.org/download/current/UniProt2Reactome_PE_Pathway.txt 2>&1 | grep "HTTP/1.1 200 OK"; then
    echo "UniProt2Reactome_PE_Pathway.txt is not up to date"
    wget https://reactome.org/download/current/UniProt2Reactome_PE_Pathway.txt
    python ../../visMOP/python_scripts/reactome_mapping.py ./ UniProt2Reactome_PE_Pathway.txt
else
    echo "UniProt2Reactome_PE_Pathway.txt is up to date"
fi
#check if if ChEBI2Reactome_PE_Pathway.txt is already present and up to date
# if not download the file from the server and replace the old one and create a pickle file using /visMOP/python_scripts/reactome_mapping.py
if wget -N --spider https://reactome.org/download/current/ChEBI2Reactome_PE_Pathway.txt 2>&1 | grep "HTTP/1.1 200 OK"; then
    echo "ChEBI2Reactome_PE_Pathway.txt is not up to date"
    wget https://reactome.org/download/current/ChEBI2Reactome_PE_Pathway.txt
    python ../../visMOP/python_scripts/reactome_mapping.py ./ ChEBI2Reactome_PE_Pathway.txt
else
    echo "ChEBI2Reactome_PE_Pathway.txt is up to date"
fi

