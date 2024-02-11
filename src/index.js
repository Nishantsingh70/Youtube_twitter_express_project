/*
npm init
npm install 
npm install -D nodemon
npm install -D prettier 
npm install express mongoose dotenv
npm install cookie-parser cors
npm install mongoose-aggregate-paginate-v2 => for creating aggregation pipeline 
npm install bcrypt  => This library is helpful to encrypt the password based on cryptography.
npm install jsonwebtoken => This library is for tokens based on cryptography.
npm install cloudinary => for storing files, PDFs and videos.
npm install multer => help to deal with files, PDFs and videos upload. 
                    Multer is a node.js middleware for handling multipart/form-data, 
                    which is primarily used for uploading files.
  
Important: AccessToken is generally short lived but RefreshToken is long lived.

*/


// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'
dotenv.config({
    path: './.env'
})



connectDB()
.then(() => {
    app.on("errror", (error) => {
        console.log("ERRR: ", error);
        throw error
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})










/*
Approach1:

import mongoose from "mongoose"
import DB_NAME from "./constants.js"
import express from "express"

const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/