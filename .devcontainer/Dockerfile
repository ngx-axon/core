# Use Node 22 LTS as the base
FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Install global dependencies required by your package.json scripts
RUN npm install -g @angular/cli@21.2.1 commitizen cz-conventional-changelog

# [Optional] Install additional OS packages if needed
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# Set the default shell to bash
ENV SHELL=/bin/bash