import { Inngest } from "inngest";
import prisma from "../config/prisma.js"

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// inngest function to save user data to database

const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk', triggers: [{ event: 'clerk/user.created' }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.create({
            data: {
                id: data?.id,
                email: data?.email_addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,

            }
        })
    }
)

// inngest function to delete user data from database
const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk', triggers: [{ event: 'clerk/user.deleted' }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.delete({
            where: {
                id: data?.id,
            }
        })
    }
)

// inngest function to update user data from database
const syncUserUpdation = inngest.createFunction(
    { id: 'update-user-from-clerk', triggers: [{ event: 'clerk/user.updated' }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.update({
            where: {
                id: data?.id,
            },
            data: {
                email: data?.email_addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        })
    }
)


// inngest fucntion to save workspace data to database

const syncWorkspaceCreation = inngest.createFunction(
    { id: 'sync-workspace-from-clerk', triggers: [{ event: 'clerk/organization.created' }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.create({
            data: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                ownerId: data.cerated_by,
                image_url: data.image_url,

            }
        })

        // Add creator as Admin

        await prisma.workspaceMember.create({
            data: {
                userId: data.created_by,
                workspaceId: data.id,
                role: 'ADMIN',
            }
        })

    }
)

// Inngest function to update workspace data

const syncWorkspaceUpdation = inngest.createFunction(
    { id: 'update-workspace-from-clerk', triggers: [{ event: 'clerk/organization.updated' }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url,
            }
        })
    }
)

// Inngest function to delete workspace data

const syncWorkspaceDeletion = inngest.createFunction(
    { id: 'delete-workspace-from-clerk', triggers: [{ event: 'clerk/organization.deleted' }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.delete({
            where: {
                id: data.id,
            }
        })
    }
)

// ingest function to save workspace member datat to database

const syncWorkspaceMemberCreation = inngest.createFunction(
    {
        id: 'sync-workspace-member-from-clerk', triggers: [{
            event: 'clerk/organizationInvitation.accepted '
        }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspaceMember.create({
            data: {
                userId: data.user.id,
                workspaceId: data.organization.id,
                role: String(data.role_name).toUpperCase()
            }
        })

    }
)












// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation, syncWorkspaceCreation, syncWorkspaceDeletion, syncWorkspaceUpdation, syncWorkspaceMemberCreation];