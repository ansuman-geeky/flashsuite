# FlashPath Tool

## Project Structure

```text
flashpath/
├── models/
│   └── database.js
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── styles.css
│   └── main.js
├── routes/
│   └── api.js
├── server.js
├── seeder.js
├── package.json
└── README.md
```

## Setup Instructions

Follow these step-by-step instructions to set up and run the project locally.

### Prerequisites
Ensure you have the following installed on your system:
- **[Node.js](https://nodejs.org/)** (v14 or higher recommended)
- **npm** (comes bundled with Node.js)

### Step 1: Initialize the Project
If the `package.json` file is missing, you'll need to initialize the Node.js project first. Open your terminal in the project root directory and run:
```bash
npm init -y
```

### Step 2: Install Dependencies
Install the required packages. Based on standard Node.js/Express setups, you will typically need Express. You may also need additional packages depending on your database choice (e.g., `sqlite3` or `mongoose`).
```bash
npm install express
```
*(Optional dependencies based on common usage: `npm install cors dotenv sqlite3`)*

### Step 3: Seed the Database
If your project includes initial data or database schemas, use the seeder script to populate the database before running the application:
```bash
node seeder.js
```

### Step 4: Start the Server
Start the backend Express server:
```bash
node server.js
```
*Tip: For a better development experience, use `nodemon` to automatically restart your server when files change:*
```bash
npm install -g nodemon
nodemon server.js
```

### Step 5: Access the Application
Once the server is running, open your web browser and navigate to the application. Assuming the server runs on port 3000:
- **Main App**: [http://localhost:3000](http://localhost:3000) (Serves `index.html`)
- **Admin Panel**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## Directory Overview

- **`models/`**: Contains database configuration and schemas (`database.js`).
- **`public/`**: Stores static frontend assets (HTML, CSS, Client-side JavaScript). These are typically served directly by Express.
- **`routes/`**: Contains the API route definitions (`api.js`) for separating backend logic.
- **`server.js`**: The main entry point for the Node.js backend.
- **`seeder.js`**: A utility script used to insert initial mock or default data into the database.