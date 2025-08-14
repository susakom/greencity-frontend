# CI/CD Guide.md

# 📄 `CI_CD_GUIDE.md` — Полное руководство по CI/CD для проекта Green City

> ✅ Версия: 1.0
> 
> 
> ✅ Последнее обновление: 2025-08-12
> 
> ✅ Автор: Susak Oleksandr
> 
> ✅ Проект: Green City
> 

---

## 🎯 Назначение

Этот документ описывает **полный процесс настройки и работы CI/CD** для проекта **Green City** с использованием:

- **GitHub Actions** — для автоматизации
- **AWS ECR** — для хранения Docker-образов
- **EC2** — для размещения приложения
- **RDS** — для базы данных
- **Terraform** — для инфраструктуры

---

## 🧩 Архитектура

```
[Разработчик] → git push → GitHub Actions → Docker Build → ECR → SSH → EC2 → docker-compose up

```

- **3 репозитория**: `greencity-frontend`, `greencity-backcore`, `greencity-backuser`
- Каждый имеет свой `deploy.yml`
- Каждый деплоится независимо
- Все используют **одну и ту же EC2-машину и RDS**

---

## 🔐 Предварительные требования

Перед настройкой CI/CD убедитесь, что:

### 1. Инфраструктура развёрнута

- ✅ VPC, подсети, IGW
- ✅ EC2-инстансы (`backend`, `frontend`) с Docker, Docker Compose
- ✅ RDS (PostgreSQL) в приватной подсети
- ✅ Security Groups разрешают нужные порты
- ✅ Terraform успешно применил конфигурацию

### 2. AWS ECR

- Созданы репозитории:
    - `greencity-frontend`
    - `greencity-backcore`
    - `greencity-backuser`

### 3. GitHub Secrets (в каждом репозитории)

| Secret Name             | Значение                      | Пример                               |
| ----------------------- | ------------------------------| ------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | Ключ доступа IAM-пользователя | `AKIA...`                            |
| `AWS_SECRET_ACCESS_KEY` | Секретный ключ                | `abc123...`                          |
| `AWS_REGION`            | Регион                        | `eu-central-1`                       |
| `AWS_ACCOUNT_ID`        | ID аккаунта AWS               | `-----------`                        |
| `EC2_INSTANCE_NAME`     | Имя EC2-инстанса              | `green_city_susak_backend`           |
| `EC2_SSH_KEY`           | Приватный ключ (весь текст)   | `-----BEGIN OPENSSH PRIVATE KEY-----`|
| `DATASOURCE_PASSWORD`   | Пароль в БД                   | `--------------`                     |
| `DATASOURCE_URL`        | Путь к БД в формате           | `jdbc:postgresql://html../greencity` |
| `DATASOURCE_USER`       | Пользователь БД (default)     | `postgres`                           |
| `EMAIL_ADDRESS`         | Email для verification letter | `susak....`                          |
| `EMAIL_PASSWORD`        | Пароль от Email               | `--------`                           |
|-------------------------|-------------------------------|--------------------------------------|


---

## 🛠️ Структура CI/CD (на примере `greencity-frontend`)

### 1. Файл: `.github/workflows/deploy.yml`

