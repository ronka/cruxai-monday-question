import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { BoardView } from '@/components/board/BoardView';
import { DateCell } from '@/components/board/DateCell';
import { TextCell } from '@/components/board/TextCell';
import { StatusCell } from '@/components/board/StatusCell';

const renderBoard = () => {
  const store = makeStore();
  return render(
    <Provider store={store}>
      <BoardView />
    </Provider>
  );
};

test('renders tasks in the To Do group in the initial order', () => {
  renderBoard();

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

test('normalizes estimation column values', async () => {
  const user = userEvent.setup();
  renderBoard();

  const group = screen.getByTestId('group-section-group-1');
  const firstRow = within(group).getAllByTestId('task-row')[0];
  const estimationCell = within(firstRow).getByTestId('task-estimation');

  await user.click(estimationCell);
  const input = within(estimationCell).getByRole('textbox');
  await user.clear(input);
  await user.type(input, '3 days{enter}');

  expect(estimationCell).toHaveTextContent('3d');
});
