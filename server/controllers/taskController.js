import prisma from "../config/prisma.js";
import { inngest } from "../inngest/index.js";
import { clerkClient } from "@clerk/express";
import sendEmail from "../config/nodemailer.js";
import { clearWorkspaceCache } from "./workspaceController.js";

// Helper to send task assignment email
const sendTaskEmail = async (task, origin) => {
    try {
        if (!task.assignee?.email) return;
        const taskLink = origin ? `${origin}/taskDetails?projectId=${task.projectId}&taskId=${task.id}` : "#";
        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assignment in ${task.project?.name || "Project"}`,
            body: `
                <div style="max-width: 600px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
                    <h2 style="color: #111827;">Hi ${task.assignee.name || "there"}, 👋</h2>
                    <p style="font-size: 16px; margin: 12px 0;">
                        You've been assigned a new task in <strong>${task.project?.name || "Project"}</strong>:
                    </p>
                    <p style="font-size: 18px; font-weight: bold; color: #2563eb; margin: 8px 0;">
                        ${task.title}
                    </p>
                    <div style="border: 1px solid #e5e7eb; background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <p style="margin: 6px 0;">
                            <strong>Description:</strong> ${task.description || "No description provided."}
                        </p>
                        <p style="margin: 6px 0;">
                            <strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}
                        </p>
                        <p style="margin: 6px 0;">
                            <strong>Priority:</strong> ${task.priority}
                        </p>
                    </div>
                    <div style="margin: 24px 0;">
                        <a href="${taskLink}" style="background-color: #2563eb; padding: 12px 24px; border-radius: 6px; color: #ffffff; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block;">
                            View Task
                        </a>
                    </div>
                    <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                        Please make sure to review and complete it before the due date.
                    </p>
                </div>
            `,
        });
    } catch (err) {
        console.error("Direct email send error:", err?.message || err);
    }
};

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

        let finalAssigneeId = (assigneeId && typeof assigneeId === "string" && assigneeId.trim()) ? assigneeId.trim() : userId;

        if (finalAssigneeId !== userId) {
            const isMember = project.members.some(
                (m) => m.userId === finalAssigneeId || m.user?.id === finalAssigneeId
            );
            if (!isMember && project.team_lead !== finalAssigneeId) {
                return res.status(400).json({ message: "Assigned user is not a member of this project" });
            }
        }

        // Ensure assignee exists in User table
        const assigneeUser = await prisma.user.findUnique({
            where: { id: finalAssigneeId },
        });
        if (!assigneeUser) {
            try {
                const clerkAssignee = await clerkClient.users.getUser(finalAssigneeId);
                if (clerkAssignee) {
                    await prisma.user.upsert({
                        where: { id: finalAssigneeId },
                        update: {},
                        create: {
                            id: finalAssigneeId,
                            email: clerkAssignee.emailAddresses?.[0]?.emailAddress || "",
                            name: [clerkAssignee.firstName, clerkAssignee.lastName].filter(Boolean).join(" ") || "User",
                            image: clerkAssignee.imageUrl || "",
                        },
                    });
                } else {
                    finalAssigneeId = userId;
                }
            } catch (e) {
                finalAssigneeId = userId;
            }
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                assigneeId: finalAssigneeId,
                title: title.trim(),
                description: description ? description.trim() : null,
                type: type || "TASK",
                priority: priority || "MEDIUM",
                status: status || "TODO",
                due_date: due_date ? new Date(due_date) : new Date(),
            },
            include: {
                assignee: true,
                project: true,
                comments: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        // Send email notification directly to assignee
        sendTaskEmail(task, req.headers.origin);

        try {
            await inngest.send({
                name: "app/task.assigned",
                data: {
                    taskId: task.id,
                    origin: req.headers.origin,
                },
            });
        } catch (inngestErr) {
            console.error("Inngest send error:", inngestErr?.message);
        }

        clearWorkspaceCache();
        return res.json({ task, taskWithAssigne: task, message: "Task created successfully" });
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
                project: true,
                comments: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        // Notify new assignee if assignee changed
        if (req.body.assigneeId && req.body.assigneeId !== task.assigneeId) {
            sendTaskEmail(updatedTask, req.headers.origin);
        }

        clearWorkspaceCache();
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
        const taskIds = req.body.taskIds || req.body.tasksIds || [];

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

        clearWorkspaceCache();
        return res.json({ message: "Task(s) deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};
