/**
 * Compte à rebours jours / heures / minutes / secondes jusqu'à l'anniversaire.
 * Se met à jour chaque seconde. Le jour J : « C'est aujourd'hui » ; après : « La fête est passée ».
 */
import { Cake, PartyPopper } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colors, shadow } from '@/lib/theme';

export default function Countdown({ date, color = colors.ink, onDark = false }: { date: string; color?: string; onDark?: boolean }) {
  const target = new Date(date + 'T00:00:00').getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, target - now);
  if (diff === 0) {
    const today = now < target + 86400000;
    const Icon = today ? Cake : PartyPopper;
    return (
      <View className="flex-row items-center">
        <Icon size={26} color={onDark ? '#fff' : color} />
        <Text className="ml-2 font-display text-[28px]" style={{ color: onDark ? '#fff' : color }}>{today ? 'C’est aujourd’hui' : 'La fête est passée'}</Text>
      </View>
    );
  }
  const parts = [
    { v: Math.floor(diff / 86400000), l: 'jours' },
    { v: Math.floor((diff / 3600000) % 24), l: 'heures' },
    { v: Math.floor((diff / 60000) % 60), l: 'min' },
    { v: Math.floor((diff / 1000) % 60), l: 'sec' },
  ];
  return (
    <View className="flex-row gap-2" accessibilityLabel={`Compte à rebours : ${parts[0].v} jours, ${parts[1].v} heures`}>
      {parts.map((p) => (
        <View key={p.l} className={`min-w-[64px] items-center rounded-2xl px-2 py-2.5 ${onDark ? 'bg-white/10' : 'border border-ink/[0.07] bg-white'}`}
          style={onDark ? undefined : shadow.sm}>
          <Text className="font-display text-[30px] leading-[32px]" style={{ color: onDark ? '#fff' : color, fontVariant: ['tabular-nums'] }}>
            {String(p.v).padStart(2, '0')}
          </Text>
          <Text className={`mt-1 font-semi text-[11px] ${onDark ? 'text-white/70' : 'text-ink/50'}`}>{p.l}</Text>
        </View>
      ))}
    </View>
  );
}
