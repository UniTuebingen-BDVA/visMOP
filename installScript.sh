#!/bin/bash
mkdir session_cache reactome_data reactome_data/pickles
cd reactome_data
wget -i ../reactome_file_links.txt
tar -xf diagram.tgz