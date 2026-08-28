FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

USER root
RUN apt-get update && apt-get install -y curl git && \
    export FOUNDRY_DIR=/usr/local && \
    curl -L https://foundry.paradigm.xyz | bash && \
    /usr/local/bin/foundryup && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    su node -c "forge --version"

USER node
