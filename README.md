# Pre-Run instructions:

### Setup Folder Structure
make directories:`uniprot_files` `session_cache`, `reactome_data`, `kegg_cache`,in project root folder. And a subfolder `pickles` inside the `reactome_data` folder using the following command:
```
mkdir uniprot_files session_cache reactome_data kegg_cache reactome_data/pickles
```

### Getting required files

From https://string-db.org/cgi/download download the appropiate file (i.e. organism) into root folder

For Mouse: (TODO other organisms)
```
wget https://stringdb-static.org/download/protein.links.v11.5/10090.protein.links.v11.5.txt.gz
```
from https://reactome.org/download/current

Download following files into the 'reactome_data' folder:
`ReactomePathwaysRelation.txt`

`UniProt2Reactome_PE_Pathway.txt`

`Ensembl2Reactome_PE_Pathway.txt`

`ChEBI2Reactome_PE_Pathway.txt`

additionally download `diagram.tgz` and unpack to 'reactome_data'


This can be done using wget and the supplied `reactome_file_links.txt` file in the project root.

```
cd reactome_data
wget -i ../reactome_file_links.txt
tar -xf diagram.tgz
```

### Setup Environment 

For Conda:
```
conda env create -f environment.yml
```

For venv:
```
pip install -r requirements.txt
```

### Generate Mapping Files

afterwards run reactome mapping with two args for each of the *2Reactome_PE_Pathway.txt files:

`python reactome_mapping.py \<path to reactome_data folder\> \<filename\>` to generate the pickled data objects.

In most cases this should be:
```
python ./visMOP/python_scripts/reactome_mapping.py ./reactome_data reactome_data/UniProt2Reactome_PE_Pathway.txt 
```
and repeat for the other (UniProt, ChEBI) files.

### Dev Notes:
Export envs with either:
```
conda env export > environment.yml
```

or for pip:

```
pip list --format=freeze > requirements.txt
```