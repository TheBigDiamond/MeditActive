<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/TheBigDiamond/MeditActive">
    <img src="assets/logo.png" alt="Logo" width="120" height="120">
  </a>

<h3 align="center">Meditactive</h3>

  <p align="center">
    Bring meditation in your daily life and better yourself.
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

This app is specifically designed to make your life feel less stressful by helping you introduce meditation in your life. Whether it's for merely 5 minutes or 1 hour of your time, we guarantee it will improve your life quality overall.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Node][Node.JS]][NodeJS-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running follow these simple example steps.

### Prerequisites

First and foremost, you need to have mySQL installed. Then, you have to clone the repo on your machine, with the following command:
   ```sh
   git clone https://github.com/TheBigDiamond/MeditActive.git
   ```
Then, after making sure your SQL server is running, open the IDE terminal and run this command:
   ```sh
   node database\init-db.js
   ```
This will create the schema of the application in your db.

Right after creating the schema, you can check if everything went well with this command:
   ```sh
   node database\db-check.js
   ```
The terminal should tell you all the tables created and all the pre existing data inside of them, if there are any.

### Installation

1. Install NPM packages
   ```sh
   npm install
   ```
2. Run the server
   ```js
   node app.js
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

Now you're ready to start using the app.

Open a new terminal and start inputting any of these commands:
   ```sh
   :: Create User
curl -X POST http://localhost:3001/api/users -H "Content-Type: application/json" -d "{\"firstName\":\"(your first name)\",\"lastName\":\"/your last name)\",\"email\":\"(your email)\",\"objectives\":[(one or multiple objectives, simply check the related table)],\"intervals\":[(one of the intervals provided, simply check the related table)]}"

:: Get All Users
curl http://localhost:3001/api/users

:: Get User by ID
curl http://localhost:3001/api/users/:id

:: Update User
curl -X PUT http://localhost:3001/api/users/:id -H "Content-Type: application/json" -d "{\"firstName\":\"(your first name\",\"lastName\":\"(your last name)\",\"email\":\"john.smith@example.com\",\"objectives\":[(one or multiple objectives, simply check the related table)],\"intervals\":[(one of the intervals provided, simply check the related table)]}"

:: Delete User
curl -X DELETE http://localhost:3001/api/users/:id

:: Get All Objectives
curl http://localhost:3001/api/objectives

:: Get All Interval Types
curl http://localhost:3001/api/interval-types

:: Filter Users by Date Range
curl "http://localhost:3001/api/users?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD"

   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
[Node.JS]: https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white
[NodeJS-url]: https://nodejs.org
