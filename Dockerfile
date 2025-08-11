# --- СТАДИЯ 1: сборка ---
FROM node:14-alpine AS build

WORKDIR /app

COPY package*.json ./

# Установка зависимостей и Angular CLI за один RUN для сокращения слоёв
RUN apk add --no-cache bash python3 make g++ && \
    npm install -g @angular/cli@9.1.15 && \
    npm install angular-imask@6.1.0 imask@6.1.0 --legacy-peer-deps && \
    npm install --legacy-peer-deps

COPY . .

RUN ng build --configuration production

# --- СТАДИЯ 2: nginx ---
FROM nginx:alpine

# COPY --from=build /app/dist/GreenCityClient /usr/share/nginx/html

# Копируем config.js отдельно, чтобы можно было менять без пересборки
COPY /src/config.js /usr/share/nginx/html/config.js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
