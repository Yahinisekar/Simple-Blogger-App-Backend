import express from 'express';
import dotenv from 'dotenv';
// import mongoose from 'mongoose';
import cors from 'cors';
import connectDB from './Database/config.js';
import router from './Router/routes.js';

dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT;
// mongoose.connect(process.env.MONGODB_URI, {
//     autoIndex: true
// })
    // console.log(process.env.MONGODB_URI,"MongoDB connected");

// console.log(db);
connectDB();

app.use(cors({
    origin: "*",
  })
);

app.use('/',router)

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
})