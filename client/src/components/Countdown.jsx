import { useState, useEffect } from 'react';
import { getCountdown } from '../lib/utils';

export default function Countdown({ kickoffTime }) {
  const [label, setLabel] = useState(() => getCountdown(kickoffTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setLabel(getCountdown(kickoffTime));
    }, 30000);
    return () => clearInterval(interval);
  }, [kickoffTime]);

  if (!label) return null;
  return (
    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-mono border border-green-500/30">
      ⏱ {label}
    </span>
  );
}
