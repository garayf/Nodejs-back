# Backend Template

## Intro

This is a basic backend template for Knack applications.

## Requirements

Install Node and Npm.

- [Linux](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04)

- [Windows/MAC](https://nodejs.org/en/download/)


If Authentication is required, install MongoDB as well.
- [Linux](https://docs.mongodb.com/manual/administration/install-on-linux/)

- [Windows](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/)

- [MAC](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/)


## Getting Started

1. Get repository from github:
```
$git clone [Aqui iría un link si tuviera uno] # or clone your own fork
```
Then rename the folder from "backend-template-hapijs-knack" to a name matching the App you're working on. i.e "backapps-api"
```
$cd [project-name]
```
2. Install dependencies.
```
npm install
```
3. Create a .env file with the following variables:
```
KNACK_APP_ID="knack_app_id"
KNACK_API_KEY="knack_api-key"
PORT=####
```
>We recommend using ports over 8000.

>In case of Auth requirement, more variables will be added later.

4. Run the server:
```
node server
```


## Implementing Login Authentication


### Configuring MongoDB
>If you haven't MongoDB installed already, look at installation guide [Here](https://docs.mongodb.com/manual/installation/)

1. Create a new database and user for mongo:
```
$mongo
$use dbname
$db.createUser({user:”{username}”,pwd:”{password}”,roles:[“readWrite”,”dbAdmin”]})
```
2. Install mongoose and other needed libraries.
>If "package.json" already contains these libraries, you can skip this step.
```
npm install mongoose --save
npm install axios --save
npm install node-schedule --save
```
3. Add the following variables to the .env file:
```
MONGO_USER = user
MONGO_PASSWORD = password
MONGO_URL = localhost
MONGODB_NAME = dbname
MONGODB_NAME_AUTH = dbname
```
4. Configure a valid URL on the Knack app, then add the following variable to the .env file:

```
KNACK_REQUEST_AUTH = https://api.knack.com/v1/pages/{scene_##}/views/{view_##}/records
```
The URL must belong to a view protected by Login, and must not be restricted to any specific roles.
