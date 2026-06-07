FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

CMD ["node", "index.js"]
