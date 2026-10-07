'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('role');

        if (!token) {
            router.push('/login');
        } else {
            setRole(userRole);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow">
                <div className="flex items-center justify-between border-b pb-4">
                    <h1 className="text-2xl font-bold text-gray-900">EduTrack Dashboard</h1>
                    <button
                        onClick={handleLogout}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        Logout
                    </button>
                </div>

                <div className="mt-6">
                    <p className="text-lg text-gray-700">
                        Welcome to your portal! Logged in as: <span className="font-semibold text-indigo-600">{role}</span>
                    </p>
                    <div className="mt-4 rounded-lg bg-green-50 p-4 border border-green-200 text-green-800">
                        Connected to Render Backend & Neon PostgreSQL Database!
                    </div>
                </div>
            </div>
        </div>
    );
}