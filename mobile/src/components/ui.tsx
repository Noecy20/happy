/**
 * Kit d'interface Happy : briques réutilisées sur tous les écrans.
 * Style : élégant (Cormorant pour les titres, Manrope pour le texte), cartes très arrondies,
 * boutons en pilule, zones tactiles d'au moins 44 px, aucun emoji (uniquement des icônes lucide).
 */
import type { LucideIcon } from 'lucide-react-native';
import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  Switch, Text, TextInput, View, type TextInputProps, type TextProps, type ViewProps, type StyleProp, type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, fonts, shadow } from '@/lib/theme';

/** Concatène des classes en ignorant les valeurs vides. */
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ */
/* Textes                                                               */
/* ------------------------------------------------------------------ */

/** Texte courant (Manrope). */
export function Txt({ className, ...p }: TextProps & { className?: string }) {
  return <Text {...p} className={cn('font-body text-[15px] text-ink', className)} />;
}

/** Titre (Cormorant Garamond 600) : serré, élégant. */
export function Title({ className, ...p }: TextProps & { className?: string }) {
  return <Text {...p} className={cn('font-display text-[34px] leading-[38px] text-ink', className)} />;
}

/** Petit libellé au-dessus d'un champ. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn('mb-1.5 font-semi text-[13px] text-ink/75', className)}>{children}</Text>;
}

/* ------------------------------------------------------------------ */
/* Boutons                                                              */
/* ------------------------------------------------------------------ */

type BtnVariant = 'primary' | 'candy' | 'ghost' | 'light' | 'glass' | 'danger';

const BTN: Record<BtnVariant, { box: string; text: string; icon: string }> = {
  primary: { box: 'bg-ink', text: 'text-white', icon: '#fff' },
  candy: { box: 'bg-candy', text: 'text-white', icon: '#fff' },
  ghost: { box: 'bg-white border border-ink/15', text: 'text-ink', icon: colors.ink },
  light: { box: 'bg-white', text: 'text-ink', icon: colors.ink },
  glass: { box: 'bg-white/10 border border-white/20', text: 'text-white', icon: '#fff' },
  danger: { box: 'bg-white border border-candy/40', text: 'text-candy', icon: colors.candy },
};

/**
 * Bouton en pilule. `color` permet d'utiliser la couleur de thème du célébrant
 * (le texte devient alors automatiquement lisible grâce à `textColor`).
 */
