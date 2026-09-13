import mongoose from "mongoose";

export const connectToMongodb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.log(error);
    }
};
