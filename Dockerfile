# Base Image 
From node:18

# LABELS
LABEL maintainer="madara27495@gmail.com"\
      version="1.2.0"\
      description="Lightweight API testing CLI — curl with a brain"\
      org.opencontainers.image.source="https://github.com/toklas495/404ping"

# WORKING DIRECTORY -> /app
WORKDIR /app

# COPY package.json and package-lock.json to working dir
COPY package*.json ./

# INSTALL ALL DEPENDENCIES
RUN npm ci --ignore-scripts

# COPY EVERYTHING
COPY . .

# ENTRYPOINT SET DEFAULT COMMAND
ENTRYPOINT ["node","app.mjs"]

