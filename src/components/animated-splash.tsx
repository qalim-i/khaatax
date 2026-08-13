import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

/**
 * KhaataX intro splash.
 *
 * Two splashes run back to back and the handoff between them is the whole point:
 *
 *  1. The *native* splash (configured by the `expo-splash-screen` plugin in
 *     app.json) is up from the moment the process starts. `_layout.tsx` calls
 *     `preventAutoHideAsync()` at import time so it does not disappear the
 *     instant the first JS frame renders.
 *  2. This component mounts underneath it, and only once it has laid out — i.e.
 *     the logo is already on screen — does it call `hideAsync()`. Both screens
 *     draw the same mark on the same `#082722`, so the swap is invisible.
 *
 * Then the sequence runs: logo pops in, a progress bar fills, the whole thing
 * fades out to reveal the app.
 */

const { width } = Dimensions.get('window');
/*
  The logo asset is the adaptive-icon foreground: the mark occupies about 65% of
  a square canvas, the rest transparent padding. Sizing the *box* at 45% of the
  screen would render the mark itself at under 30%, so the box runs wider and
  `contain` does the rest.
*/
const LOGO_SIZE = Math.min(width * 0.72, 320);

const BACKGROUND = '#082722';
const BAR_FILL = '#2ECC71';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  /*
    `useState` with a lazy initialiser rather than `useRef(new Animated.Value(x))`.
    Two reasons, and only the second is about lint: the ref form constructs a
    fresh Animated.Value on every render and throws it away (useRef ignores its
    argument after the first call), and reading `.current` during render is what
    react-hooks/refs flags. The initialiser runs exactly once.
  */
  const [logoScale] = useState(() => new Animated.Value(0.7));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [barProgress] = useState(() => new Animated.Value(0));
  const [screenOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(barProgress, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.ease),
        // Width is not a transform, so this leg cannot run on the native driver.
        useNativeDriver: false,
      }),
      // A beat with the bar full, so it does not vanish the moment it lands.
      Animated.delay(150),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    // An unmount mid-animation (fast refresh, a signed-out redirect) would
    // otherwise leave the sequence running against a dead component.
    return () => sequence.stop();
  }, [barProgress, logoOpacity, logoScale, screenOpacity]);

  /*
    Hiding the native splash is deliberately tied to layout rather than to a
    timer: until this view has measured, hiding it would expose a blank frame.
  */
  const handleLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {
      // Already hidden, or the module is unavailable on web — the JS splash is
      // drawn either way, so there is nothing to recover from.
    });
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[styles.overlay, { opacity: screenOpacity }]}>
      <Animated.Image
        source={require('@/assets/images/khataX_foreground.png')}
        resizeMode="contain"
        style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      />
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    // On the style rather than the `pointerEvents` prop, which RN has deprecated.
    pointerEvents: 'none',
    zIndex: 1000,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: 28,
  },
  barTrack: {
    width: Math.min(width * 0.4, 200),
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: BAR_FILL,
    borderRadius: 2,
  },
});
