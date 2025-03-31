import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB= async() =>{
    try {
        const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n moongoDB Connected!! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB Failed to CONNECT", error);
        process.exit(1);
    }
}

export default connectDB;