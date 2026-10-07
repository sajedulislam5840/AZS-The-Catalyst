import axios from 'axios';

const api = axios.create({
    baseURL:
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
        'https://edutrack-backend-qjxg.onrender.com',
    timeout: 60000, // ৬০ সেকেন্ড পর্যন্ত বাফার দেবে
    headers: {
        'Content-Type': 'application/json',
    },
});

// টোকেন এটাচমেন্ট
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// অটোমেটিক ১ বার রিট্রাই (যদি পিক আওয়ারে নেটওয়ার্ক ড্রপ বা স্পাইক হয়)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        if (!config || config.__isRetryRequest) {
            return Promise.reject(error);
        }

        // শুধু নেটওয়ার্ক এরর বা 502/503/504 এর ক্ষেত্রে রিট্রাই করবে
        if (
            !error.response ||
            error.response.status === 502 ||
            error.response.status === 503 ||
            error.response.status === 504
        ) {
            config.__isRetryRequest = true;
            await new Promise((resolve) => setTimeout(resolve, 1500)); // ১.৫ সেকেন্ড বিরতি দিয়ে আবার চেষ্টা করবে
            return api(config);
        }

        return Promise.reject(error);
    }
);

export default api;