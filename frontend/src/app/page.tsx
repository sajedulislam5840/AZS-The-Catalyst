import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl border border-gray-100 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">EduTrack</h1>
        <p className="text-gray-600">
          Next-generation education and academic management platform.
        </p>

        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/login"
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 shadow-sm"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="w-full rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </main>
  );
}