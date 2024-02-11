/*
To use cookie-parser in an Express project, it is typically required as middleware. This middleware 
can be utilized for tasks such as setting, retrieving, and deleting cookies during the processing of 
HTTP requests.
*/

import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// middlewares => for setting the configurations.

app.use(express.json({limit: "16kb"}))

// we use extended because of nested json etc.
app.use(express.urlencoded({extended: true, limit: "16kb"})) 

// If we want to store any PDF and file in server then we use this middleware for that purpose.
app.use(express.static("public")) 

/*
This middleware can be utilized for tasks such as setting, retrieving, and deleting cookies during 
the processing of HTTP requests.
*/
app.use(cookieParser())

//routes import
import userRouter from './routes/user.routes.js'
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

// http://localhost:8000/api/v1/users/register

export { app }