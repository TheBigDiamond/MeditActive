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

First and foremost, you need to have mySQL installed. Then, just import the provided migration file in the sqldump folder and start the server and make sure the server is running at the 3001 port.

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/TheBigDiamond/MeditActive.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Run the server
   ```js
   node app.js
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

Now you're ready to start using the app.

Open a new terminal and start inputting any of these commands:
   ```sh
   (get all users)
   curl http://localhost:3001/api/users

   (get user by id)
   curl http://localhost:3001/api/users/(id)

   (create a new user)
   curl -X POST http://localhost:3001/api/users -H "Content-Type: application/json" -d "{\"firstName\":\"(your first name\", \"lastName\":\"(your last name)\", \"email\":\"(your email)\", \"obiettivo\":\"(your goal\", \"dataInizio\":\"(beginning date\", \"dataFine\":\"(finish date)\"}"

   (update a user completely)
   curl -X PUT http://localhost:3001/api/users/(id) -H "Content-Type: application/json" -d "{\"firstName\":\"(updated first name)\", \"lastName\":\"(updated last name)\", \"email\":\"(updated email)\", \"obiettivo\":\"(updated goal)\", \"dataInizio\":\"(updated beginning date\", \"dataFine\":\"(updated finish date\"}"

   (update a user partially)
   curl -X PATCH http://localhost:3001/api/users/(id) -H "Content-Type: application/json" -d "{\"(your selected field\":\"(your updated field)\"}"

   (delete a user)
   curl -X DELETE http://localhost:3001/api/users/(id)

   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
[Node.JS]: https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white
[NodeJS-url]: https://nodejs.org
