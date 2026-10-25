/**
 * Choix de la couleur de thème : palette prédéfinie + couleur libre (code hexadécimal).
 * La couleur choisie est toujours visiblement sélectionnée (anneau + coche), y compris la couleur libre.
 */
import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { colors } from '@/lib/theme';
import { THEME_COLORS, isHex, readableOn } from '@/lib/utils';
import { cn } from './ui';

export default function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const isPreset = THEME_COLORS.some((c) => c.hex.toLowerCase() === value.toLowerCase());
  const custom = !!value && !isPreset;
  const [showHex, setShowHex] = useState(custom);
  const [hex, setHex] = useState(custom ? value : '#');

  return (
    <View>
      <View className="flex-row flex-wrap gap-2.5">
        {THEME_COLORS.map((c) => {
          const on = value.toLowerCase() === c.hex.toLowerCase();
          return (
            <Pressable key={c.hex} accessibilityLabel={c.name} accessibilityState={{ selected: on }}
              onPress={() => onChange(on ? '' : c.hex)}
              className={cn('h-11 w-11 items-center justify-center rounded-full border', on ? 'border-[3px] border-ink' : 'border-ink/10')}
              style={{ backgroundColor: c.hex }}>
              {on && <Check size={16} color={readableOn(c.hex)} />}
            </Pressable>
          );
        })}
        {/* Couleur libre */}
        <Pressable accessibilityLabel="Autre couleur" accessibilityState={{ selected: custom }} onPress={() => setShowHex((s) => !s)}
          className={cn('h-11 w-11 items-center justify-center rounded-full', custom ? 'border-[3px] border-ink' : 'border-2 border-dashed border-ink/30')}
          style={custom ? { backgroundColor: value } : undefined}>
          {custom ? <Check size={16} color={readableOn(value)} /> : <Plus size={16} color={colors.ink} />}
        </Pressable>
      </View>
      {showHex && (
        <View className="mt-3 flex-row items-center">
          <View className="mr-2 h-11 w-11 rounded-full border border-ink/10" style={{ backgroundColor: isHex(hex) ? hex : '#fff' }} />
          <TextInput
            value={hex} autoCapitalize="characters" maxLength={7} placeholder="#A1B2C3"
            onChangeText={(t) => {
              const v = ('#' + t.replace(/[^0-9a-fA-F]/g, '')).slice(0, 7);
              setHex(v);
              if (isHex(v)) onChange(v);
            }}
            accessibilityLabel="Code couleur hexadécimal"
            className="min-h-[46px] flex-1 rounded-2xl border border-ink/10 bg-white px-4 font-semi text-[15px] text-ink"
          />
        </View>
      )}
    </View>
  );
}
