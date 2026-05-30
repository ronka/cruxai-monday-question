import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { BoardView } from '@/components/board/BoardView';
import { DateCell } from '@/components/board/DateCell';
import { TextCell } from '@/components/board/TextCell';
import { StatusCell } from '@/components/board/StatusCell';
import * as boardApi from '@/api/boardApi';
import { Board, Task } from '@/types/board';

jest.mock('@/api/boardApi');

// Board name is intentionally different from initialData to prove data comes from the API
const mockBoard: Board = {
  id: 'board-1',
  name: 'API Board',
  groups: [
    {
      id: 'group-1',
      name: 'To Do',
      color: 'hsl(195, 100%, 45%)',
      isCollapsed: false,
      tasks: [
        { id: 'task-1', name: 'Design homepage mockup', status: 'working', person: 'Alex', date: '2026-01-10', estimation: null },
        { id: 'task-2', name: 'Set up project repository', status: 'done', person: 'Jordan', date: '2026-01-05', estimation: null },
        { id: 'task-3', name: 'Write documentation', status: 'waiting', person: null, date: '2026-01-15', estimation: null },
      ],
    },
    {
      id: 'group-2',
      name: 'In Progress',
      color: 'hsl(35, 100%, 50%)',
      isCollapsed: false,
      tasks: [
        { id: 'task-4', name: 'Implement authentication', status: 'stuck', person: 'Sam', date: '2026-01-08', estimation: null },
        { id: 'task-5', name: 'Create API endpoints', status: 'working', person: 'Taylor', date: '2026-01-12', estimation: null },
      ],
    },
    {
      id: 'group-3',
      name: 'Completed',
      color: 'hsl(145, 65%, 42%)',
      isCollapsed: false,
      tasks: [
        { id: 'task-6', name: 'Project kickoff meeting', status: 'done', person: 'Alex', date: '2026-01-02', estimation: null },
      ],
    },
  ],
};

const mockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  name: 'Design homepage mockup',
  status: 'working',
  person: 'Alex',
  date: '2026-01-10',
  estimation: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (boardApi.getBoard as jest.Mock).mockResolvedValue(mockBoard);
  (boardApi.updateTask as jest.Mock).mockImplementation((_groupId, taskId, updates) =>
    Promise.resolve(mockTask({ id: taskId, ...updates }))
  );
  (boardApi.addTask as jest.Mock).mockResolvedValue(
    mockTask({ id: `task-${Date.now()}`, name: '', estimation: null })
  );
  (boardApi.deleteTask as jest.Mock).mockResolvedValue(undefined);
  (boardApi.addGroup as jest.Mock).mockResolvedValue({
    id: `group-${Date.now()}`,
    name: 'New Group',
    color: 'hsl(210, 80%, 55%)',
    isCollapsed: false,
    tasks: [],
  });
});

const renderBoard = () => {
  const store = makeStore();
  return render(
    <Provider store={store}>
      <BoardView />
    </Provider>
  );
};

const waitForBoard = () => waitFor(() => screen.getByTestId('group-section-group-1'));

// ─── Requirement: API wiring ──────────────────────────────────────────────────

