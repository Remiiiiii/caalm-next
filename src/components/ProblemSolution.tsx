'use client';

import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import { motion } from 'framer-motion';
import 'react-vertical-timeline-component/style.min.css';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const problems = [
  'Documents scattered across personal drives and email',
  'Manual spreadsheet tracking prone to errors',
  'Missed deadlines due to ad hoc reminder systems',
  'Security risks from unsecured local storage',
  'Limited visibility into compliance status',
];

const solutions = [
  'Centralized, secure cloud-based repository',
  'Automated tracking with intelligent alerts',
  'Proactive deadline notifications and escalations',
  'Enterprise-grade security with audit trails',
  'Real-time dashboards and compliance reporting',
];

const ProblemSolution = () => {
  // Interleave problems and solutions
  const timelineItems = [];
  const maxLen = Math.max(problems.length, solutions.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < problems.length) {
      timelineItems.push({
        type: 'problem',
        text: problems[i],
        idx: i,
      });
    }
    if (i < solutions.length) {
      timelineItems.push({
        type: 'solution',
        text: solutions[i],
        idx: i,
      });
    }
  }

  return (
    <section
      id="solutions"
      className="px-4 py-32 bg-[#101624] relative overflow-hidden"
    >
      <div
        className="absolute left-1/2 top-[-110px] -translate-x-1/2 z-10 pointer-events-none w-full h-80 md:h-[32vh]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(0,193,203,0.18) 0%, rgba(0,193,203,0.10) 40%, rgba(16,22,36,0.01) 80%, transparent 100%)',
        }}
      />
      {/* Linear background gradient behind everything */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(120deg, #101624 75%, rgba(0,193,203,0.04) 88%, transparent 100%)',
        }}
      />
      {/* Subtle top spotlight effect */}
      {/* Top fade overlay for seamless transition from Features */}
      <div
        className="absolute left-0 right-0 top-[-100] h-40 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, #101624 60%, transparent 100%)',
        }}
      />
      <div className="max-w-7xl mx-auto relative z-20">
        <div className="text-center mb-24">
          <h2 className="text-4xl font-bold text-white mb-4">
            From Chaos to Control
          </h2>
        </div>
        {/* Timeline Titles */}
        <div className="relative">
          {/* Desktop: Titles absolutely positioned above timeline columns */}
          <div
            className="hidden md:block absolute w-full top-0 left-0 pointer-events-none"
            style={{ height: '0' }}
          >
            <div
              className="grid grid-cols-2 max-w-5xl mx-auto"
              style={{ position: 'relative' }}
            >
              <div
                className="flex justify-start pl-8"
                style={{ position: 'relative' }}
              >
                <h3
                  className="text-2xl font-semibold text-cyan-300 flex items-center pointer-events-auto text-left"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '-2.5rem',
                    width: '100%',
                  }}
                >
                  <AlertTriangle className="mr-3 h-6 w-6" />
                  Current Challenges
                </h3>
              </div>
              <div
                className="flex justify-center"
                style={{ position: 'relative' }}
              >
                <h3
                  className="text-2xl font-semibold text-cyan-300 flex items-center pointer-events-auto"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '-2.5rem',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  <CheckCircle className="mr-3 h-6 w-6" />
                  Caalm
                </h3>
              </div>
            </div>
          </div>
          {/* Mobile stacked titles */}
          <div className="md:hidden flex flex-col items-center gap-2 mb-10">
            <h3 className="text-2xl font-semibold text-cyan-300 flex items-center">
              <AlertTriangle className="mr-3 h-6 w-6" />
              Current Challenges
            </h3>
            <h3 className="text-2xl font-semibold text-cyan-300 flex items-center">
              <CheckCircle className="mr-3 h-6 w-6" />
              Caalm
            </h3>
          </div>
          {/* Timeline */}
          <VerticalTimeline lineColor="#23304a">
            {timelineItems.map((item, i) => (
              <VerticalTimelineElement
                key={`${item.type}-${item.idx}`}
                position={item.type === 'problem' ? 'left' : 'right'}
                iconStyle={{
                  background: 'transparent',
                  color: '#67e8f9',
                  boxShadow: '0 2px 12px 0 rgba(16,30,54,0.10)',
                }}
                icon={
                  <span className="relative flex items-center justify-center w-[56px] h-[56px]">
                    {/* Glow border */}
                    <span
                      className="absolute inset-0 rounded-2xl border-2 border-cyan-400"
                      style={{
                        boxShadow:
                          '0 0 8px 2px #67e8f9, 0 0 0 4px rgba(103,232,249,0.15)',
                      }}
                    />

                    {/* Icon centered */}
                    <span className="mt-[10px] relative z-20 flex items-center justify-center bg-[#101624] rounded-full p-1 shadow-md border border-cyan-700/40">
                      {item.type === 'solution' ? (
                        <CheckCircle className="w-5 h-5 text-cyan-300" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-cyan-300" />
                      )}
                    </span>
                  </span>
                }
                contentStyle={{
                  background: 'rgba(16,22,36,0.85)',
                  border: '2px solid #23304a',
                  borderRadius: '1.25rem',
                  boxShadow: '0 4px 24px 0 rgba(16,30,54,0.20)',
                  color: '#e0e7ef',
                  padding: '1.25rem 1.25rem',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                contentArrowStyle={{
                  borderRight: '7px solid #23304a',
                  borderLeft: undefined,
                }}
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    x: item.type === 'problem' ? -40 : 40,
                  }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                >
                  <p className="font-medium text-slate-200">{item.text}</p>
                </motion.div>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;
