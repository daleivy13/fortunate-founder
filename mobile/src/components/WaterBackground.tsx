import { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

const { width: W, height: H } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// HOW THIS WORKS
//
// Each "wave" is an SVG <Path> whose top edge is a real sine curve.  The path
// is 3× the screen width so we can loop it: we translate from 0 → -W
// (exactly one period) and loop, giving infinite seamless scrolling.
//
// Several thin wave bands sit at different vertical positions and scroll in
// alternating directions at different speeds.  Their light/dark contrast
// replicates how pool-surface ripples modulate the light passing through water.
//
// Tiny ripple rings + sun sparkle points complete the surface detail.
// Wobbly rising bubbles add subsurface depth.
// ─────────────────────────────────────────────────────────────────────────────

// ── Wave path builder ─────────────────────────────────────────────────────────
// Returns SVG path data for a wave-topped filled band.
//   centerY  – baseline Y of the sine wave
//   amp      – peak amplitude (px)
//   bandH    – height of the filled band below the wave crest
//   phase    – phase offset (0–2π) so layers don't all start in sync
function buildWavePath(centerY: number, amp: number, bandH: number, phase: number): string {
  const totalW = W * 3;
  const period = W;        // one full wave = one screen width → seamless -W loop
  const step   = 5;        // one vertex every 5px — smooth but not wasteful

  let d = "";
  for (let x = 0; x <= totalW; x += step) {
    const y = centerY + amp * Math.sin((x / period) * 2 * Math.PI + phase);
    d += x === 0 ? `M 0 ${y.toFixed(1)}` : ` L ${x} ${y.toFixed(1)}`;
  }
  // Close: straight line to bottom-right, bottom-left, back to start
  d += ` L ${totalW} ${centerY + bandH + amp} L 0 ${centerY + bandH + amp} Z`;
  return d;
}

// Pre-compute all paths once at module load (they never change)
interface WaveCfg {
  path:      string;
  color:     string;   // rgba fill
  duration:  number;   // ms per full loop (-W translation)
  direction: 1 | -1;  // 1 = left-to-right scroll, -1 = right-to-left
  delay:     number;
}

const WAVES: WaveCfg[] = [
  // ── Layer 1: broad deep swell — covers upper 45% of screen, very slow
  {
    path:     buildWavePath(H * 0.45, 22, H * 0.6, 0),
    color:    "rgba(0, 148, 196, 0.18)",
    duration: 14000, direction: 1, delay: 0,
  },
  // ── Layer 2: opposing swell — creates natural interference with layer 1
  {
    path:     buildWavePath(H * 0.40, 18, H * 0.65, Math.PI * 0.6),
    color:    "rgba(0, 168, 216, 0.14)",
    duration: 11000, direction: -1, delay: 0,
  },
  // ── Layer 3: bright mid-surface ripple — light catches the crest
  {
    path:     buildWavePath(H * 0.25, 16, 60, Math.PI * 0.3),
    color:    "rgba(160, 230, 255, 0.20)",
    duration:  8500, direction: 1, delay: 1200,
  },
  // ── Layer 4: opposing mid-ripple
  {
    path:     buildWavePath(H * 0.35, 14, 55, Math.PI * 0.9),
    color:    "rgba(130, 215, 248, 0.15)",
    duration: 10500, direction: -1, delay: 2800,
  },
  // ── Layer 5: fast shallow surface chop — the fine texture visible in photos
  {
    path:     buildWavePath(H * 0.14, 10, 40, Math.PI * 1.4),
    color:    "rgba(200, 244, 255, 0.18)",
    duration:  6000, direction: 1, delay: 500,
  },
  // ── Layer 6: opposing surface chop
  {
    path:     buildWavePath(H * 0.20, 12, 45, Math.PI * 0.1),
    color:    "rgba(180, 236, 255, 0.14)",
    duration:  7500, direction: -1, delay: 3500,
  },
  // ── Layer 7: deep undulation — lower screen, dimmer
  {
    path:     buildWavePath(H * 0.60, 24, H * 0.45, Math.PI * 0.5),
    color:    "rgba(0, 128, 180, 0.13)",
    duration: 13000, direction: -1, delay: 1800,
  },
  // ── Layer 8: slow deep counter-wave
  {
    path:     buildWavePath(H * 0.68, 20, H * 0.38, Math.PI * 1.2),
    color:    "rgba(0, 110, 165, 0.11)",
    duration: 16000, direction: 1, delay: 4000,
  },
];

function WaveLayer({ cfg }: { cfg: WaveCfg }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue:         1,
        duration:        cfg.duration,
        delay:           cfg.delay,
        easing:          Easing.linear,   // constant scroll speed — like real water current
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Translate one full period (-W) in the chosen direction, then loop
  const translateX = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, -W * cfg.direction],
  });

  return (
    <Animated.View
      style={{ position: "absolute", top: 0, left: 0, transform: [{ translateX }] }}
      pointerEvents="none"
    >
      <Svg width={W * 3} height={H}>
        <Path d={cfg.path} fill={cfg.color} />
      </Svg>
    </Animated.View>
  );
}

