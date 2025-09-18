'use client';

import { Chart } from '@/components/Chart';
import { getUsageSummary } from '@/lib/utils';
import { convertFileSize } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import FormattedDateTime from '@/components/FormattedDateTime';
import FileUploader from './FileUploader';
import { Models } from 'appwrite';

interface FileTypeSummary {
  size: number;
  latestDate: string;
}

interface TotalSpace {
  document: FileTypeSummary;
  image: FileTypeSummary;
  video: FileTypeSummary;
  audio: FileTypeSummary;
  other: FileTypeSummary;
  used: number;
  all: number;
}

interface FileUsageOverviewProps {
  totalSpace: TotalSpace | null;
  user?:
    | (Models.User<Models.Preferences> & {
        division?: string;
      })
    | null;
}

const FileUsageOverview = ({ user, totalSpace }: FileUsageOverviewProps) => {
  if (!totalSpace) {
    return (
      <section className="bg-white/30 backdrop-blur border border-white/40 shadow-lg rounded-xl p-6 flex flex-col">
        <h2 className="flex left-0 text-lg font-bold text-center sidebar-gradient-text mb-6">
          File Usage Overview
        </h2>
        <div className="flex justify-center items-center">
          <p className="text-gray-500">Loading usage data...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white/30 backdrop-blur border border-white/40 shadow-lg rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold sidebar-gradient-text">
          File Usage Overview
        </h2>
        {user && (
          <FileUploader
            ownerId={user.$id}
            accountId={user.$id}
            className="primary-btn h-10 px-4 shadow-drop-1 text-sm"
          />
        )}
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Chart on the left */}
        <div className="flex justify-center items-center lg:w-1/3">
          <Chart used={totalSpace.used || 0} />
        </div>

        {/* File type summaries on the right */}
        <div className="lg:w-2/3">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getUsageSummary(totalSpace).map((summary) => (
              <Link
                href={summary.url}
                key={summary.title}
                className="flex flex-col bg-slate-50 rounded-lg p-4 hover:shadow transition border border-border"
              >
                <div className="flex justify-between items-center mb-2">
                  <Image
                    src={summary.icon}
                    width={40}
                    height={40}
                    alt="uploaded image"
                    className="rounded-full"
                  />
                  <h4 className="text-lg font-semibold text-navy">
                    {convertFileSize(summary.size) || 0}
                  </h4>
                </div>
                <h5 className="text-sm font-medium text-slate-dark mb-1">
                  {summary.title}
                </h5>
                <Separator className="bg-light-400 my-2" />
                <FormattedDateTime
                  date={summary.latestDate}
                  className="text-left text-xs text-slate-light"
                />
              </Link>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FileUsageOverview;
