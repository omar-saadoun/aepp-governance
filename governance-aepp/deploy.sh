#!/usr/bin/env bash

GIT_REV="$(git rev-parse HEAD)"&& \
rm -rf dist && \
rm -rf node_modules && \
rm -rf deployment && \
npm install && \
npm run build && \
mkdir deployment && \
cd deployment/ && \
git init && \
git remote add origin https://github.com/omar-saadoun/aepp-governance.git && \
git fetch && \
git checkout gh-pages && \
git rm -rf . && \
git clean -ffxd && \
cp -r ../dist/* . && \
echo "gobernanza.inmind.space" > CNAME && \
git add * && \
git commit -m "governance aepp ${GIT_REV} deployment to gh-pages" && \
git fetch && git rebase -s recursive -Xtheirs origin/gh-pages && \
git push origin gh-pages && \
cd .. && \
rm -rf deployment