test('shows loading state before board data arrives', async () => {
  (boardApi.getBoard as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
  renderBoard();
  expect(await screen.findByTestId('board-loading')).toBeInTheDocument();
});

test('loads board data from the API on mount, not from hardcoded initial data', async () => {
  renderBoard();
  await waitForBoard();
  expect(boardApi.getBoard).toHaveBeenCalledTimes(1);
  expect(screen.getByText('API Board')).toBeInTheDocument();
});

test('calls addTask API when a task is added', async () => {
  const user = userEvent.setup();
  renderBoard();
  await waitForBoard();

  const group = screen.getByTestId('group-section-group-1');
  await user.click(within(group).getByRole('button', { name: /add task/i }));

  expect(boardApi.addTask).toHaveBeenCalledWith('group-1');
});

test('calls deleteTask API when a task is deleted', async () => {
  const user = userEvent.setup();
  renderBoard();
  await waitForBoard();

  const firstRow = within(screen.getByTestId('group-section-group-1')).getAllByTestId('task-row')[0];
  await user.click(within(firstRow).getByRole('button', { name: /delete/i }));

  expect(boardApi.deleteTask).toHaveBeenCalledWith('group-1', 'task-1');
});

test('calls addGroup API when a group is added', async () => {
  const user = userEvent.setup();
  renderBoard();
  await waitForBoard();

  await user.click(screen.getByRole('button', { name: /add new group/i }));

  expect(boardApi.addGroup).toHaveBeenCalled();
});

// ─── Requirement: Estimation column ──────────────────────────────────────────

test('renders Estimation column header alongside the other column headers', async () => {
  renderBoard();
  await waitForBoard();
  const taskHeader = screen.getAllByText('Task')[0];
  expect(within(taskHeader.parentElement!).getByText('Estimation')).toBeInTheDocument();
});

test('renders an estimation cell for every task row', async () => {
  renderBoard();
  await waitForBoard();

  const rows = screen.getAllByTestId('task-row');
  rows.forEach((row) => {
    expect(within(row).getByTestId('task-estimation')).toBeInTheDocument();
  });
});

// ─── Requirement: Server-side normalization ───────────────────────────────────
//
// The API owns normalization. The UI must reflect what the server returns —
// NOT compute normalization itself. Each test mocks the API return value to
// simulate what the real mock server would respond with, then asserts the UI
// displays that server value.

test('displays server-normalized value after editing estimation (1d → 8h)', async () => {
  const user = userEvent.setup();
  (boardApi.updateTask as jest.Mock).mockResolvedValue(mockTask({ estimation: '8h' }));

  renderBoard();
  await waitForBoard();

  const firstRow = within(screen.getByTestId('group-section-group-1')).getAllByTestId('task-row')[0];
  await user.click(within(firstRow).getByTestId('task-estimation'));
  await user.clear(within(firstRow).getByRole('textbox'));
  await user.type(within(firstRow).getByRole('textbox'), '1d{enter}');

  await waitFor(() =>
    expect(within(firstRow).getByTestId('task-estimation')).toHaveTextContent('8h')
  );
});

test('displays server-normalized value after editing estimation (1w → 5d)', async () => {
  const user = userEvent.setup();
  (boardApi.updateTask as jest.Mock).mockResolvedValue(mockTask({ estimation: '5d' }));

  renderBoard();
  await waitForBoard();

  const firstRow = within(screen.getByTestId('group-section-group-1')).getAllByTestId('task-row')[0];
  await user.click(within(firstRow).getByTestId('task-estimation'));
  await user.clear(within(firstRow).getByRole('textbox'));
  await user.type(within(firstRow).getByRole('textbox'), '1w{enter}');

  await waitFor(() =>
    expect(within(firstRow).getByTestId('task-estimation')).toHaveTextContent('5d')
  );
});

test('displays server-normalized value after editing estimation (5 → 5h)', async () => {
  const user = userEvent.setup();
  (boardApi.updateTask as jest.Mock).mockResolvedValue(mockTask({ estimation: '5h' }));

  renderBoard();
  await waitForBoard();

  const firstRow = within(screen.getByTestId('group-section-group-1')).getAllByTestId('task-row')[0];
  await user.click(within(firstRow).getByTestId('task-estimation'));
  await user.clear(within(firstRow).getByRole('textbox'));
  await user.type(within(firstRow).getByRole('textbox'), '5{enter}');

  await waitFor(() =>
    expect(within(firstRow).getByTestId('task-estimation')).toHaveTextContent('5h')
  );
});

test('calls updateTask API with raw user input when estimation is saved', async () => {
  const user = userEvent.setup();
  renderBoard();
  await waitForBoard();

  const cell = within(
    within(screen.getByTestId('group-section-group-1')).getAllByTestId('task-row')[0]
  ).getByTestId('task-estimation');

  await user.click(cell);
  await user.clear(within(cell).getByRole('textbox'));
  await user.type(within(cell).getByRole('textbox'), '1d{enter}');

  expect(boardApi.updateTask).toHaveBeenCalledWith(
    'group-1',
    'task-1',
    expect.objectContaining({ estimation: '1d' })
  );
});

// ─── Existing functionality must still work ───────────────────────────────────

test('renders tasks in the To Do group in the initial order', async () => {
  renderBoard();
  await waitForBoard();

  const group = screen.getByTestId('group-section-group-1');
  const taskNames = within(group)
    .getAllByTestId('task-name')
    .map((node) => node.textContent?.trim());

  expect(taskNames).toEqual([
    'Design homepage mockup',
    'Set up project repository',
    'Write documentation',
  ]);
});

test('formats dates to the display format', () => {
  render(<DateCell date={new Date(2026, 0, 12)} onChange={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Jan 12' })).toBeInTheDocument();
});

test('commits text edits on enter', async () => {
  const user = userEvent.setup();
  const handleChange = jest.fn();

  render(<TextCell value="2d" onChange={handleChange} />);

  await user.click(screen.getByText('2d'));
  const input = screen.getByRole('textbox');
  await user.clear(input);
  await user.type(input, '3d{enter}');

  expect(handleChange).toHaveBeenCalledWith('3d');
});

test('updates status when a new option is selected', async () => {
  const user = userEvent.setup();
  const handleChange = jest.fn();

  render(<StatusCell status="working" onChange={handleChange} />);

  await user.click(screen.getByRole('button', { name: 'Working on it' }));
  await user.click(screen.getByRole('button', { name: 'Done' }));

  expect(handleChange).toHaveBeenCalledWith('done');
});
