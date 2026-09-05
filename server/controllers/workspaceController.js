import prisma from '../config/prisma.js'
import { clerkClient } from '@clerk/express'

// get all workspace user

export const getUserWorkspaces = async (req, res) => {
    try {
        const { userId } = await req.auth();
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Auto-sync user and organizations from Clerk if not already synced or on login
        try {
            const clerkUser = await clerkClient.users.getUser(userId);
            if (clerkUser) {
                await prisma.user.upsert({
                    where: { id: userId },
                    update: {
                        email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
                        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User',
                        image: clerkUser.imageUrl || '',
                    },
                    create: {
                        id: userId,
                        email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
                        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User',
                        image: clerkUser.imageUrl || '',
                    },
                });

                const memberships = await clerkClient.users.getOrganizationMembershipList({ userId });
                if (memberships?.data) {
                    for (const m of memberships.data) {
                        const org = m.organization;
                        await prisma.workspace.upsert({
                            where: { id: org.id },
                            update: {
                                name: org.name,
                                slug: org.slug || org.id,
                                image_url: org.imageUrl || '',
                            },
                            create: {
                                id: org.id,
                                name: org.name,
                                slug: org.slug || org.id,
                                ownerId: org.createdBy || userId,
                                image_url: org.imageUrl || '',
                            },
                        });

                        await prisma.workspaceMember.upsert({
                            where: {
                                userId_workspaceId: {
                                    userId: userId,
                                    workspaceId: org.id,
                                },
                            },
                            update: {
                                role: (m.role === 'admin' || m.role === 'org:admin') ? 'ADMIN' : 'MEMBER',
                            },
                            create: {
                                userId: userId,
                                workspaceId: org.id,
                                role: (m.role === 'admin' || m.role === 'org:admin') ? 'ADMIN' : 'MEMBER',
                            },
                        });
                    }
                }
            }
        } catch (syncError) {
            console.error("Clerk auto-sync error in getUserWorkspaces:", syncError);
        }

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
    catch (error) {
        console.log(error);
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
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.code || error.message || 'Internal server error' });
    }
}
