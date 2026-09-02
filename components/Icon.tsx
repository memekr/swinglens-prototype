import type { ReactNode } from "react";

export type IconName =
  | "arrow"
  | "camera"
  | "check"
  | "chevronLeft"
  | "chevronRight"
  | "compare"
  | "eye"
  | "eyeOff"
  | "lock"
  | "pose"
  | "print"
  | "share"
  | "spark"
  | "upload"
  | "warn";

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13.5" r="3.5" /></>,
    spark: <><path d="m12 2 1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
    pose: <><circle cx="12" cy="4" r="2" /><path d="m12 6 1 6 4 3m-4-3-4 3m3-6-4 2m5-2 4 2m-5 1-1 8m2-8 2 8" /></>,
    compare: <><path d="M4 6h16M4 12h10M4 18h7" /><path d="m17 15 3 3-3 3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    warn: <><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v5m0 3h.01" /></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a14 14 0 0 1-2.2 2.9M6.1 6.1C3.8 7.7 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3-.5" /><path d="M10.5 10.5a2.2 2.2 0 0 0 3 3" /></>,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5m-8 7 8 5" /></>,
    print: <><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3" /><path d="M7 14h10v7H7z" /></>,
    upload: <><path d="M12 16V5m0 0-4 4m4-4 4 4" /><path d="M4 19v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" /></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
