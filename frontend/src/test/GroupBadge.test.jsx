import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GroupBadge from '../components/GroupBadge.jsx';

describe('GroupBadge', () => {
  it('renders the group name', () => {
    render(<GroupBadge name="S-tier" color="#6366f1" />);
    expect(screen.getByText('S-tier')).toBeInTheDocument();
  });

  it('applies background color from prop', () => {
    render(<GroupBadge name="Top" color="#ec4899" />);
    const badge = screen.getByText('Top');
    expect(badge.style.color).toBe('rgb(236, 72, 153)');
  });
});
