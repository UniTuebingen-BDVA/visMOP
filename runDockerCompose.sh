#!/bin/bash
# This script is used to deploy the <your-app> application
docker ps -a --filter ancestor='vismop' --format='{{.ID}}'|xargs docker stop|xargs docker remove
# remove the (old) image
docker image rm omicstide
# load the image from the tar file
docker load --input image_vismop.tar.gz
# run the container
docker compose run -dp 0.0.0.0:$1:$2/tcp 