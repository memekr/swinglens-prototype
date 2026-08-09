import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SwingLens — 온디바이스 스윙 체크",
    short_name: "SwingLens",
    description: "휴대폰 영상에서 기기 안에서 동작하는 야구 스윙 자세 분석 프로토타입",
    start_url: "/",
    display: "standalone",
    background_color: "#07110d",
    theme_color: "#c9ff52",
    orientation: "any",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
