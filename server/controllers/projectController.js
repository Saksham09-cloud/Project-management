import prisma from "../config/prisma.js";

// Create Project
export const createProject = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const {
            workspaceId,
            description,
            name,
            status,
            start_date,
            end_date,
            team_members,
            team_lead,
            progress,
            priority,
        } = req.body;

        // check if workspace exists
        const workspace = await prisma.workspace.findUnique({
            where: {
                id: workspaceId,
            },
            include: { members: { include: { user: true } } },
        });

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // check if user has admin role in workspace
        const isAdmin = workspace.members.some(
            (member) => (member.userId === userId || member.user?.id === userId) && member.role === "ADMIN"
        );

        if (!isAdmin) {
            return res.status(403).json({ message: "You are not an admin of this workspace" });
        }

        // get Team lead using email if provided, fallback to current user
        let teamLeadId = userId;
        if (team_lead) {
            const leadUser = await prisma.user.findUnique({
                where: {
                    email: team_lead,
                },
                select: { id: true },
            });
            if (leadUser) {
                teamLeadId = leadUser.id;
            }
        }

        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status: status || "ACTIVE",
                priority: priority || "MEDIUM",
                progress: progress ? parseInt(progress, 10) : 0,
                team_lead: teamLeadId,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            },
        });

        // add members to project if they are in workspace
        if (team_members?.length > 0) {
            const membersToAdd = [];
            workspace.members.forEach((member) => {
                if (team_members.includes(member.user.email)) {
                    membersToAdd.push(member.user.id);
                }
            });

            if (membersToAdd.length > 0) {
                await prisma.projectMember.createMany({
                    data: membersToAdd.map((memberId) => ({
                        projectId: project.id,
                        userId: memberId,
                    })),
                    skipDuplicates: true,
                });
            }
        }

        const projectWithMembers = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
                members: { include: { user: true } },
                tasks: {
                    include: {
                        assignee: true,
                        comments: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
                owner: true,
            },
        });

        return res.json({ project: projectWithMembers, message: "Project created successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};

// update project
export const updateProject = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const id = req.params.id || req.params.projectId || req.body.id;
        const {
            workspaceId,
            description,
            name,
            status,
            start_date,
            end_date,
            team_lead,
            progress,
            priority,
        } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        // fetch existing project
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                workspace: {
                    include: { members: true },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // check if user is admin of workspace or project team lead
        const isAdmin = project.workspace.members.some(
            (member) => member.userId === userId && member.role === "ADMIN"
        );
        const isTeamLead = project.team_lead === userId;

        if (!isAdmin && !isTeamLead) {
            return res.status(403).json({ message: "You are not authorized to update this project" });
        }

        let teamLeadId = undefined;
        if (team_lead) {
            const leadUser = await prisma.user.findUnique({
                where: { email: team_lead },
                select: { id: true },
            });
            if (leadUser) {
                teamLeadId = leadUser.id;
            }
        }

        const updateData = {};
        if (workspaceId) updateData.workspaceId = workspaceId;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (progress !== undefined) updateData.progress = parseInt(progress, 10);
        if (teamLeadId !== undefined) updateData.team_lead = teamLeadId;
        if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null;
        if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;

        const updatedProject = await prisma.project.update({
            where: { id },
            data: updateData,
            include: {
                members: { include: { user: true } },
                tasks: {
                    include: {
                        assignee: true,
                        comments: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
                owner: true,
            },
        });

        return res.json({ project: updatedProject, message: "Project updated successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};

// add member to project
export const addMember = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const projectId = req.params.projectId || req.params.id || req.body.projectId;
        const { email } = req.body;

        if (!projectId || !email) {
            return res.status(400).json({ message: "Project ID and email are required" });
        }

        // check if project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: { include: { user: true } },
                workspace: { include: { members: true } },
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const isAdmin = project.workspace?.members?.some(
            (member) => member.userId === userId && member.role === "ADMIN"
        );
        const isTeamLead = project.team_lead === userId;

        if (!isAdmin && !isTeamLead) {
            return res.status(403).json({ message: "You are not authorized to add members to this project" });
        }

        // check if user exists
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // check if user is already a member
        const existingMember = project.members.find(
            (member) => member.userId === user.id || member.user?.email === email
        );

        if (existingMember) {
            return res.status(400).json({ message: "User is already a member of this project" });
        }

        const member = await prisma.projectMember.create({
            data: {
                userId: user.id,
                projectId,
            },
            include: {
                user: true,
            },
        });

        return res.json({ member, message: "Member added successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message || error.code || "Internal server error" });
    }
};

