import prisma from "../config/prisma.js";
import { inngest } from "../inngest/index.js";

// Create Task
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { projectId, title, description, type, status, priority, assigneeId, due_date } = req.body;

        if (!projectId || !title) {
            return res.status(400).json({ message: "projectId and title are required" });
        }

        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
            },
            include: {
                members: {
                    include: {
                        user: true,
                    },
                },
                workspace: {
                    include: {
                        members: true,
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const isTeamLead = project.team_lead === userId;
        const isWorkspaceAdmin = project.workspace?.members?.some(
            (m) => m.userId === userId && m.role === "ADMIN"
        );

        if (!isTeamLead && !isWorkspaceAdmin) {
            return res.status(403).json({ message: "You are not authorized to create tasks in this project" });
        }

        if (assigneeId) {
            const isMember = project.members.some(
                (m) => m.userId === assigneeId || m.user?.id === assigneeId
            );
            if (!isMember && project.team_lead !== assigneeId) {
                return res.status(400).json({ message: "Assigned user is not a member of this project" });
            }
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                type: type || "TASK",
                priority: priority || "MEDIUM",
                status: status || "TODO",
                type,
                due_date: due_date ? new Date(due_date) : new Date(),
            }
        })

        const taskWithAssigne = await prisma.task.findUnique({
            where: {
                id: task.id,
            },
            include: {
                assignee: true,
            },
        })

        await inngest.send({
            name: "app/task.assigned",
            data: {
                taskId: task.id,
                origin: req.headers.origin,
            },
        });

        return res.json({ taskWithAssigne, message: "Task created successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};

// Update Task
export const updateTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const id = req.params.id || req.body.id;

        if (!id) {
            return res.status(400).json({ message: "Task ID is required" });
        }

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        members: {
                            include: {
                                user: true,
                            },
                        },
                        workspace: {
                            include: {
                                members: true,
                            },
                        },
                    },
                },
            },
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const isTeamLead = task.project.team_lead === userId;
        const isAssignee = task.assigneeId === userId;
        const isWorkspaceAdmin = task.project.workspace?.members?.some(
            (m) => m.userId === userId && m.role === "ADMIN"
        );

        if (!isTeamLead && !isAssignee && !isWorkspaceAdmin) {
            return res.status(403).json({ message: "You are not authorized to update this task" });
        }

        const updateData = {};
        if (req.body.title !== undefined) updateData.title = req.body.title;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.type !== undefined) updateData.type = req.body.type;
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.priority !== undefined) updateData.priority = req.body.priority;
        if (req.body.assigneeId !== undefined) updateData.assigneeId = req.body.assigneeId;
        if (req.body.due_date !== undefined) updateData.due_date = new Date(req.body.due_date);

        const updatedTask = await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                assignee: true,
                comments: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        return res.json({ task: updatedTask, message: "Task updated successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};

// Delete Task
export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { taskIds } = req.body.tasksIds || req.body.taskIds || (req.params.id ? [req.params.id] : []);

        if (!taskIds || taskIds.length === 0) {
            return res.status(400).json({ message: "No task IDs provided" });
        }

        const tasks = await prisma.task.findMany({
            where: {
                id: { in: taskIds },
            },
            include: {
                project: {
                    include: {
                        workspace: {
                            include: {
                                members: true,
                            },
                        },
                    },
                },
            },
        });

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Tasks not found" });
        }

        // verify authorization for all project tasks
        const unauthorized = tasks.some((t) => {
            const isTeamLead = t.project.team_lead === userId;
            const isWorkspaceAdmin = t.project.workspace?.members?.some(
                (m) => m.userId === userId && m.role === "ADMIN"
            );
            return !isTeamLead && !isWorkspaceAdmin;
        });

        if (unauthorized) {
            return res.status(403).json({ message: "You are not authorized to delete some or all of these tasks" });
        }

        await prisma.task.deleteMany({
            where: {
                id: { in: taskIds },
            },
        });

        return res.json({ message: "Task(s) deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};
