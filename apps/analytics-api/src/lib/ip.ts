import { isIP } from 'node:net';

const normalizeIpv4MappedAddress = (value: string) =>
  value.startsWith('::ffff:') ? value.slice(7) : value;

const expandIpv6 = (value: string) => {
  const [head = '', tail = ''] = value.split('::');
  const headSegments = head.length > 0 ? head.split(':') : [];
  const tailSegments = tail.length > 0 ? tail.split(':') : [];
  const missingSegments = 8 - (headSegments.length + tailSegments.length);
  const zeros = Array.from({ length: Math.max(missingSegments, 0) }, () => '0');

  return [...headSegments, ...zeros, ...tailSegments].map((segment) =>
    segment.padStart(4, '0')
  );
};

export const truncateIpAddress = (value?: string) => {
  if (!value) {
    return 'unknown';
  }

  const normalized = normalizeIpv4MappedAddress(value);
  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    const [first = '0', second = '0', third = '0'] = normalized.split('.');
    return `${first}.${second}.${third}.0/24`;
  }

  if (ipVersion === 6) {
    const [first = '0000', second = '0000', third = '0000'] = expandIpv6(normalized);
    return `${parseInt(first, 16).toString(16)}:${parseInt(second, 16).toString(16)}:${parseInt(
      third,
      16
    ).toString(16)}::/48`;
  }

  return 'unknown';
};

export const sanitizeUserAgent = (value?: string) => {
  if (!value) {
    return 'unknown';
  }

  return value.slice(0, 120);
};
