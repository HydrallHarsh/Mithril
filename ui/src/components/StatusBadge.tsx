import type { AdmissionStatus } from "@/types";
import { STATUS_CONFIG } from "@/types";

interface StatusBadgeProps {
  status: AdmissionStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.badge} ${className}`}
    >
      {config.label}
    </span>
  );
}
