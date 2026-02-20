import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";



dotenv.config({ path: "./.env" });

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERROR", error);
            throw(error);
        })
        app.listen(process.env.PORT || 3000, () => {
            console.log(`App listening on port: ${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log("MongoDB Connection Failed. Please make sure MongoDB is running.", err);
        process.exit(1);
    })



































/* // 1st method to connecting DataBase
import express from "express"
const app = express()

;(async() => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", (error) => {
            console.log("ERROR", error);
            throw(error);
        })

        app.listen(process.env.PORT, () => {
            console.log(`App listening on port: ${process.env.PORT}`)
        })
    } 
    catch (error) {
        console.log("Error", error);
        process.exit(1);
    }
})()
*/