import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Board, Group, Task } from '@/types/board';
// TODO: import { getBoard, updateTask, addTask, deleteTask, addGroup } from '@/api/boardApi';

interface BoardState {
  board: Board | null;
  loading: boolean;
  error: string | null;
}

const initialState: BoardState = {
  board: null,
  loading: false,
  error: null,
};

// TODO: implement fetchBoard — call getBoard() and set board in state
// export const fetchBoard = createAsyncThunk('board/fetchBoard', async () => { ... });

// TODO: implement updateTaskAsync — call updateTask() and merge the returned task into state
// export const updateTaskAsync = createAsyncThunk(...);

// TODO: implement addTaskAsync — call addTask() and append the returned task to the group
// export const addTaskAsync = createAsyncThunk(...);

// TODO: implement deleteTaskAsync — call deleteTask() and remove the task from state
// export const deleteTaskAsync = createAsyncThunk(...);

// TODO: implement addGroupAsync — call addGroup() and append the returned group to state
// export const addGroupAsync = createAsyncThunk(...);

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    // Kept synchronous — used for collapse/expand toggling (no server round-trip needed)
    updateGroup: (
      state,
      action: PayloadAction<{ groupId: string; updates: Partial<Group> }>
    ) => {
      const { groupId, updates } = action.payload;
      const group = state.board?.groups.find((g) => g.id === groupId);
      if (group) {
        Object.assign(group, updates);
      }
    },
  },
  // TODO: wire async thunks via extraReducers
  // extraReducers: (builder) => {
  //   builder
  //     .addCase(fetchBoard.pending, (state) => { ... })
  //     .addCase(fetchBoard.fulfilled, (state, action) => { ... })
  //     .addCase(fetchBoard.rejected, (state, action) => { ... })
  //     // ... repeat for other thunks
  // },
});

export const { updateGroup } = boardSlice.actions;

export default boardSlice.reducer;
