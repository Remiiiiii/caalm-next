'use client';

interface TotalSpace {
  document: { size: number; latestDate: string };
  image: { size: number; latestDate: string };
  video: { size: number; latestDate: string };
  audio: { size: number; latestDate: string };
  other: { size: number; latestDate: string };
  used: number;
  all: number;
}

interface StorageProgressBarProps {
  totalSpace: TotalSpace | null;
  maxSizeGB?: number; // Optional override, defaults to 100GB (Growth Plan)
}

export default function StorageProgressBar({
  totalSpace,
  maxSizeGB = 100, // Default to Growth Plan limit
}: StorageProgressBarProps) {
  if (!totalSpace) {
    return null;
  }

  const totalSizeBytes = totalSpace.used || 0;
  const totalSizeKB = totalSizeBytes / 1024;
  const maxSizeKB = maxSizeGB * 1024 * 1024; // Convert GB to KB for calculation
  const percentage = Math.min((totalSizeKB / maxSizeKB) * 100, 100);

  // Convert to GB if >= 1 GB (1024 * 1024 KB), otherwise keep in KB
  const KB_PER_GB = 1024 * 1024; // 1,048,576 KB = 1 GB
  let formattedUsed: string;
  let usedUnit: string;

  if (totalSizeKB >= KB_PER_GB) {
    // Convert to GB
    const totalSizeGB = totalSizeKB / KB_PER_GB;
    formattedUsed = totalSizeGB.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    usedUnit = 'GB';
  } else {
    // Keep in KB
    formattedUsed = totalSizeKB.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    usedUnit = 'KB';
  }

  // Color indicator based on usage percentage
  let progressColor = 'rgb(22, 163, 74)'; // green-600 - < 50% usage
  if (percentage >= 80) {
    progressColor = 'rgb(220, 38, 38)'; // red-600 - >= 80% usage (critical)
  } else if (percentage >= 50) {
    progressColor = 'rgb(217, 119, 6)'; // amber-600 - 50-80% usage (warning)
  }

  return (
    <div className="mt-4 w-full">
      <div className="space-y-2">
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full transition-all"
            style={{
              width: `${percentage}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
        <p className="text-sm text-center text-slate-600">
          {formattedUsed} {usedUnit} of {maxSizeGB} GB used
        </p>
      </div>
    </div>
  );
}

