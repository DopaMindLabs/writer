# Reference blind relay for LIpsum Writer collaboration.
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
ENV RELAY_HOST=0.0.0.0
ENV RELAY_PORT=8787
EXPOSE 8787
CMD ["node", "--experimental-strip-types", "src/bin.ts"]
