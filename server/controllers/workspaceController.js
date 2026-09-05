import prisma from '../config/prisma.js'
import { clerkClient } from '@clerk/express'

// In-memory cache for ultra-fast workspace responses
const workspaceCache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache
const lastSyncMap = new Map();
const SYNC_COOLDOWN_MS = 3 * 60 * 1000; // Sync with Clerk at most once every 3 minutes

export const clearWorkspaceCache = (userId) => {
    if (userId) {
        workspaceCache.delete(userId);
    } else {
        workspaceCache.clear();
    }
};

const queryWorkspacesFromDb = async (userId) => {
    return prisma.workspace.findMany({
        where: {
            members: {
                some: {
                    userId: userId,
                },
            },
        },
        include: {
            members: {
                include: {
                    user: true,
                },
            },
            projects: {
                include: {
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
                    members: { include: { user: true } },
                },
            },
            owner: true,
        },
    });
};

const syncUserWorkspacesFromClerk = async (userId) => {
    try {
        const clerkUser = await clerkClient.users.getUser(userId);
        if (!clerkUser) return;

        await prisma.user.upsert({
            where: { id: userId },
            update: {
                email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
                name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "User",
                image: clerkUser.imageUrl || "",
            },
            create: {
                id: userId,
                email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
                name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "User",
                image: clerkUser.imageUrl || "",
            },
        });

        const memberships = await clerkClient.users.getOrganizationMembershipList({ userId });
        if (!memberships?.data?.length) return;

        await Promise.all(
            memberships.data.map(async (m) => {
                const org = m.organization;
                let ownerId = org.createdBy || userId;

                if (ownerId !== userId) {
                    try {
                        const clerkOwner = await clerkClient.users.getUser(ownerId);
                        if (clerkOwner) {
                            await prisma.user.upsert({
                                where: { id: ownerId },
                                update: {},
                                create: {
                                    id: ownerId,
                                    email: clerkOwner.emailAddresses?.[0]?.emailAddress || "",
                                    name: [clerkOwner.firstName, clerkOwner.lastName].filter(Boolean).join(" ") || "User",
                                    image: clerkOwner.imageUrl || "",
                                },
                            });
                        } else {
                            ownerId = userId;
                        }
                    } catch (err) {
                        ownerId = userId;
                    }
                }

                await prisma.workspace.upsert({
                    where: { id: org.id },
                    update: {
                        name: org.name,
                        slug: org.slug || org.id,
                        image_url: org.imageUrl || "",
                    },
                    create: {
                        id: org.id,
                        name: org.name,
                        slug: org.slug || org.id,
                        ownerId,
                        image_url: org.imageUrl || "",
                    },
                });

                await prisma.workspaceMember.upsert({
                    where: { userId_workspaceId: { userId, workspaceId: org.id } },
                    update: {
                        role: m.role === "admin" || m.role === "org:admin" ? "ADMIN" : "MEMBER",
                    },
                    create: {
                        userId,
                        workspaceId: org.id,
                        role: m.role === "admin" || m.role === "org:admin" ? "ADMIN" : "MEMBER",
                    },
                });
            })
        );
    } catch (syncError) {
        console.error("Clerk auto-sync error in getUserWorkspaces:", syncError?.message || syncError);
    }
};

// get all workspace user
export const getUserWorkspaces = async (req, res) => {
    try {
        const { userId } = await req.auth();
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check memory cache first (instant response in < 5ms)
        const cached = workspaceCache.get(userId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return res.json({ workspaces: cached.workspaces });
        }

        // Query database
        let workspaces = await queryWorkspacesFromDb(userId);

        // If no workspaces found in DB (new user), sync from Clerk and re-query
        if (workspaces.length === 0) {
            await syncUserWorkspacesFromClerk(userId);
            lastSyncMap.set(userId, Date.now());
            workspaces = await queryWorkspacesFromDb(userId);
        } else {
            // If cooldown expired, trigger sync in background without blocking response
            const lastSync = lastSyncMap.get(userId) || 0;
            if (Date.now() - lastSync > SYNC_COOLDOWN_MS) {
                lastSyncMap.set(userId, Date.now());
                syncUserWorkspacesFromClerk(userId).catch((err) =>
                    console.error("Background sync error:", err?.message)
                );
            }
        }

        // Cache the fresh result
        workspaceCache.set(userId, { workspaces, timestamp: Date.now() });

        return res.json({ workspaces });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.code || error.message || "Internal server error" });
    }
};


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

        if (!workspace.members.find((member) => member.userId === userId && member.role === 'ADMIN')) {
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
        clearWorkspaceCache(user.id);
        clearWorkspaceCache(userId);
        res.json({ success: true, member })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.code || error.message || 'Internal server error' });
    }
}

// Delete workspace
export const deleteWorkspace = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Workspace ID is required' });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id },
            include: { members: true }
        });

        // Check authorization if workspace exists in DB
        if (workspace) {
            const isOwner = workspace.ownerId === userId;
            const isAdmin = workspace.members.some((m) => m.userId === userId && m.role === 'ADMIN');

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: 'You are not authorized to delete this workspace' });
            }

            try {
                await prisma.workspace.delete({ where: { id } });
                console.log("Deleted workspace from Prisma:", id);
            } catch (prismaErr) {
                console.warn("Prisma workspace delete warning:", prismaErr?.message);
            }
        }

        // Always delete from Clerk organization so it doesn't persist in Clerk
        try {
            await clerkClient.organizations.deleteOrganization(id);
            console.log("Deleted organization from Clerk:", id);
        } catch (clerkErr) {
            console.warn("Clerk deleteOrganization warning:", clerkErr?.message);
        }

        clearWorkspaceCache(userId);
        return res.json({ success: true, message: 'Workspace deleted successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.code || error.message || 'Internal server error' });
    }
}