// ── Expanding ripple rings ────────────────────────────────────────────────────
interface RippleCfg { top: number; left: number; size: number; dur: number; delay: number; }
const RIPPLES: RippleCfg[] = [
  { top: H * .07, left: W * .28, size: 34, dur: 2800, delay: 0    },
  { top: H * .13, left: W * .71, size: 24, dur: 3400, delay: 1400 },
  { top: H * .04, left: W * .54, size: 44, dur: 3100, delay: 700  },
  { top: H * .09, left: W * .12, size: 30, dur: 2500, delay: 2200 },
  { top: H * .16, left: W * .85, size: 20, dur: 4000, delay: 500  },
  { top: H * .06, left: W * .44, size: 28, dur: 3300, delay: 1900 },
];

function Ripple({ r }: { r: RippleCfg }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(r.delay),
      Animated.timing(a, { toValue: 1, duration: r.dur, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(500),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.1, 3.5] });
  const op    = a.interpolate({ inputRange: [0, .1, .65, 1], outputRange: [0, .5, .18, 0] });
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: r.top - r.size / 2, left: r.left - r.size / 2,
        width: r.size, height: r.size, borderRadius: r.size / 2,
        borderWidth: 1.5, borderColor: "rgba(255,255,255,0.85)",
        transform: [{ scale }], opacity: op,
      }}
      pointerEvents="none"
    />
  );
}

// ── Sun sparkle points ────────────────────────────────────────────────────────
interface SparkleCfg { top: number; left: number; size: number; dur: number; delay: number; rest: number; }
const SPARKLES: SparkleCfg[] = [
  { top: H*.04, left: W*.18, size: 5, dur: 500,  delay: 0,    rest: 2500 },
  { top: H*.08, left: W*.63, size: 4, dur: 700,  delay: 900,  rest: 1800 },
  { top: H*.02, left: W*.86, size: 6, dur: 450,  delay: 1700, rest: 3000 },
  { top: H*.11, left: W*.40, size: 4, dur: 650,  delay: 450,  rest: 2200 },
  { top: H*.05, left: W*.92, size: 5, dur: 820,  delay: 1300, rest: 3100 },
  { top: H*.07, left: W*.06, size: 3, dur: 580,  delay: 2300, rest: 2700 },
  { top: H*.14, left: W*.75, size: 4, dur: 720,  delay: 350,  rest: 3500 },
  { top: H*.01, left: W*.51, size: 5, dur: 640,  delay: 2000, rest: 2000 },
];

