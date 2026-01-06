import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Board, Group, Task, GROUP_COLORS } from '@/types/board';
import { initialBoard } from '@/data/initialData';

interface BoardState {
  board: Board;
}

const initialState: BoardState = {
  board: initialBoard,
};

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    updateGroup: (
      state,
      action: PayloadAction<{ groupId: string; updates: Partial<Group> }>
    ) => {
      const { groupId, updates } = action.payload;
      const group = state.board.groups.find((g) => g.id === groupId);
      if (group) {
        Object.assign(group, updates);
      }
    },
    updateTask: (
      state,
      action: PayloadAction<{
        groupId: string;
        taskId: string;
        updates: Partial<Task>;
      }>
    ) => {
      const { groupId, taskId, updates } = action.payload;
      const group = state.board.groups.find((g) => g.id === groupId);
      if (group) {
        const task = group.tasks.find((t) => t.id === taskId);
        if (task) {
          Object.assign(task, updates);
        }
      }
    },
    deleteTask: (
      state,
      action: PayloadAction<{ groupId: string; taskId: string }>
    ) => {
      const { groupId, taskId } = action.payload;
      const group = state.board.groups.find((g) => g.id === groupId);
      if (group) {
        group.tasks = group.tasks.filter((t) => t.id !== taskId);
      }
    },
    addTask: (state, action: PayloadAction<{ groupId: string }>) => {
      const { groupId } = action.payload;
      const group = state.board.groups.find((g) => g.id === groupId);
      if (group) {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          name: '',
          status: 'none',
          person: null,
          date: null,
        };
        group.tasks.push(newTask);
      }
    },
    addGroup: (state) => {
      const newGroup: Group = {
        id: `group-${Date.now()}`,
        name: 'New Group',
        color: GROUP_COLORS[state.board.groups.length % GROUP_COLORS.length],
        isCollapsed: false,
        tasks: [],
      };
      state.board.groups.push(newGroup);
    },
  },
});

export const { updateGroup, updateTask, deleteTask, addTask, addGroup } =
  boardSlice.actions;

export default boardSlice.reducer;
