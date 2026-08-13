/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from './+Page';
import { findAStarPath } from '@/utils/astar';

describe('QR Resampled Maze Game & Solver Page', () => {
  it('renders the game page layout and headers', () => {
    render(<Page />);

    // Check primary page headings
    expect(screen.getByRole('heading', { level: 1, name: /QR Fixed Grid Resampling & Maze Solver/i })).toBeInTheDocument();
    expect(screen.getByText(/Downsample or upsample any QR matrix size to a standard 31x31 grid/i)).toBeInTheDocument();
  });

  it('renders target customizer and telemetry', () => {
    render(<Page />);

    // Check customize headers
    expect(screen.getByRole('heading', { name: /1\. Customize Target QR/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/QR Data Payload/i)).toBeInTheDocument();

    // Check telemetry headers
    expect(screen.getByRole('heading', { name: /2\. Real-Time Telemetry/i })).toBeInTheDocument();
    expect(screen.getByText(/Original QR Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Fixed Resampled Grid/i)).toBeInTheDocument();
  });

  it('renders interactive canvas and action buttons', () => {
    render(<Page />);

    // Check canvas and help labels
    const canvas = screen.getByLabelText(/Interactive QR Code Game Board/i);
    expect(canvas).toBeInTheDocument();

    // Check button elements
    expect(screen.getByRole('button', { name: /Reset Grid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show Solution/i })).toBeInTheDocument();
  });

  it('allows customizing target text and error correction levels', () => {
    render(<Page />);

    const input = screen.getByLabelText(/QR Data Payload/i);
    fireEvent.change(input, { target: { value: 'https://github.com' } });
    expect(input).toHaveValue('https://github.com');

    // Click Level H error correction level
    const levelHButton = screen.getByRole('button', { name: /Level H/i });
    fireEvent.click(levelHButton);
    expect(levelHButton).toHaveClass('bg-teal-600');
  });

  it('runs A* pathfinding algorithm successfully', () => {
    // Generate a simple 31x31 grid with no walls
    const grid = Array.from({ length: 31 }, () => Array(31).fill(false));
    const start = { r: 8, c: 15 };
    const end = { r: 22, c: 15 };

    const path = findAStarPath(grid, start, end);
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual(end);
  });

  it('allows solving the maze using the Show Solution action and resets correctly', () => {
    render(<Page />);

    const solveBtn = screen.getByRole('button', { name: /Show Solution/i });
    const resetBtn = screen.getByRole('button', { name: /Reset Grid/i });

    // Click Show Solution
    fireEvent.click(solveBtn);

    // Overlay is shown with Victory details
    expect(screen.getByText(/Maze Solved!/i)).toBeInTheDocument();

    // Resetting should return back to original state
    const playAgainBtn = screen.getByRole('button', { name: /Reset & Play Again/i });
    fireEvent.click(playAgainBtn);

    expect(screen.queryByText(/Maze Solved!/i)).not.toBeInTheDocument();
  });
});
