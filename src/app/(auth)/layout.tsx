import React from 'react';
import Image from 'next/image';

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <section className="bg-gradient-to-r from-slate-700 to-gray-900 p-10 hidden w-1/2 items-center justify-center lg:flex xl:w-2/5">
        <div className="flex flex-col max-h-[800px] max-w-[430px] justify-center space-y-12">
          <div className="flex items-center gap-2">
            <Image
              src="/assets/images/logo.svg"
              alt="logo"
              width={54}
              height={54}
              className="h-auto"
            />
            <span className="text-white text-2xl font-bold">Caalm</span>
          </div>
          <div className="space-y-5 text-white">
            <h1 className="text-2xl font-bold">
              Eliminate Missed Deadliness and Compliance Risks with Centralized
              Document Management
            </h1>
            <p className="body-1">
              The perfect place to manage your contracts, audits, and licenses.
            </p>
          </div>
          <Image
            src="/assets/images/files.png"
            alt="files"
            width={342}
            height={342}
            className="transition-all hover:rotate-2 hover:scale-105"
          />
        </div>
      </section>
      <section className="flex flex-1 flex-col items-center lg:justify-center p-4 py-10 bg-white lg:p-10 lg:py-10">
        <div className="mb-16 lg:hidden">
          <Image
            src="/assets/images/logo.svg"
            alt="logo"
            width={50}
            height={50}
          />
        </div>
        {children}
      </section>
    </div>
  );
};

export default layout;
