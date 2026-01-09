import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import Login from '../Login';

// Mock axios
vi.mock('axios');

const renderLogin = (onLoginSuccess = vi.fn()) => {
    return render(
        <BrowserRouter>
            <Login onLoginSuccess={onLoginSuccess} />
        </BrowserRouter>
    );
};

describe('Login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form', () => {
        renderLogin();

        expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows validation error when submitting empty form', async () => {
        renderLogin();

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(submitButton);

        // Form should not submit and should show validation
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('calls onLoginSuccess after successful login', async () => {
        const mockToken = 'test-jwt-token';
        axios.post.mockResolvedValueOnce({ data: { token: mockToken } });
        const onLoginSuccess = vi.fn();

        renderLogin(onLoginSuccess);

        fireEvent.change(screen.getByPlaceholderText(/username/i), {
            target: { value: 'admin' },
        });
        fireEvent.change(screen.getByPlaceholderText(/password/i), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/auth/login'),
                { username: 'admin', password: 'password123' }
            );
        });

        await waitFor(() => {
            expect(onLoginSuccess).toHaveBeenCalledWith(mockToken);
        });
    });

    it('displays error message on failed login', async () => {
        axios.post.mockRejectedValueOnce({
            response: { data: { error: 'Invalid credentials' } },
        });

        renderLogin();

        fireEvent.change(screen.getByPlaceholderText(/username/i), {
            target: { value: 'admin' },
        });
        fireEvent.change(screen.getByPlaceholderText(/password/i), {
            target: { value: 'wrongpassword' },
        });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });
});
