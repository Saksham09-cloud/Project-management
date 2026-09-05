import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import workspaceRouter from './routes/workspaceRoutes.js';
import { protect } from './middlewares/authmiddleware.js'
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentsRoutes.js';
const app = express();



app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.use('/api/inngest', serve({ client: inngest, functions }));

// routes
app.use("/api/workspace", protect, workspaceRouter)
app.use("/api/projects", protect, projectRouter)
app.use("/api/tasks", protect, taskRouter)
app.use("/api/comments", protect, commentRouter)


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
