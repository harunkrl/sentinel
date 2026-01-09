import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import SettingsModal from '../SettingsModal';

// Mock axios
vi.mock('axios');

const defaultSettings = {
    notifications_enabled: true,
    ntfy_topic: 'test-topic',
    cpu_threshold: 90,
    ram_threshold: 90,
    disk_threshold: 90,
    cpu_temp_threshold: 80,
};

describe('SettingsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        axios.get.mockResolvedValue({ data: defaultSettings });
    });

    it('does not render when closed', () => {
        render(<SettingsModal isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('renders when open', async () => {
        render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Settings')).toBeInTheDocument();
        });
    });

    it('fetches settings on open', async () => {
        render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/settings'));
        });
    });

    it('displays all navigation tabs', async () => {
        render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

        await waitFor(() => {
            // Use getAllByText since there are multiple occurrences of tab names
            expect(screen.getAllByText('General').length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Thresholds/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText('Integrations').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Security').length).toBeGreaterThan(0);
        });
    });

    it('switches tabs on click', async () => {
        render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getAllByText(/Thresholds/i).length).toBeGreaterThan(0);
        });

        // Click the first matching element
        fireEvent.click(screen.getAllByText(/Thresholds/i)[0]);

        await waitFor(() => {
            expect(screen.getByText('Alert Thresholds')).toBeInTheDocument();
        });
    });

    it('calls onClose when cancel button clicked', async () => {
        const onClose = vi.fn();
        render(<SettingsModal isOpen={true} onClose={onClose} />);

        await waitFor(() => {
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalled();
    });

    it('saves settings when Save button clicked', async () => {
        axios.post.mockResolvedValueOnce({ data: { status: 'saved' } });
        render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Save Changes')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Save Changes'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/settings'),
                expect.any(Object)
            );
        });
    });
});
