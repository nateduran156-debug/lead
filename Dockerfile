FROM node:18-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++

COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY . .

CMD ["node", "index.js"]
