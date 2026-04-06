FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    curl git ca-certificates openssh-client \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL "https://www.cursor.com/install?channel=lab" | bash \
    && ln -s /root/.local/bin/cursor-agent /usr/local/bin/cursor-agent
ARG REPO_URL=https://github.com/sfc-gh-mboos/grafana.git
ARG REPO_BRANCH=main
RUN git clone --branch ${REPO_BRANCH} ${REPO_URL} /workspace
WORKDIR /workspace
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
