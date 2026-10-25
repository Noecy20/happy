/**
 * Papier cadeau satiné + ruban champagne (élément signature de Happy).
 * Reproduit en SVG le CSS `.wrap-paper`, `.ribbon-v`, `.ribbon-h` du site web :
 * - fond à la couleur d'accent,
 * - fines rayures diagonales et reflet satiné,
 * - deux rubans dorés qui se croisent.
 * `ribbon` (0 → 1) permet d'animer l'apparition des rubans.
 */
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

export default function WrapPaper({ color, ribbons = true }: { color: string; ribbons?: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          {/* rayures diagonales très légères */}
          <Pattern id="stripes" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
            <Rect width="2" height="12" fill="#fff" opacity={0.08} />
          </Pattern>
          {/* reflet satiné */}
          <LinearGradient id="gloss" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#fff" stopOpacity="0.22" />
            <Stop offset="0.4" stopColor="#fff" stopOpacity="0" />
            <Stop offset="0.6" stopColor="#fff" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#fff" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="ribV" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#B98F55" /><Stop offset="0.5" stopColor="#E9CF9C" /><Stop offset="1" stopColor="#B98F55" />
          </LinearGradient>
          <LinearGradient id="ribH" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B98F55" /><Stop offset="0.5" stopColor="#E9CF9C" /><Stop offset="1" stopColor="#B98F55" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={color} />
        <Rect width="100%" height="100%" fill="url(#stripes)" />
        <Rect width="100%" height="100%" fill="url(#gloss)" />
      </Svg>
      {ribbons && <Ribbons />}
    </View>
  );
}

/** Les deux rubans (séparés pour pouvoir les animer indépendamment). */
export function RibbonV() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', marginLeft: -9, width: 18 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs><LinearGradient id="rv" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#B98F55" /><Stop offset="0.5" stopColor="#E9CF9C" /><Stop offset="1" stopColor="#B98F55" /></LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#rv)" />
      </Svg>
    </View>
  );
}
export function RibbonH() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -9, height: 18 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs><LinearGradient id="rh" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#B98F55" /><Stop offset="0.5" stopColor="#E9CF9C" /><Stop offset="1" stopColor="#B98F55" /></LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#rh)" />
      </Svg>
    </View>
  );
}
function Ribbons() {
  return <><RibbonV /><RibbonH /></>;
}