export function Button({
  title, onPress, variant = 'primary', icon: Icon, loading, disabled, className, small, color, textColor,
}: {
  title: string; onPress?: () => void; variant?: BtnVariant; icon?: LucideIcon; loading?: boolean; disabled?: boolean;
  className?: string; small?: boolean; color?: string; textColor?: string;
}) {
  const v = BTN[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      className={cn(
        'flex-row items-center justify-center rounded-full px-5',
        small ? 'min-h-[44px] py-2' : 'min-h-[52px] py-3.5',
        !color && v.box, off && 'opacity-50', !off && 'active:opacity-80', className,
      )}
      // Style statique (une fonction `style` ferait ignorer les classes NativeWind)
      style={color ? { backgroundColor: color } : undefined}
    >
      {loading ? (
        <ActivityIndicator color={textColor || v.icon} />
      ) : (
        <>
          {Icon && <Icon size={small ? 15 : 17} color={textColor || v.icon} style={{ marginRight: 8 }} />}
          <Text className={cn('font-bold2', small ? 'text-[14px]' : 'text-[15px]', !textColor && v.text)} style={textColor ? { color: textColor } : undefined}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Bouton rond avec une seule icône (44 px minimum). */
export function IconButton({ icon: Icon, onPress, label, color = colors.ink, className, badge }: {
  icon: LucideIcon; onPress?: () => void; label: string; color?: string; className?: string; badge?: number;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      className={cn('h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white', className)}>
      <Icon size={18} color={color} />
      {!!badge && (
        <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-paper bg-candy px-1">
          <Text className="font-bold2 text-[10px] text-white">{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Champs de saisie                                                     */
/* ------------------------------------------------------------------ */

/** Champ texte avec libellé. Les claviers remontent grâce à <Screen> (KeyboardAvoidingView). */
export const Field = forwardRef<TextInput, TextInputProps & { label?: string; hint?: string; className?: string; inputClassName?: string }>(
  function Field({ label, hint, className, inputClassName, multiline, ...p }, ref) {
    return (
      <View className={cn('mb-4', className)}>
        {label && <Label>{label}</Label>}
        <TextInput
          ref={ref}
          placeholderTextColor="rgba(30,20,40,0.35)"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...p}
          className={cn(
            'rounded-2xl border border-ink/10 bg-white px-4 font-body text-[15px] text-ink',
            multiline ? 'min-h-[84px] py-3' : 'min-h-[50px] py-3',
            p.editable === false && 'bg-paper text-ink/50', inputClassName,
          )}
        />
        {hint && <Text className="mt-1 font-body text-[12px] text-ink/55">{hint}</Text>}
      </View>
    );
  },
);

/** Interrupteur avec titre et explication (ex. « J'organise une fête »). */
export function Toggle({ value, onChange, label, hint, icon: Icon, color = colors.candy }: {
  value: boolean; onChange: (v: boolean) => void; label: string; hint?: string; icon?: LucideIcon; color?: string;
}) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}
      className="mb-4 min-h-[56px] flex-row items-center rounded-2xl border border-ink/[0.08] bg-white px-4 py-3">
      <View className="flex-1 pr-3">
        <View className="flex-row items-center">
          {Icon && <Icon size={17} color={color} style={{ marginRight: 8 }} />}
          <Text className="font-bold2 text-[14px] text-ink">{label}</Text>
        </View>
        {hint && <Text className="mt-0.5 font-body text-[12px] text-ink/55">{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color, false: 'rgba(30,20,40,0.15)' }} thumbColor="#fff" />
    </Pressable>
  );
}

/** Sélecteur à onglets (« Mon anniversaire / Ma boutique », « Une durée / Du … au … »). */
export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { key: T; label: string; icon?: LucideIcon }[];
}) {
  return (
    <View className="mb-4 flex-row rounded-2xl bg-lilac/60 p-1.5" accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            className={cn('min-h-[44px] flex-1 flex-row items-center justify-center rounded-xl px-2', on && 'bg-white')}
            style={on ? shadow.sm : undefined}>
            {o.icon && <o.icon size={16} color={on ? colors.ink : colors.muted} style={{ marginRight: 6 }} />}
            <Text className={cn('font-bold2 text-[13px]', on ? 'text-ink' : 'text-ink/55')} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pastilles de choix (variantes, filtres, durées). */
export function Pills<T extends string | number>({ value, onChange, options, className }: {
  value: T | null | undefined; onChange: (v: T) => void; options: { key: T; label: string }[]; className?: string;
}) {
  return (
    <View className={cn('flex-row flex-wrap gap-2', className)}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={String(o.key)} onPress={() => onChange(o.key)} accessibilityState={{ selected: on }}
            className={cn('min-h-[40px] justify-center rounded-full border px-4', on ? 'border-ink bg-ink' : 'border-ink/15 bg-white')}>
            <Text className={cn('font-semi text-[13px]', on ? 'text-white' : 'text-ink')}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Conteneurs                                                           */
/* ------------------------------------------------------------------ */

/** Carte blanche arrondie à ombre douce. */
export function Card({ className, style, ...p }: ViewProps & { className?: string }) {
  return <View {...p} className={cn('rounded-[28px] border border-ink/[0.07] bg-white p-5', className)} style={[shadow.sm, style]} />;
}

/** Pastille d'information (statut, stock, emballage…). */
export function Badge({ label, tone = 'lilac', icon: Icon }: { label: string; tone?: 'lilac' | 'mint' | 'candy' | 'gold' | 'plum' | 'muted'; icon?: LucideIcon }) {
  const t = {
    lilac: ['bg-lilac', 'text-ink', colors.ink],
    mint: ['bg-mint/15', 'text-mint', colors.mint],
    candy: ['bg-candy/10', 'text-candy', colors.candy],
    gold: ['bg-mango/20', 'text-[#8A6A35]', colors.gold],
    plum: ['bg-plum/10', 'text-plum', colors.plum],
    muted: ['bg-ink/5', 'text-ink/55', colors.muted],
  }[tone];
  return (
    <View className={cn('flex-row items-center self-start rounded-full px-2.5 py-1', t[0])}>
      {Icon && <Icon size={12} color={t[2]} style={{ marginRight: 4 }} />}
      <Text className={cn('font-bold2 text-[11px]', t[1])}>{label}</Text>
    </View>
  );
}

/** Indicateur de chargement centré. */
export function Loading({ className }: { className?: string }) {
  return (
    <View className={cn('flex-1 items-center justify-center py-16', className)}>
      <ActivityIndicator size="large" color={colors.candy} />
    </View>
  );
}

/** Message quand une liste est vide (bordure pointillée, comme sur le web). */
export function Empty({ text, icon: Icon, children }: { text: string; icon?: LucideIcon; children?: ReactNode }) {
  return (
    <View className="items-center rounded-3xl border-2 border-dashed border-ink/15 px-6 py-10">
      {Icon && <Icon size={30} color="rgba(30,20,40,0.35)" />}
      <Text className="mt-3 text-center font-body text-[14px] text-ink/55">{text}</Text>
      {children}
    </View>
  );
}

/** Tuile statistique (grand chiffre en Cormorant). */
export function Stat({ value, label, highlight, color }: { value: number | string; label: string; highlight?: boolean; color?: string }) {
  const bg = highlight ? color || colors.candy : '#fff';
  return (
    <View className={cn('min-w-[46%] flex-1 rounded-3xl p-4', !highlight && 'border border-ink/[0.07]')} style={[{ backgroundColor: bg }, !highlight && shadow.sm]}>
      <Text className="font-display text-[40px] leading-[42px]" style={{ color: highlight ? '#fff' : colors.ink }}>{value}</Text>
      <Text className="mt-1 font-semi text-[12px]" style={{ color: highlight ? 'rgba(255,255,255,0.85)' : colors.muted }}>{label}</Text>
    </View>
  );
}

/**
 * Écran standard : zone sûre (encoche), défilement, clavier qui remonte,
 * et « tirer pour rafraîchir » si `onRefresh` est fourni.
 */
export function Screen({ children, onRefresh, refreshing = false, className, contentStyle, scroll = true, edges = ['top'], bg = colors.paper }: {
  children: ReactNode; onRefresh?: () => void; refreshing?: boolean; className?: string;
  contentStyle?: StyleProp<ViewStyle>; scroll?: boolean; edges?: ('top' | 'bottom')[]; bg?: string;
}) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: 40 }, contentStyle]}
            className={className}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.candy} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Feuille modale (bas de l'écran) : formulaires, suivi de commande, fiche utilisateur…
 * Le contenu défile et le clavier ne cache jamais les champs.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-ink/50">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fermer" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ maxHeight: '92%' }}>
          <View className="rounded-t-[32px] bg-paper" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <View className="items-center pt-3"><View className="h-1.5 w-12 rounded-full bg-ink/15" /></View>
            <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
              <Text className="flex-1 font-display text-[28px] leading-[32px] text-ink" numberOfLines={2}>{title || ''}</Text>
              <IconButton icon={X} label="Fermer" onPress={onClose} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** Message d'erreur sous un formulaire. */
export function ErrorText({ text }: { text?: string | null }) {
  if (!text) return null;
  return <Text className="mb-3 font-semi text-[14px] text-candy">{text}</Text>;
}

/** Ligne icône + texte (date, lieu, téléphone…). */
export function InfoRow({ icon: Icon, text, color = colors.candy, onPress, className }: {
  icon: LucideIcon; text: string; color?: string; onPress?: () => void; className?: string;
}) {
  const content = (
    <View className={cn('mb-2 flex-row items-start', className)}>
      <Icon size={16} color={color} style={{ marginTop: 2, marginRight: 8 }} />
      <Text className={cn('flex-1 font-body text-[14px] text-ink/80', onPress && 'underline')}>{text}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="link">{content}</Pressable> : content;
}

export { fonts };
