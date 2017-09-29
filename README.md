# Установка и запуск

1. npm i -g yarn webpack db-migrate
1. cd yet_another_exchange_project
1. yarn
1. webpack
1. su postgres
1. createuser market -dP (пароль market)
1. createdb -U market market
1. exit
1. db-migrate up --cofig src/database.json
1. node build/backend/index.js &
1. node build/web/app.js
1. http://localhost:3000