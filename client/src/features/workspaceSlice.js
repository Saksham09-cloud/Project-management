import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk(
    "workspace/fetchWorkspaces",
    async ({ getToken }) => {
        try {
            const { data } = await api.get("/api/workspace", {
                headers: {
                    Authorization: `Bearer ${await getToken()}`,
                },
            });
            return data.workspaces || [];
        } catch (error) {
            console.log(error?.response?.data?.message || error.message);
            return [];
        }
    }
);

const saveToStorage = (workspaces, currentWorkspace) => {
    try {
        if (workspaces) {
            localStorage.setItem("cached_workspaces", JSON.stringify(workspaces));
        }
        if (currentWorkspace) {
            localStorage.setItem("cached_current_workspace", JSON.stringify(currentWorkspace));
            localStorage.setItem("currentWorkspaceId", currentWorkspace.id);
        }
    } catch (e) {}
};

const getCachedWorkspaces = () => {
    try {
        const item = localStorage.getItem("cached_workspaces");
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

const getCachedCurrentWorkspace = (workspaces) => {
    try {
        const currentId = localStorage.getItem("currentWorkspaceId");
        if (currentId && workspaces.length > 0) {
            const found = workspaces.find((w) => w.id === currentId);
            if (found) return found;
        }
        const item = localStorage.getItem("cached_current_workspace");
        if (item) return JSON.parse(item);
        return workspaces[0] || null;
    } catch {
        return null;
    }
};

const initialWorkspaces = getCachedWorkspaces();
const initialCurrent = getCachedCurrentWorkspace(initialWorkspaces);

const initialState = {
    workspaces: initialWorkspaces,
    currentWorkspace: initialCurrent,
    loading: initialWorkspaces.length === 0,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
            saveToStorage(state.workspaces, state.currentWorkspace);
        },
        setCurrentWorkspace: (state, action) => {
            const found = state.workspaces.find((w) => w.id === action.payload);
            state.currentWorkspace = found || null;
            saveToStorage(state.workspaces, state.currentWorkspace);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);

            // set current workspace to the new workspace
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );

            // if current workspace is updated, set it to the updated workspace
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter(
                (w) => w.id !== action.payload && w._id !== action.payload
            );
        },
        addProject: (state, action) => {
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects.push(action.payload);
            }
            // find workspace by id and add project to it
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? { ...w, projects: w.projects.concat(action.payload) }
                    : w
            );
        },
        updateProject: (state, action) => {
            const updatedProject = action.payload;
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) =>
                    p.id === updatedProject.id ? updatedProject : p
                );
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? { ...w, projects: w.projects.map((p) => p.id === updatedProject.id ? updatedProject : p) }
                    : w
            );
        },
        addProjectMember: (state, action) => {
            const { projectId, member } = action.payload;
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) =>
                    p.id === projectId ? { ...p, members: [...(p.members || []), member] } : p
                );
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? {
                        ...w,
                        projects: w.projects.map((p) =>
                            p.id === projectId ? { ...p, members: [...(p.members || []), member] } : p
                        ),
                    }
                    : w
            );
        },
        addTask: (state, action) => {
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                    if (p.id === action.payload.projectId) {
                        p.tasks.push(action.payload);
                    }
                    return p;
                });
            }

            // find workspace and project by id and add task to it
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? {
                        ...w,
                        projects: w.projects.map((p) =>
                            p.id === action.payload.projectId
                                ? { ...p, tasks: p.tasks.concat(action.payload) }
                                : p
                        ),
                    }
                    : w
            );
        },
        updateTask: (state, action) => {
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects.forEach((p) => {
                    if (p.id === action.payload.projectId) {
                        p.tasks = p.tasks.map((t) =>
                            t.id === action.payload.id ? action.payload : t
                        );
                    }
                });
            }
            // find workspace and project by id and update task in it
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? {
                        ...w,
                        projects: w.projects.map((p) =>
                            p.id === action.payload.projectId
                                ? {
                                    ...p,
                                    tasks: p.tasks.map((t) =>
                                        t.id === action.payload.id ? action.payload : t
                                    ),
                                }
                                : p
                        ),
                    }
                    : w
            );
        },
        deleteTask: (state, action) => {
            if (state.currentWorkspace?.projects) {
                state.currentWorkspace.projects.forEach((p) => {
                    p.tasks = p.tasks.filter((t) => !action.payload.includes(t.id));
                });
            }
            // find workspace and project by id and delete task from it
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? {
                        ...w,
                        projects: w.projects.map((p) =>
                            p.id === action.payload.projectId
                                ? {
                                    ...p,
                                    tasks: p.tasks.filter((t) => !action.payload.includes(t.id)),
                                }
                                : p
                        ),
                    }
                    : w
            );
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWorkspaces.pending, (state) => {
                if (state.workspaces.length === 0) {
                    state.loading = true;
                }
            })
            .addCase(fetchWorkspaces.fulfilled, (state, action) => {
                state.workspaces = action.payload;
                if (action.payload.length > 0) {
                    const localStorageCurrentWorkspaceId = localStorage.getItem("currentWorkspaceId");
                    const currentId = state.currentWorkspace?.id || localStorageCurrentWorkspaceId;
                    const findWorkspace = action.payload.find(
                        (w) => w.id === currentId
                    );
                    state.currentWorkspace = findWorkspace || action.payload[0];
                    if (state.currentWorkspace) {
                        localStorage.setItem("currentWorkspaceId", state.currentWorkspace.id);
                    }
                } else {
                    state.currentWorkspace = null;
                }
                saveToStorage(state.workspaces, state.currentWorkspace);
                state.loading = false;
            })
            .addCase(fetchWorkspaces.rejected, (state) => {
                state.loading = false;
            });
    },
});

export const {
    setWorkspaces,
    setCurrentWorkspace,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    addProject,
    updateProject,
    addProjectMember,
    addTask,
    updateTask,
    deleteTask,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;