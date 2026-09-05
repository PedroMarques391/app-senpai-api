FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.12.0 --activate

COPY package.json yarn.lock* .yarnrc.yml* ./

RUN yarn --version && yarn install --immutable

COPY . .

RUN yarn run build

EXPOSE 3000

CMD ["yarn", "run", "start"]