```yaml
name: Deploy Frontend

on:
  workflow_dispatch:
  #push:
  #  branches: [ "develop" ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v3
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

          
      - name: Get EC2 Public IP and DNS
        id: get_instance_info
        run: |
          # Получаем информацию об инстансе в формате JSON
          INSTANCE_INFO=$(aws ec2 describe-instances \
            --filters "Name=tag:Name,Values=${{ secrets.EC2_INSTANCE_NAME }}" "Name=instance-state-name,Values=running" \
            --query "Reservations[0].Instances[0]" \
            --output json)
      
          # Проверяем, найден ли инстанс
          if [ -z "$INSTANCE_INFO" ] || [ "$INSTANCE_INFO" = "null" ]; then
            echo "❌ Не удалось найти запущенный инстанс с именем: ${{ secrets.EC2_INSTANCE_NAME }}"
            exit 1
          fi
      
          # Извлекаем Public IP и Public DNS
          PUBLIC_IP=$(echo $INSTANCE_INFO | jq -r '.PublicIpAddress')
          PUBLIC_DNS=$(echo $INSTANCE_INFO | jq -r '.PublicDnsName')
      
          # Проверяем, что IP и DNS получены
          if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "null" ]; then
            echo "⚠️  Публичный IP не назначен (возможно, инстанс ещё не готов)"
          else
            echo "✅ Найден публичный IP: $PUBLIC_IP"
          fi
      
          if [ -z "$PUBLIC_DNS" ] || [ "$PUBLIC_DNS" = "null" ]; then
            echo "⚠️  Публичное DNS не назначено"
          else
            echo "✅ Найдено публичное DNS: $PUBLIC_DNS"
          fi
      
          # Сохраняем в outputs для использования в других шагах
          echo "ec2_public_ip=$PUBLIC_IP" >> $GITHUB_OUTPUT
          echo "ec2_public_dns=$PUBLIC_DNS" >> $GITHUB_OUTPUT

          
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: greencity-frontend
          IMAGE_FRONTEND_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_FRONTEND_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_FRONTEND_TAG

          # 🔥 Создаём временный файл с переменными
           echo "IMAGE_FRONTEND_TAG=$IMAGE_FRONTEND_TAG" > .add_env_frontend
           echo "ECR_REGISTRY=$ECR_REGISTRY" >> .add_env_frontend
           echo "ECR_REPOSITORY=$ECR_REPOSITORY" >> .add_env_frontend
      
          # Проверка
           cat .add_env_frontend
      - name: Copy .add_env_frontend to EC2
        uses: appleboy/scp-action@v0.1.5
        with:
          host: ${{ steps.get_instance_info.outputs.ec2_public_dns }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          source: ".add_env_frontend"
          target: "/home/ubuntu"

      - name: Generate config.js
        env:
          PUBLIC_IP: ${{ steps.get_instance_info.outputs.ec2_public_ip }}
        run: |
          # PUBLIC_IP=${{ secrets.EC2_PUBLIC_IP }}
          cat > config.js << EOF
          window._env_ = {
            backendCoreUrl: "http://${PUBLIC_IP}:8080/",
            backendUserUrl: "http://${PUBLIC_IP}:8060/",
            frontendUrl: "http://${PUBLIC_IP}:4200/",
            socketUrl: "http://${PUBLIC_IP}:8080/socket"
          };
          EOF

      - name: Generate .env
        env:
          PUBLIC_IP: ${{ steps.get_instance_info.outputs.ec2_public_ip }}
        run: |
          # Проверка, что IP получен
          if [ -z "$PUBLIC_IP" ]; then
            echo "❌ Ошибка: PUBLIC_IP пустой. Проверьте EC2 instance."
            exit 1
          fi
      
          # Получаем секреты из AWS Secrets Manager
          echo "🔐 Получаем секреты из AWS Secrets Manager..."
          SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id greencity-rds-env --query SecretString --output text)
      
          # Парсим значения
          DATASOURCE_URL=$(echo $SECRET_JSON | jq -r '.DATASOURCE_URL')
          DATASOURCE_USER=$(echo $SECRET_JSON | jq -r '.DATASOURCE_USER')
          DATASOURCE_PASSWORD=$(echo $SECRET_JSON | jq -r '.DATASOURCE_PASSWORD')
          EMAIL_ADDRESS=$(echo $SECRET_JSON | jq -r '.EMAIL_ADDRESS')
          EMAIL_PASSWORD=$(echo $SECRET_JSON | jq -r '.EMAIL_PASSWORD')
      
          # Формируем .env
          cat > .env << EOF
              # === База данных ===
              DATASOURCE_URL=$DATASOURCE_URL
              DATASOURCE_USER=$DATASOURCE_USER
              DATASOURCE_PASSWORD=$DATASOURCE_PASSWORD
              
              # === Email ===
              EMAIL_ADDRESS=$EMAIL_ADDRESS
              EMAIL_PASSWORD=$EMAIL_PASSWORD
              
              # === Google ===
              GOOGLE_CLIENT_ID=129513550972-ffqpdq6e5basbn9pcdvroqf20ffcg09f.apps.googleusercontent.com
              GOOGLE_API_KEY=AIzaSyCN1iqS_3TcZ2d2d5SZwUnTOqDiRmwG13c
              GOOGLE_CLIENT_ID_MANAGER=236387301472-5fqure34s5flqp7fl94jiem8todv64d5.apps.googleusercontent.com
              
              # === Cloudinary ===
              CLOUD_NAME=greencity-lv448java
              API_KEY=675739387883727
              API_SECRET=3nJsbn28s_RWJJo67kG8OY-ywJ8
              
              # === Azure ===
              AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=csb10032000a548f571;AccountKey=qV2VLVZlzxuEq8zGTgeiVE9puJiELNRPZcB9YgTSjZ3wKdWVA7kPjSOp6ESHlVMTJfHxB6N+iaV2TOlbe1GTvg==
              AZURE_CONTAINER_NAME=allfiles
              
              # === Ограничения файлов ===
              MAX_FILE_SIZE=2MB
              MAX_REQUEST_SIZE=2MB
              
              # === Google Cloud Storage ===
              BUCKET_NAME=staging.greencity-c5a3a.appspot.com
              STATIC_URL=https://storage.cloud.google.com/
              DEFAULT_PROFILE_PICTURE=https://storage.cloud.google.com/staging.greencity-c5a3a.appspot.com/3d1a4092-c31e-4a0f-814b-57a0e4de0851
              
              # === Прочие ===
              CHAT_LINK=http://chat:8030
              PROFILE=docker
              GOOGLE_APPLICATION_CREDENTIALS="/home/ubuntu/google-creds.json"
              
              # === URL фронтенда ===
              CLIENT_APP_URL=http://${PUBLIC_IP}:4200
              EOF
      
          echo "✅ Файл .env успешно создан"
          
      - name: Copy files to EC2
        uses: appleboy/scp-action@v0.1.5
        with:
          host: ${{ steps.get_instance_info.outputs.ec2_public_dns }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          source: "config.js,.env"
          target: "/home/ubuntu"

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1
        env:
            IMAGE_FRONTEND_TAG: ${{ github.sha }}

        with:
          host: ${{ steps.get_instance_info.outputs.ec2_public_dns }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
                  ls -al
                  # 🔐 Авторизация в AWS ECR
                  echo "🔐 Авторизация в Amazon ECR..."
                  aws ecr get-login-password --region ${{ secrets.AWS_REGION }} | \
                  docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
                  echo "✅ Загружаем переменные из .add_env_frontend"
                  set -a
                  source .add_env_frontend
                  source .add_env_backuser
                  source .add_env_backcore
                  set +a
                  # ✅ Проверяем, что переменная есть
                  echo "🚀 Деплой frontend с тегом: $IMAGE_FRONTEND_TAG"
                  echo "Тег образа= $IMAGE_FRONTEND_TAG"
                  docker-compose up -d 
                  docker images
                  docker ps -a
```

