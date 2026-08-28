FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

USER root
RUN apt-get update && apt-get install -y curl git && \
    curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup && \
    ln -sf /root/.foundry/bin/forge /usr/local/bin/forge && \
    ln -sf /root/.foundry/bin/anvil /usr/local/bin/anvil && \
    ln -sf /root/.foundry/bin/cast /usr/local/bin/cast && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

USER node
