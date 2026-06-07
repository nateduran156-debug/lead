FROM node:18-bullseye

WORKDIR /app

# Only copy package.json — no stale lock file
COPY package.json ./

RUN npm install --omit=dev

COPY . .

CMD ["node", "index.js"]
