import prisma from '../config/prisma.js'


// get all workspace user

export const getUserWorkspaces = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const workspaces = await prisma.workspace.findMany({
            where: {
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: true,
                    }
                },
                projects: {
                    include: {
                        tasks: {
                            include: {
                                assignee: true, comments: {
                                    include: {
                                        user: true
                                    }
                                }

                            }
                        },
                        members: { include: { user: true } }
                    }

                },
                owner: true
            }
        });
        res.json({ workspaces })


    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: error.code || error.message || 'Internal server error' });
    }
}

// Add meber to workspace

export const Addmember = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { email, role, workspaceId, message } = req.body;

        // check if user exists
        const user = await prisma.user.findUnique({
            where: { email: email }
        })
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        if (!workspaceId || !role) {
            return res.status(400).json({ message: 'workspaceId and role are required' })
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' })
        }
        // fetch workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: true
            }
        })
        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' })
        }
        // check creator has admin role

        if (!workspace.members.find((member) => member.userId === user.id && member.role === 'ADMIN')) {
            return res.status(403).json({ message: 'You are not authorized to add members to this workspace' })
        }
        // check if user is already a member

        const existingMember = workspace.members.find((member) => member.userId === user.id);
        if (existingMember) {
            return res.status(400).json({ message: 'User is already a member of this workspace' })
        }



        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role,
                message
            }
        })
        res.json({ success: true, member })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: error.code || error.message || 'Internal server error' });
    }
}
