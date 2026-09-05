import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { Loader2Icon } from 'lucide-react'

import { useUser, SignIn, useAuth, CreateOrganization, useOrganizationList } from "@clerk/react";

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth()
    const { userMemberships } = useOrganizationList({ userMemberships: true })

    const getTokenRef = useRef(getToken)
    useEffect(() => {
        getTokenRef.current = getToken
    })

    const hasFetchedInitialRef = useRef(false)
    const lastUserIdRef = useRef(null)
    const prevOrgCountRef = useRef(null)

    // Reset initial fetch flag if user changes
    useEffect(() => {
        if (user?.id !== lastUserIdRef.current) {
            lastUserIdRef.current = user?.id
            hasFetchedInitialRef.current = false
        }
    }, [user?.id])

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Initial load and refetch of workspaces
    useEffect(() => {
        if (!isLoaded || !user?.id) return

        const currentOrgCount = userMemberships?.data?.length

        // Fetch once when user is authenticated
        if (!hasFetchedInitialRef.current) {
            hasFetchedInitialRef.current = true
            prevOrgCountRef.current = currentOrgCount
            dispatch(fetchWorkspaces({ getToken: () => getTokenRef.current() }))
            return
        }

        // Only refetch if organization count actually changed (e.g., workspace created or deleted)
        if (
            typeof currentOrgCount === 'number' &&
            typeof prevOrgCountRef.current === 'number' &&
            currentOrgCount !== prevOrgCountRef.current
        ) {
            prevOrgCountRef.current = currentOrgCount
            dispatch(fetchWorkspaces({ getToken: () => getTokenRef.current() }))
        }
    }, [user?.id, isLoaded, userMemberships?.data?.length, dispatch])

    if (!isLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn />
            </div>
        )
    }

    if (loading) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (user && workspaces.length === 0) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <CreateOrganization afterCreateOrganizationUrl="/" skipInvitationScreen />
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout
