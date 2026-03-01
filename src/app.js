import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))


app.use(express.json({
    limit: "50kb"
}))

app.use(express.urlencoded({
    extended: true,
    limit: "50kb"
}))

app.use(express.static("public"))
app.use(cookieParser())

//  routes imports
import {userRouter, videoRouter, commentRouter, 
    likeRouter, playlistRouter, subscriptionRouter, 
    tweetRouter
} from "../src/routes/index.route.js"

// route declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/tweets", tweetRouter)

export { app };