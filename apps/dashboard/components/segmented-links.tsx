import React from 'react';
import Link from 'next/link';

interface SegmentedOption {
  href: string;
  key: string;
  label: string;
}

interface SegmentedLinksProps {
  activeKey: string;
  options: SegmentedOption[];
}

export const SegmentedLinks = ({ activeKey, options }: SegmentedLinksProps) => (
  <div className="inline-flex rounded-full border border-pine/15 bg-canvas p-1 text-sm">
    {options.map((option) => (
      <Link
        key={option.key}
        className={`rounded-full px-3 py-1.5 transition ${
          option.key === activeKey
            ? 'bg-pine text-white shadow-sm'
            : 'text-pine/80 hover:bg-white hover:text-ink'
        }`}
        href={option.href}
      >
        {option.label}
      </Link>
    ))}
  </div>
);
