FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./

RUN npm install --omit=dev --legacy-peer-deps --timeout=120000

COPY . .

CMD ["node", "index.js"]