function Sparkle({ s }: { s: SparkleCfg }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(s.delay),
      Animated.timing(a, { toValue: 1, duration: s.dur / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: s.dur / 2, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
      Animated.delay(s.rest),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = a.interpolate({ inputRange: [0, .4, 1], outputRange: [0, 2.0, 0] });
  const op    = a.interpolate({ inputRange: [0, .3, .7, 1], outputRange: [0, .95, .85, 0] });
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: s.top - s.size / 2, left: s.left - s.size / 2,
        width: s.size, height: s.size, borderRadius: s.size / 2,
        backgroundColor: "#fff",
        transform: [{ scale }], opacity: op,
      }}
      pointerEvents="none"
    />
  );
}

// ── Wobbling rising bubbles ───────────────────────────────────────────────────
interface BubbleCfg { startX: number; size: number; delay: number; speed: number; wobble: number; }
const BUBBLES: BubbleCfg[] = [
  { startX: W*.15, size: 8,  delay: 0,    speed: 6200, wobble: 9  },
  { startX: W*.38, size: 5,  delay: 1600, speed: 8400, wobble: 5  },
  { startX: W*.62, size: 10, delay: 850,  speed: 7100, wobble: 11 },
  { startX: W*.80, size: 6,  delay: 2600, speed: 9200, wobble: 6  },
  { startX: W*.05, size: 4,  delay: 3300, speed: 7700, wobble: 4  },
  { startX: W*.50, size: 7,  delay: 4200, speed: 6700, wobble: 8  },
  { startX: W*.28, size: 3,  delay: 700,  speed: 9800, wobble: 3  },
];

function Bubble({ b }: { b: BubbleCfg }) {
  const rise   = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const period = 900 + b.size * 70;
    Animated.loop(
      Animated.timing(rise, { toValue: 1, duration: b.speed, delay: b.delay, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(Animated.sequence([
      Animated.timing(wobble, { toValue:  1, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wobble, { toValue: -1, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    return () => { rise.stopAnimation(); wobble.stopAnimation(); };
  }, []);
  const ty = rise.interpolate({ inputRange: [0, 1], outputRange: [H + 20, -20] });
  const tx = wobble.interpolate({ inputRange: [-1, 0, 1], outputRange: [-b.wobble, 0, b.wobble] });
  const op = rise.interpolate({ inputRange: [0, .08, .82, 1], outputRange: [0, .38, .22, 0] });
  const sc = rise.interpolate({ inputRange: [0, .4, .85, 1],  outputRange: [.7, 1.15, 1.0, .85] });
  return (
    <Animated.View
      style={{
        position: "absolute", left: b.startX,
        width: b.size, height: b.size, borderRadius: b.size / 2,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
        backgroundColor: "rgba(255,255,255,0.1)",
        transform: [{ translateY: ty }, { translateX: tx }, { scale: sc }],
        opacity: op,
      }}
      pointerEvents="none"
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface WaterBackgroundProps {
  children: React.ReactNode;
  variant?: "deep" | "surface";
  style?: object;
}

export function WaterBackground({ children, variant = "deep", style }: WaterBackgroundProps) {
  const gradient = variant === "deep"
    ? (["#004d7a", "#0077a8", "#009ec4", "#1ebbd7", "#48cae4", "#7dd8ee"] as const)
    : (["#0088bb", "#00a8d0", "#3ec6e0", "#7dd8ee"] as const);

  return (
    <View style={[styles.container, style]}>
      {/* Rich aqua gradient — the base water color */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Scrolling sine-wave layers — the actual water motion */}
      {WAVES.map((w, i) => <WaveLayer key={i} cfg={w} />)}

      {/* Surface detail */}
      {RIPPLES.map((r, i)  => <Ripple   key={i} r={r} />)}
      {SPARKLES.map((s, i) => <Sparkle  key={i} s={s} />)}
      {BUBBLES.map((b, i)  => <Bubble   key={i} b={b} />)}

      {/* Bright entry point where sunlight hits the surface */}
      <LinearGradient
        colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0)"]}
        style={styles.surfaceLight}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, overflow: "hidden" },
  surfaceLight: { position: "absolute", top: 0, left: 0, right: 0, height: 180 },
});
