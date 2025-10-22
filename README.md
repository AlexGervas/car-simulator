# Car Simulator

![Build Status](https://github.com/AlexGervas/car-simulator/actions/workflows/deploy.yml/badge.svg)
![Deploy](https://img.shields.io/github/deployments/AlexGervas/car-simulator/github-pages)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Angular](https://img.shields.io/badge/Angular-18-DD0031?logo=angular&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)

A web application on **Angular** for car driving simulation with support for a mini-application **Telegram** and an integrated **Telegram bot** for user interaction. The interactive car simulator provides realistic **3D physics** for driving and interacts with the backend API. The application also implements **UI components**. Testing is carried out using **Karma** and **Jasmine**.


## Demo version of the app

▶ [Open the app via a browser](https://alexgervas.github.io/car-simulator)

▶ Similarly, you can launch a Telegram bot to open a mini-application [@CarDrivingSimulatorBot](https://t.me/CarDrivingSimulatorBot)

## Technologies used

<div style="display: flex; flex-wrap: wrap; gap: 20px;">

<div style="flex: 1; min-width: 100px;">

### Frontend
- **Angular 18**
- **Angular Material**
- **Three.js / Cannon.js**
- **3ds Max 2023**
- **REST API**
- **Karma + Jasmine**
- **GitHub Actions / GitHub Pages**

</div>

<div style="flex: 1; min-width: 100px;">

### Backend
- **Node.js + Express**
- **PostgreSQL** 
- **JWT / bcrypt / dotenv**
- **Telegraf.js** 
- **Render.com**
- **Postman**

</div>

</div>

## Installation and launch

### **Preparation**
Make sure you have installed:
- [Node.js 18+](https://nodejs.org/)
- [Angular CLI](https://angular.dev/tools/cli)

`npm install -g @angular/cli`

### **Install dependencies**
Clone the repository and install all dependencies:
`npm install`

### **Run the application (Frontend)**
Start the local development server: `npm start`

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### **Run the backend server and Telegram bot**
The backend (Node.js + Express) and Telegram bot are launched together via:
`npm run start-bot`

This starts:
- REST API server (for handling client requests and database operations)
- Telegram bot (built with Telegraf.js)

By default, the backend listens on port 3000, and the bot connects to the Telegram API using your credentials.

Make sure you have a valid `.env` file in the project root containing:
```bash 
BOT_TOKEN=your_telegram_bot_token
NODE_ENV=DEV_or_PROD
BASE_URL=your_server_url
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=your_database_host
DB_NAME=your_database_name
DB_PORT=5432
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1d
```

## **Build the project**
To build the project for production (used for GitHub Pages deployment):
`npm run build`

This command:
- builds the Angular application
- adds a 404.html fallback page
- copies compiled files to the docs/ directory for deployment

### **Run tests**
Interactive mode (opens browser):
`npm test`

Headless mode (used in CI/CD pipelines):
`npm run test-headless`

## **CI/CD**

The project uses **GitHub Actions** for continuous integration and deployment to **GitHub Pages**.  
Every push to the `main` branch automatically triggers:
1. Running unit tests *(Karma + Jasmine)*
2. Building the Angular project via **@angular/cli**
3. Deploying the compiled build to the **gh-pages** branch

Workflow file: `.github/workflows/deploy.yml` 

Status: ![Build Status](https://github.com/AlexGervas/car-simulator/actions/workflows/deploy.yml/badge.svg)


## **License**

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
