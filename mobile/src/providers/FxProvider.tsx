/**
 * Effets globaux : messages éphémères (« toasts ») et confettis discrets.
 * Utilisation dans n'importe quel écran :
 *   const fx = useFx();
 *   fx.toast('Cadeau ajouté');            // message de succès
 *   fx.toast('Erreur…', 'err');            // message d'erreur
 *   fx.confetti(['#E0456B', '#C8A26A']);   // aux moments forts (publication, réservation, révélation)
 * Les confettis sont désactivés si l'utilisateur a activé « réduire les animations » dans son téléphone.
 */
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Text, View } from 'react-native';
import Animated, {
  Easing, FadeInDown, FadeOutDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

type Fx = { toast: (text: string, tone?: 'ok' | 'err') => void; confetti: (palette?: string[]) => void };
const FxContext = createContext<Fx>({ toast: () => {}, confetti: () => {} });
export const useFx = () => useContext(FxContext);

const DEFAULT_PALETTE = [colors.candy, colors.mango, '#EAD3A2', colors.plum, '#FFFFFF'];

export function FxProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string; tone: 'ok' | 'err' } | null>(null);
  const [burst, setBurst] = useState<{ id: number; palette: string[] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();

  const toast = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ id: Date.now(), text, tone });
    timer.current = setTimeout(() => setMsg(null), 3800);
  }, []);

  const confetti = useCallback((palette = DEFAULT_PALETTE) => {
    if (reduce) return; // accessibilité : pas d'animation décorative
    setBurst({ id: Date.now(), palette });
    setTimeout(() => setBurst(null), 2600);
  }, [reduce]);

  return (
    <FxContext.Provider value={{ toast, confetti }}>
      {children}
      {burst && <Confetti key={burst.id} palette={burst.palette} />}
      {msg && (
        <Animated.View
          key={msg.id}
          entering={FadeInDown} exiting={FadeOutDown}
          pointerEvents="none"
          style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 90, alignItems: 'center' }}
        >
          <View accessibilityLiveRegion="polite" className="flex-row items-center rounded-full px-5 py-3"
            style={{ backgroundColor: msg.tone === 'ok' ? colors.ink : colors.candy, maxWidth: '100%' }}>
            {msg.tone === 'ok' ? <CheckCircle2 size={17} color={colors.mango} /> : <AlertCircle size={17} color="#fff" />}
            <Text className="ml-2 flex-shrink font-semi text-[14px] text-white">{msg.text}</Text>
          </View>
        </Animated.View>
      )}
    </FxContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Confettis : 36 petits rectangles et ronds qui tombent en tournant     */
/* ------------------------------------------------------------------ */

const { width: W, height: H } = Dimensions.get('window');

function Confetti({ palette }: { palette: string[] }) {
  const pieces = useRef(
    Array.from({ length: 36 }, (_, i) => ({
      x: Math.random() * W,
      drift: (Math.random() - 0.5) * 120,
      delay: Math.random() * 400,
      size: 6 + Math.random() * 7,
      round: Math.random() > 0.55,
      color: palette[i % palette.length],
      spin: 180 + Math.random() * 540,
    })),
  ).current;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {pieces.map((p, i) => <Piece key={i} {...p} />)}
    </View>
  );
}

function Piece({ x, drift, delay, size, round, color, spin }: { x: number; drift: number; delay: number; size: number; round: boolean; color: string; spin: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 2000, easing: Easing.in(Easing.quad) }));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * 0.6,
    transform: [
      { translateX: x + drift * t.value },
      { translateY: -20 + t.value * (H * 0.85) },
      { rotate: `${spin * t.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', width: size, height: round ? size : size * 0.45, borderRadius: round ? size : 2, backgroundColor: color }, style]}
    />
  );
}