---

## 📁 Структура репозитория

```
greencity-frontend/
├── src/
├── Dockerfile
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .env.example
├── config.js.example
└── CI_CD_GUIDE.md

```

---

## 🔁 Процесс деплоя

1. Разработчик делает `git push` в ветку `main`
2. GitHub Actions:
    - Клонирует репозиторий
    - Собирает Docker-образ с тегом `git commit SHA`
    - Пушит в ECR
    - Генерирует `config.js`, `.env`, `.add_env_frontend`
    - Копирует файлы на EC2
    - Подключается по SSH и запускает `docker-compose up`
3. Приложение обновляется в облаке

---

## 🧪 Проверка после деплоя

### 1. В логах GitHub Actions

- ✅ `Build, tag, and push image` — успешен
- ✅ `Copy files to EC2` — успешен
- ✅ `Deploy to EC2` — успешен

### 2. На EC2

```bash
docker ps -a
docker logs gc-frontend
docker images | grep frontend

```

### 3. В браузере

- Откройте: `http://<ваш-ip>:4200`
- Проверьте: `window._env_` в консоли

---

## 🔄 Как повторить для `backcore` и `backuser`

1. Скопируйте `deploy.yml` в соответствующий репозиторий
2. Измените:
    - `ECR_REPOSITORY: greencity-backcore`
    - `Dockerfile` (для Spring Boot)
    - `docker-compose.yml` (сервис `backcore`)
3. Убедитесь, что `IMAGE_TAG` передаётся

---

## 🚨 Частые проблемы и решения

| Проблема | Решение |
| --- | --- |
| `pull access denied` | Добавьте `aws ecr get-login-password` перед `docker-compose pull` |
| `IMAGE_TAG` пуст | Убедитесь, что `.add_env_frontend` скопирован и `source` с `set -a` |
| Стартовая страница Nginx | Проверьте, что `dist` скопирован в `nginx/html` |
| `config.js` не найден | Убедитесь, что `volume` в `docker-compose.yml` |
| База данных недоступна | Проверьте Security Group RDS и VPC |

## 🛡️ Безопасность

- `config.js` и `.env` **не в репозитории**
- Пароли — в **AWS Secrets Manager**
- SSH-ключ — в **GitHub Secrets**
- Используются **динамические теги**, а не `latest`

---

---