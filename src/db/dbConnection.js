import { Db } from "mongodb";
import mongoose from "mongoose";

const DbName = process.env.DB_NAME || "course_management";
async function connectDb(){
    try {
        const connectionInstance= await mongoose.connect(`${process.env.MONGO_URI}/${DbName}`);
    
        console.log(`\nMongoDB connected , DB Host: ${connectionInstance.connection.host}`);

    } catch (error) {
        console.log(`${process.env.MONGO_URI}/`,DbName)
        console.log("MongoDb connection failed =>>> ",error.message);

        process.exit(1);
    }
}

export default connectDb;