#!/usr/bin/env bash
set -e

# copy coinjoin-backend repo
mkdir coinjoin-backend
git clone https://github.com/trezor/coinjoin-backend.git ./coinjoin-backend

# replace coinjoin-backend submodules to https (temporary workaround)
rm ./coinjoin-backend/.gitmodules
mv ./docker/coinjoin-submodule ./coinjoin-backend/.gitmodules

cd coinjoin-backend

# checkout to custom branches
# TODO

# build coinjoin-backend-image
make vendor
make build-image

# workaround for local image in CI while using `docker pull`
# https://stackoverflow.com/a/57644157
# if [[ $$(docker ps -q -f name=registry) ]]; then
#     docker kill registry;
# fi
docker kill registry
docker rm registry
docker run -d -p 5000:5000 --restart=always --name registry registry:2
docker tag coinjoin-backend-image:latest localhost:5000/coinjoin-backend-image
docker push localhost:5000/coinjoin-backend-image



# git submodule add git@github.com:trezor/coinjoin-backend.git

# git config --global url."https://".insteadOf git://

# mkdir -p ~/.ssh
# ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts
# ssh-keygen -t rsa -C "user@email.com" -N "" -f "$HOME/.ssh/id_rsa"

# eval $(ssh-agent -s)
# ssh-add ~/.ssh/id_ed25519

# ssh-keygen -t dsa  -C "test key" -f mykey

# ssh -vT git@github.com

# ssh-keygen -t rsa -C "git@github.com"
# cat ~/.ssh/id_rsa.pub

# mkdir coinjoin-backend
# git submodule update --init --recursive
# cd coinjoin-backend
# ls -a
# git clone git@github.com:trezor/coinjoin-backend.git .

# docker tag coinjoin-backend-image:latest localhost:5000/coinjoin-backend-image:latest
cd ..
# make run
