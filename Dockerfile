# Используем Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package.json package-lock.json ./

# Устанавливаем Angular CLI глобально
RUN npm install -g @angular/cli@9.1.15

# Устанавливаем @angular-devkit/build-angular с --legacy-peer-deps
RUN npm install --save-dev @angular-devkit/build-angular --legacy-peer-deps


# Устанавливаем зависимости с --legacy-peer-deps
RUN npm install --legacy-peer-deps


# Копируем исходный код
COPY . .

# Открываем порт
EXPOSE 4200

# Запускаем Angular в режиме разработки
CMD ["ng", "serve", "--aot=false", "--host", "0.0.0.0", "--disable-host-check"]
