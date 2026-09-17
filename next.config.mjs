/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      // 사진 업로드(Photo Archive)가 최대 8MB 파일을 서버 액션으로 전송합니다.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
