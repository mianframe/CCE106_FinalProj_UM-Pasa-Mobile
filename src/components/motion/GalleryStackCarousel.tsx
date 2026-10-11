import React, { useState, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { themeTokens } from '../../theme/tokens';

interface GalleryStackCarouselProps {
  images: string[];
  height?: number;
  onImagePress?: (index: number) => void;
}

export function GalleryStackCarousel({
  images,
  height = 250,
  onImagePress,
}: GalleryStackCarouselProps) {
  const { width } = useWindowDimensions();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const C = themeTokens[mode].colors;

  const cardWidth = width - 28;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isStackMode, setIsStackMode] = useState(false); // starts in carousel or stack
  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<ScrollView>(null);
  const stackAnim = useRef(new Animated.Value(0)).current; // 0 = carousel, 1 = fanned stack

  if (!images || images.length === 0) return null;

  const toggleMode = () => {
    const nextMode = !isStackMode;
    setIsStackMode(nextMode);
    Animated.spring(stackAnim, {
      toValue: nextMode ? 1 : 0,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const offset = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(offset / cardWidth);
        if (newIndex >= 0 && newIndex < images.length && newIndex !== activeIndex) {
          setActiveIndex(newIndex);
        }
      },
    }
  );

  const jumpTo = (index: number) => {
    setActiveIndex(index);
    if (isStackMode) {
      toggleMode();
    }
    carouselRef.current?.scrollTo({ x: index * cardWidth, animated: true });
  };

  return (
    <View style={styles.container}>
      {/* Visual Mode Pill & Counter Bar */}
      <View style={styles.topControlRow}>
        <Pressable
          accessibilityRole="button"
          onPress={toggleMode}
          style={[
            styles.modePill,
            {
              backgroundColor: isDark ? 'rgba(30, 24, 24, 0.85)' : 'rgba(255, 255, 255, 0.92)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#E5D8D0',
            },
          ]}
        >
          <Ionicons
            name={isStackMode ? 'copy-outline' : 'albums-outline'}
            size={13}
            color={C.gold}
          />
          <Text style={[styles.modePillText, { color: isDark ? '#FFFFFF' : '#1C1917' }]}>
            {isStackMode ? 'Fanned Deck' : 'Gallery Stream'}
          </Text>
        </Pressable>

        <View
          style={[
            styles.counterBadge,
            {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(28, 25, 23, 0.78)',
              borderColor: 'rgba(255, 255, 255, 0.18)',
            },
          ]}
        >
          <Ionicons name="images" size={13} color={C.gold} />
          <Text style={styles.counterText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>
      </View>

      {/* Main Showcase View */}
      <View style={{ height, width: cardWidth, overflow: 'visible' }}>
        {isStackMode ? (
          // FANNED STACK VIEW (rnmotion.dev style)
          <View style={[styles.stackStage, { height, width: cardWidth }]}>
            {images.slice(0, 4).map((imgUri, idx) => {
              const count = Math.min(images.length, 4);
              // Calculate fan rotation (-6 deg to +6 deg) and fan offset
              const rotateDeg = (idx - (count - 1) / 2) * 4.5;
              const translateY = idx * 6;
              const scale = 1 - (count - 1 - idx) * 0.04;

              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.fannedCard,
                    {
                      width: cardWidth - 24,
                      height: height - 16,
                      zIndex: idx + 1,
                      transform: [
                        { translateY },
                        { rotate: `${rotateDeg}deg` },
                        { scale },
                      ],
                      shadowOpacity: isDark ? 0.5 : 0.22,
                    },
                  ]}
                >
                  <Pressable
                    style={{ flex: 1, borderRadius: 18, overflow: 'hidden' }}
                    onPress={() => {
                      jumpTo(idx);
                      if (onImagePress) onImagePress(idx);
                    }}
                  >
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.fullImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          // CENTERED SPRING CAROUSEL VIEW
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width: cardWidth, height }}
          >
            {images.map((imgUri, idx) => {
              // Interpolate dynamic scale and opacity as item moves into center
              const inputRange = [
                (idx - 1) * cardWidth,
                idx * cardWidth,
                (idx + 1) * cardWidth,
              ];

              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.93, 1.0, 0.93],
                extrapolate: 'clamp',
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.65, 1.0, 0.65],
                extrapolate: 'clamp',
              });

              return (
                <View
                  key={idx}
                  style={{
                    width: cardWidth,
                    height,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Animated.View
                    style={[
                      styles.carouselCard,
                      {
                        width: cardWidth,
                        height,
                        transform: [{ scale }],
                        opacity,
                      },
                    ]}
                  >
                    <Pressable
                      style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
                      onPress={() => onImagePress && onImagePress(idx)}
                    >
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.fullImage}
                        resizeMode="cover"
                      />
                    </Pressable>
                  </Animated.View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Morphing Dots Indicator */}
      <View style={styles.dotsRow}>
        {images.map((_, idx) => {
          const isActive = activeIndex === idx;
          return (
            <Pressable key={idx} onPress={() => jumpTo(idx)}>
              <View
                style={[
                  styles.dot,
                  {
                    width: isActive ? 20 : 6,
                    backgroundColor: isActive
                      ? C.gold
                      : isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(0, 0, 0, 0.2)',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Interactive Thumbnail Jump Strip */}
      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbStrip}
        >
          {images.map((imgUri, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => jumpTo(idx)}
                style={[
                  styles.thumbBox,
                  {
                    borderColor: isSelected ? C.gold : 'transparent',
                    borderWidth: isSelected ? 2.5 : 1,
                    opacity: isSelected ? 1 : 0.6,
                    transform: [{ scale: isSelected ? 1.05 : 1.0 }],
                  },
                ]}
              >
                <Image
                  source={{ uri: imgUri }}
                  style={styles.fullImage}
                  resizeMode="cover"
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    position: 'relative',
  },
  topControlRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modePillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  stackStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fannedCard: {
    position: 'absolute',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
    backgroundColor: '#000',
  },
  carouselCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  thumbStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  thumbBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
