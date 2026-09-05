import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Trash } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace, deleteWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganizationList, useOrganization, useAuth } from "@clerk/react";
import toast from "react-hot-toast";
import api from "../configs/api";

function WorkspaceDropdown() {

    const { setActive, userMemberships, isLoaded } = useOrganizationList({ userMemberships: true });
    const { organization, isLoaded: isOrgLoaded } = useOrganization();
    const { openCreateOrganization } = useClerk();
    const { getToken } = useAuth();

    const { workspaces } = useSelector((state) => state.workspace);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onSelectWorkspace = (organizationId) => {
        if (organization?.id !== organizationId && setActive) {
            setActive({ organization: organizationId });
        }
        dispatch(setCurrentWorkspace(organizationId));
        setIsOpen(false);
        navigate('/');
    };

    const handleDeleteWorkspace = async (e, workspaceId) => {
        e.stopPropagation();
        if (!window.confirm("Delete this workspace? All projects and tasks inside it will be permanently deleted.")) return;
        try {
            const token = await getToken();
            toast.loading("Deleting workspace...");
            await api.delete(`/api/workspace/${workspaceId}`, { headers: { Authorization: `Bearer ${token}` } });
            dispatch(deleteWorkspace(workspaceId));
            if (userMemberships?.revalidate) {
                await userMemberships.revalidate();
            }
            toast.dismiss();
            toast.success("Workspace deleted");
            // If it was the active workspace, switch to another
            if (currentWorkspace?.id === workspaceId) {
                const remaining = (userMemberships?.data || [])
                    .map((m) => m.organization)
                    .filter((w) => w.id !== workspaceId);
                if (remaining.length > 0) {
                    onSelectWorkspace(remaining[0].id);
                } else {
                    dispatch(setCurrentWorkspace(null));
                    navigate('/');
                }
            }
        } catch (error) {
            toast.dismiss();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (
            currentWorkspace?.id &&
            isLoaded &&
            isOrgLoaded &&
            setActive &&
            organization?.id !== currentWorkspace.id
        ) {
            setActive({ organization: currentWorkspace.id });
        }
    }, [currentWorkspace?.id, isLoaded, isOrgLoaded, setActive, organization?.id]);

    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                <div className="flex items-center gap-3">
                    <img src={currentWorkspace?.image_url || currentWorkspace?.imageUrl} alt={currentWorkspace?.name} className="w-8 h-8 rounded shadow" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {currentWorkspace?.name || "Select Workspace"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        {userMemberships?.data?.map(({ organization }) => (
                            <div key={organization.id} onClick={() => onSelectWorkspace(organization.id)} className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800 group" >
                                <img src={organization.imageUrl || organization.image_url} alt={organization.name} className="w-6 h-6 rounded" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                        {organization.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                        {organization.membersCount || 0} members
                                    </p>
                                </div>
                                {currentWorkspace?.id === organization.id && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                                <button
                                    onClick={(e) => handleDeleteWorkspace(e, organization.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 flex-shrink-0"
                                    title="Delete workspace"
                                >
                                    <Trash className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    <div onClick={() => { openCreateOrganization(); setIsOpen(false); }}
                        className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800" >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                            <Plus className="w-4 h-4" /> Create Workspace
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceDropdown;
