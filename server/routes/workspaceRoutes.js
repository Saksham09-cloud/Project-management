import express from "express";
import { getUserWorkspaces, Addmember } from "../controllers/workspaceController.js";

const workspaceRouter = express.Router();

workspaceRouter.get('/', getUserWorkspaces)
workspaceRouter.post('/add-member', Addmember)

export default workspaceRouter;