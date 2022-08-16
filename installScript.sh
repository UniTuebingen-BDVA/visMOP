#!/bin/bash
mkdir uniprot_files session_cache reactome_data reactome_data/pickles
wget https://stringdb-static.org/download/protein.links.v11.5/10090.protein.links.v11.5.txt.gz
cd reactome_data
wget -i ../reactome_file_links.txt
tar -xf diagram.tgz