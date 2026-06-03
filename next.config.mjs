/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
    },
    turbopack: {
        root: process.cwd(),
    },
    async headers() {
        return [
            {
                source: '/sw.js',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Content-Type', value: 'application/javascript' },
                    { key: 'Service-Worker-Allowed', value: '/' },
                ],
            },
            {
                source: '/manifest.json',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache' },
                    { key: 'Content-Type', value: 'application/manifest+json' },
                ],
            },
        ]
    },
}

export default nextConfig;
