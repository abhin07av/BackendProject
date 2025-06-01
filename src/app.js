import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";


const app= express()

app.use(cors({
    origin: process.env.COURSE_ORIGIN,
    credentials:true,

})) // used to allow cross origin resouce sharing (server running at localhost:4000 and frontend running at 3000,
//  to send requests from different origins)

app.use(express.json({limit:"16kb"})); //used for post method
app.use(express.urlencoded({extended: true, limit: "16kb"})) // converts input from frontend to usable object (re.body)

app.use(express.static("public"))
app.use(cookieParser());


// routes import 
import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);

export {app};