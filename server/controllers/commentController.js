import prisma from "../config/prisma.js";

// Add Comment
export const addComment = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { content, taskId } = req.body;

        if (!taskId || !content?.trim()) {
            return res.status(400).json({ message: "taskId and content are required" });
        }

        // check if task exists
        const task = await prisma.task.findUnique({
            where: {
                id: taskId,
            },
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // check if user is a member/lead of the project or workspace admin
        const project = await prisma.project.findUnique({
            where: {
                id: task.projectId,
            },
            include: {
                members: true,
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

        const isMember = project.members.some((m) => m.userId === userId);
        const isTeamLead = project.team_lead === userId;
        const isWorkspaceAdmin = project.workspace?.members?.some(
            (m) => m.userId === userId && m.role === "ADMIN"
        );

        if (!isMember && !isTeamLead && !isWorkspaceAdmin) {
            return res.status(403).json({ message: "You are not authorized to comment on this project" });
        }

        const comment = await prisma.comment.create({
            data: {
                taskId,
                content: content.trim(),
                userId,
            },
            include: {
                user: true,
            },
        });

        return res.json({ comment, message: "Comment added successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};

// Get comments for a task
export const getTaskComments = async (req, res) => {
    try {
        const taskId = req.params.taskId || req.params.id;

        if (!taskId) {
            return res.status(400).json({ message: "Task ID is required" });
        }

        const comments = await prisma.comment.findMany({
            where: {
                taskId,
            },
            include: {
                user: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return res.json({ comments, message: "Comments fetched successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};
