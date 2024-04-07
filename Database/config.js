import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    console.log("connection string", process.env.MONGODB_URI);
    const connection = await mongoose.connect(
      process.env.MONGODB_URI
    );
    console.log("MongoDB connected");
    return connection;
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;
