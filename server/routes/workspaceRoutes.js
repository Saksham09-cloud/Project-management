import express from "express";
import { getUserWorkspaces, Addmember, deleteWorkspace } from "../controllers/workspaceController.js";

const workspaceRouter = express.Router();

workspaceRouter.get('/', getUserWorkspaces)
workspaceRouter.post('/add-member', Addmember)
workspaceRouter.delete('/:id', deleteWorkspace)

export default workspaceRouter;