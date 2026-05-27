/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    // lucide-react, Radix UI 아이콘을 필요한 것만 번들에 포함 (트리쉐이킹 강화)
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
    ],
  },

  // Next.js Image 최적화: WebP/AVIF 자동 변환 + 캐시 1주일
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800, // 7일
    deviceSizes: [390, 430, 768, 1280],   // 모바일 우선 브레이크포인트
    imageSizes:  [32, 64, 96, 192, 512],
  },

  // Android Chrome에서 가속도계 센서 접근 허용 (만보기 필수)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'accelerometer=*, gyroscope=*, magnetometer=*',
          },
          // 정적 자산에 장기 캐시 헤더 부여
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      // 아이콘·폰트 등 정적 자산은 1년 캐시
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/favicon-:size.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

export default nextConfig
