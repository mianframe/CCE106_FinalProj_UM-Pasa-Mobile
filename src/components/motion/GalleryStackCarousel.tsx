import React, { useState, useRef, useEffect } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
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
  height = 260,
  onImagePress,
}: GalleryStackCarouselProps) {
  const { width, height: screenHeight } = useWindowDimensions();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const C = themeTokens[mode].colors;

  // Filter out any empty, invalid strings
  const validImages = (images || []).filter(img => typeof img === 'string' && img.trim().length > 0);

  const cardWidth = Math.max(width - 28, 200);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const carouselRef = useRef<ScrollView>(null);
  const lightboxScrollRef = useRef<ScrollView>(null);

  // When lightbox opens, scroll it to the active photo smoothly
  useEffect(() => {
    if (lightboxIndex !== null) {
      setTimeout(() => {
        try {
          lightboxScrollRef.current?.scrollTo({
            x: lightboxIndex * width,
            y: 0,
            animated: false,
          });
        } catch (_) {}
      }, 50);
    }
  }, [lightboxIndex, width]);

  if (validImages.length === 0) return null;

  const scrollToCard = (index: number) => {
    if (index < 0 || index >= validImages.length) return;
    setActiveIndex(index);
    try {
      carouselRef.current?.scrollTo({
        x: index * cardWidth,
        y: 0,
        animated: true,
      });
    } catch (_) {}
  };

  const handleMainScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / cardWidth);
    if (newIdx >= 0 && newIdx < validImages.length && newIdx !== activeIndex) {
      setActiveIndex(newIdx);
    }
  };

  const handleImageTap = (index: number) => {
    try {
      if (onImagePress) onImagePress(index);
    } catch (_) {}
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextLightboxPhoto = () => {
    if (lightboxIndex === null) return;
    const next = Math.min(lightboxIndex + 1, validImages.length - 1);
    setLightboxIndex(next);
    setActiveIndex(next);
    lightboxScrollRef.current?.scrollTo({ x: next * width, y: 0, animated: true });
  };

  const prevLightboxPhoto = () => {
    if (lightboxIndex === null) return;
    const prev = Math.max(lightboxIndex - 1, 0);
    setLightboxIndex(prev);
    setActiveIndex(prev);
    lightboxScrollRef.current?.scrollTo({ x: prev * width, y: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      {/* Main Image Carousel */}
      <View style={{ height, width: cardWidth, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1A1818' }}>
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMainScroll}
          scrollEventThrottle={16}
          style={{ width: cardWidth, height }}
        >
          {validImages.map((uri, idx) => (
            <Pressable
              key={uri + idx}
              onPress={() => handleImageTap(idx)}
              style={({ pressed }) => [
                { width: cardWidth, height, justifyContent: 'center', alignItems: 'center' },
                pressed && { opacity: 0.92 },
              ]}
            >
              <Image
                source={{ uri }}
                style={{ width: cardWidth, height }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>

        {/* Counter Badge Floating on Image */}
        {validImages.length > 1 && (
          <View style={styles.floatingCounter}>
            <Ionicons name="images" size={13} color="#F6C84C" />
            <Text style={styles.floatingCounterText}>
              {activeIndex + 1} / {validImages.length}
            </Text>
          </View>
        )}

        {/* Tap to zoom hint */}
        <View style={styles.floatingZoomHint}>
          <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
          <Text style={{ fontSize: 10.5, color: '#FFFFFF', fontWeight: '700' }}>Tap to view</Text>
        </View>
      </View>

      {/* Dots Indicator */}
      {validImages.length > 1 && (
        <View style={styles.dotsRow}>
          {validImages.map((_, idx) => {
            const isActive = activeIndex === idx;
            return (
              <Pressable
                key={idx}
                hitSlop={8}
                onPress={() => scrollToCard(idx)}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      width: isActive ? 22 : 6,
                      backgroundColor: isActive
                        ? C.gold
                        : isDark
                        ? 'rgba(255, 255, 255, 0.25)'
                        : 'rgba(0, 0, 0, 0.22)',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Thumbnail Bar for Quick Jumps */}
      {validImages.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbStrip}
        >
          {validImages.map((uri, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <Pressable
                key={uri + idx}
                onPress={() => scrollToCard(idx)}
                style={[
                  styles.thumbBox,
                  {
                    borderColor: isSelected ? C.gold : 'transparent',
                    borderWidth: isSelected ? 2.5 : 1,
                    opacity: isSelected ? 1 : 0.65,
                    transform: [{ scale: isSelected ? 1.05 : 1.0 }],
                  },
                ]}
              >
                <Image
                  source={{ uri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <Modal
        visible={lightboxIndex !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={closeLightbox}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.lightboxContainer}>
          {/* Top Bar with Safe Insets & High-Contrast Close Button */}
          <View style={[styles.lightboxTopBar, { paddingTop: Math.max(Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 28), 36) }]}>
            <View style={styles.lightboxBadge}>
              <Ionicons name="images" size={14} color="#F6C84C" />
              <Text style={styles.lightboxBadgeText}>
                {((lightboxIndex ?? 0) + 1)} of {validImages.length}
              </Text>
            </View>

            {/* HIGH-VISIBILITY, RELIABLE CLOSE BUTTON */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close full screen photo viewer"
              onPress={closeLightbox}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              style={({ pressed }) => [
                styles.prominentCloseBtn,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>

          {/* Center Image Swiper (View container so horizontal swiping does not accidentally dismiss) */}
          <View style={{ flex: 1, width, justifyContent: 'center' }}>
            <ScrollView
              ref={lightboxScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const newIdx = Math.round(e.nativeEvent.contentOffset.x / width);
                if (newIdx >= 0 && newIdx < validImages.length) {
                  setLightboxIndex(newIdx);
                  setActiveIndex(newIdx);
                }
              }}
              style={{ width, flex: 1 }}
            >
              {validImages.map((uri, idx) => (
                <View
                  key={uri + idx}
                  style={{
                    width,
                    height: screenHeight - 160,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 8,
                  }}
                >
                  <Image
                    source={{ uri }}
                    style={{
                      width: width - 16,
                      height: screenHeight - 220,
                    }}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>

            {/* Arrow Navigation Buttons */}
            {validImages.length > 1 && (
              <>
                {(lightboxIndex ?? 0) > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous image"
                    onPress={prevLightboxPhoto}
                    hitSlop={15}
                    style={[styles.arrowNavBtn, { left: 14 }]}
                  >
                    <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                  </Pressable>
                )}
                {(lightboxIndex ?? 0) < validImages.length - 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next image"
                    onPress={nextLightboxPhoto}
                    hitSlop={15}
                    style={[styles.arrowNavBtn, { right: 14 }]}
                  >
                    <Ionicons name="chevron-forward" size={26} color="#FFFFFF" />
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Bottom Bar with Done Button and Thumbnails */}
          <View style={styles.lightboxBottomBar}>
            {validImages.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 16, marginBottom: 12 }}
              >
                {validImages.map((uri, idx) => {
                  const isCur = lightboxIndex === idx;
                  return (
                    <Pressable
                      key={uri + idx}
                      onPress={() => {
                        setLightboxIndex(idx);
                        setActiveIndex(idx);
                        lightboxScrollRef.current?.scrollTo({ x: idx * width, y: 0, animated: true });
                      }}
                      style={[
                        styles.lightboxThumb,
                        {
                          borderColor: isCur ? '#F6C84C' : 'rgba(255, 255, 255, 0.25)',
                          borderWidth: isCur ? 2.5 : 1,
                          opacity: isCur ? 1 : 0.5,
                        },
                      ]}
                    >
                      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Explicit Done / Exit Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done viewing photos"
              onPress={closeLightbox}
              hitSlop={15}
              style={({ pressed }) => [
                styles.doneBtn,
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Done viewing</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    position: 'relative',
  },
  floatingCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  floatingCounterText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  floatingZoomHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
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
  lightboxContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 12,
    zIndex: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  lightboxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  lightboxBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  prominentCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  arrowNavBtn: {
    position: 'absolute',
    top: '46%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  lightboxBottomBar: {
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  lightboxThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  doneBtn: {
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
