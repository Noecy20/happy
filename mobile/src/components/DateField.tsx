/**
 * Champ date (sélecteur natif du téléphone : calendrier Android, roue iOS).
 * Valeur au format ISO "AAAA-MM-JJ", affichée en français (« samedi 20 décembre 2026 »).
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { colors } from '@/lib/theme';
import { formatDate, toIso } from '@/lib/utils';
import { Button, Label, cn } from './ui';

export default function DateField({ label, value, onChange, min, max, placeholder = 'Choisir une date', disabled, clearable, className }: {
  label?: string; value: string; onChange: (iso: string) => void; min?: string; max?: string;
  placeholder?: string; disabled?: boolean; clearable?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(value + 'T12:00:00') : min ? new Date(min + 'T12:00:00') : new Date();
  const toDate = (s?: string) => (s ? new Date(s + 'T12:00:00') : undefined);

  const picker = (
    <DateTimePicker
      value={current} mode="date" locale="fr-FR"
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      minimumDate={toDate(min)} maximumDate={toDate(max)}
      accentColor={colors.candy} themeVariant="light"
      onChange={(e, d) => {
        if (Platform.OS === 'android') setOpen(false);
        if (e.type === 'set' && d) onChange(toIso(d));
      }}
    />
  );

  return (
    <View className={cn('mb-4', className)}>
      {label && <Label>{label}</Label>}
      <Pressable disabled={disabled} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label || placeholder}
        className={cn('min-h-[50px] flex-row items-center rounded-2xl border border-ink/10 px-4', disabled ? 'bg-paper' : 'bg-white')}>
        <CalendarDays size={17} color={colors.candy} />
        <Text className={cn('ml-2 flex-1 font-body text-[15px]', value ? 'text-ink' : 'text-ink/35', disabled && 'text-ink/50')}>
          {value ? formatDate(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : placeholder}
        </Text>
        {clearable && !!value && !disabled && (
          <Pressable onPress={() => onChange('')} accessibilityLabel="Effacer la date" hitSlop={10}><X size={16} color={colors.muted} /></Pressable>
        )}
      </Pressable>

      {/* Android : boîte de dialogue native. iOS : calendrier dans une feuille. */}
      {open && Platform.OS === 'android' && picker}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View className="flex-1 justify-end bg-ink/40">
            <View className="rounded-t-[28px] bg-white p-4 pb-8">
              {picker}
              <Button title="Valider" onPress={() => setOpen(false)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
