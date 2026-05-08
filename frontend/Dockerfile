FROM node:20.18.1-alpine3.20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27.5-alpine
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3009
USER nginx
CMD ["nginx", "-g", "daemon off;"]
