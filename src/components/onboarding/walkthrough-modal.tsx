import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { colors, radius, spacing, typography } from '@/constants/design-tokens';
import type { WalkthroughSlide } from '@/lib/onboarding';

interface WalkthroughModalProps {
  visible: boolean;
  slides: WalkthroughSlide[];
  onDone: () => void;
}

/*
  A takeover rather than the bottom sheet the forms use — there is nothing behind
  it worth keeping in view, and a sheet tall enough for a paged carousel is just a
  full screen with a gap at the top.

  Page width comes from onLayout rather than `useWindowDimensions` so paging stays
  aligned under rotation and on whatever inset the platform gives us.
*/
export function WalkthroughModal({ visible, slides, onDone }: WalkthroughModalProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  if (slides.length === 0) return null;

  const lastPage = slides.length - 1;
  const onLast = page >= lastPage;

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth === width) return;
    setWidth(nextWidth);

    // Rotating the device leaves a scroll offset that was measured in the old
    // width, which parks the carousel between two slides. Snap back onto the
    // current page once the children have re-laid out at the new one.
    if (width > 0) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ x: page * nextWidth, animated: false })
      );
    }
  }

  /*
    Driven by onScroll rather than onMomentumScrollEnd: momentum events only fire
    for a touch-flung scroll, so on react-native-web a programmatic scrollTo from
    the Next button moved the carousel while leaving the dots — and the page index
    Next itself reads — stuck on the first slide.
  */
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width === 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== page) setPage(next);
  }

  function handleNext() {
    if (onLast) {
      onDone();
      return;
    }
    // Paging is driven by the scroll position, so move the view and let
    // handleScroll settle the index rather than setting both here.
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDone}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            onPress={onDone}
            accessibilityRole="button">
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.pager} onLayout={handleLayout}>
          {width > 0 ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={handleScroll}>
              {slides.map((slide) => (
                <View key={slide.key} style={[styles.slide, { width }]}>
                  <View style={styles.iconWell}>
                    <Icon name={slide.icon} width={40} height={40} color={colors.brand} />
                  </View>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.body}>{slide.body}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View key={slide.key} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
            onPress={handleNext}
            accessibilityRole="button">
            <Text style={styles.nextLabel}>{onLast ? 'Get Started' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  skipButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconWell: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.brand,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLabel: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.white,
  },
});
