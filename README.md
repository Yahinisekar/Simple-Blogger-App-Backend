## Simple Blogger App - Backend

- The Simple Blogger App backend is a Node.js application that provides APIs for user authentication, blog management, commenting, and notifications.

## Features
- `User Authentication`: APIs for user signup, login, and logout
-` Blog Management`: APIs for creating, reading, updating, and deleting blog posts
- `Commenting`: APIs for leaving comments on blog posts
- `Notifications`: APIs for sending notifications to users when there are new comments or replies

## Technologies Used
+ `Node.js`: JavaScript runtime for building server-side applications
+ `Express.js`: Web application framework for Node.js
+ `MongoDB`: NoSQL database for storing blog posts, comments, and user information
+ `JSON Web Tokens (JWT)`: For securely transmitting information between parties
+ `Mongoose`: MongoDB object modeling tool for Node.js
+ `AWS S3`:for storing images of the blog posts
  
## Setup

- Clone the Repository
  
## Install Dependencies:
- Navigate to the project directory: cd simple-blogger-app
- Install backend dependencies: cd backend && npm install
## Set Up Environment Variables:

- Create a .env file in the backend directory
  
- Define the following environment variables:
```

PORT=5000
MONGODB_URI=<your-mongodb-uri>

ACCESS_KEY=<your-access-key>

AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
JWT_SECRET=<your-jwt-secret>

```
## Start the Development Server:

- Start the backend server: npm run dev

## Access the APIs:
Use tools like Postman to make requests to the backend APIs.

The API endpoints can be found in the `Router` folder of the backend directory.
