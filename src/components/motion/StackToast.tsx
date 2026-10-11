import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { themeTokens } from '../../theme/tokens';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type?: string;
  related_type?: string;
  related_id?: string;
  duration?: number;
  onPress?: () => void;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'> | ToastItem) => void;
  hideToast: (id?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

export const useStackToast = () => useContext(ToastContext);

const MAX_VISIBLE_STACK = 3;
const DISMISS_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.55;

export function StackToastProvider({
  children,
  onToastPress,
}: {
  children: React.ReactNode;
  onToastPress?: (toast: ToastItem) => void;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { mode } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = mode === 'dark';
  const { width } = useWindowDimensions();

  // Animation values for front toast gesture
  const panY = useRef(new Animated.Value(0)).current;
  const panOpacity = useRef(new Animated.Value(1)).current;
  const entryAnim = useRef(new Animated.Value(-120)).current;

  // Auto-dismiss timers map
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  const clearTimer = (id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  };

  const removeToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
    // Reset pan animation
    panY.setValue(0);
    panOpacity.setValue(1);
  }, [panY, panOpacity]);

  const showToast = useCallback((item: Omit<ToastItem, 'id'> | ToastItem) => {
    const id = 'id' in item && item.id ? item.id : `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const fullItem: ToastItem = { ...item, id };

    setToasts((prev) => {
      // Avoid duplicate consecutive identical IDs
      const filtered = prev.filter((t) => t.id !== id);
      return [fullItem, ...filtered].slice(0, 5); // Keep max 5 in memory
    });

    // Spring entry from top
    entryAnim.setValue(-90);
    Animated.spring(entryAnim, {
      toValue: 0,
      tension: 75,
      friction: 9,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss duration
    const dur = item.duration ?? 4000;
    clearTimer(id);
    timers.current[id] = setTimeout(() => {
      removeToast(id);
    }, dur);
  }, [entryAnim, removeToast]);

  const hideToast = useCallback((id?: string) => {
    if (id) {
      removeToast(id);
    } else if (toasts.length > 0) {
      removeToast(toasts[0].id);
    }
  }, [toasts, removeToast]);

  // Front toast gesture responder for swipe-to-dismiss with spring physics
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 7,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          // Dragging up (dismiss direction): 1:1 translation
          panY.setValue(gesture.dy);
          const newOpacity = Math.max(0, 1 - Math.abs(gesture.dy) / 100);
          panOpacity.setValue(newOpacity);
        } else {
          // Dragging down: rubber-band resistance
          panY.setValue(gesture.dy * 0.35);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -DISMISS_THRESHOLD || gesture.vy < -VELOCITY_THRESHOLD) {
          // Commit dismiss upwards
          Animated.timing(panY, {
            toValue: -140,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            if (toasts.length > 0) {
              removeToast(toasts[0].id);
            }
          });
        } else {
          // Spring bounce back to resting position
          Animated.parallel([
            Animated.spring(panY, {
              toValue: 0,
              tension: 80,
              friction: 9,
              useNativeDriver: true,
            }),
            Animated.timing(panOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const visibleToasts = toasts.slice(0, MAX_VISIBLE_STACK);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      <View style={{ flex: 1 }}>
        {children}

        {visibleToasts.length > 0 && (
          <View
            pointerEvents="box-none"
            style={[
              styles.stackContainer,
              { top: insets.top > 0 ? insets.top + 6 : 14, width: width - 28 },
            ]}
          >
            {/* Render cards from back to front */}
            {visibleToasts
              .slice()
              .reverse()
              .map((item, reverseIdx) => {
                const stackIdx = visibleToasts.length - 1 - reverseIdx;
                const isFront = stackIdx === 0;

                // Scale step: 1.0 (front), 0.94 (depth 1), 0.88 (depth 2)
                const scale = 1 - stackIdx * 0.055;
                // Vertical step: each step pushes down slightly
                const translateYStep = stackIdx * 11;
                // Dimming step
                const opacityStep = 1 - stackIdx * 0.22;

                const animatedStyle = isFront
                  ? {
                      transform: [
                        { translateY: Animated.add(entryAnim, panY) },
                        { scale },
                      ],
                      opacity: panOpacity,
                    }
                  : {
                      transform: [{ translateY: translateYStep }, { scale }],
                      opacity: opacityStep,
                    };

                return (
                  <Animated.View
                    key={item.id}
                    pointerEvents={isFront ? 'auto' : 'none'}
                    {...(isFront ? panResponder.panHandlers : {})}
                    style={[
                      styles.toastCardShell,
                      animatedStyle,
                      {
                        zIndex: 100 - stackIdx,
                        elevation: 10 - stackIdx,
                        backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
                        borderColor: isDark
                          ? isFront
                            ? '#BA1B1B'
                            : 'rgba(255,255,255,0.1)'
                          : isFront
                          ? '#F0DFD5'
                          : '#E7DAD2',
                        shadowOpacity: isDark ? 0.45 : 0.14,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        if (item.onPress) {
                          item.onPress();
                        } else if (onToastPress) {
                          onToastPress(item);
                        }
                        removeToast(item.id);
                      }}
                      style={styles.cardInner}
                    >
                      {/* Icon Capsule */}
                      <View
                        style={[
                          styles.iconBubble,
                          {
                            backgroundColor: isDark ? '#3D1212' : '#FFEBE6',
                            borderColor: isDark ? '#BA1B1B' : '#E62424',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            item.type === 'message' || item.related_type === 'conversation'
                              ? 'chatbubble-ellipses'
                              : item.type === 'rating' || item.related_type === 'rating'
                              ? 'star'
                              : item.type === 'payment'
                              ? 'wallet'
                              : 'notifications'
                          }
                          size={15}
                          color={isDark ? '#FF8080' : '#BA1B1B'}
                        />
                      </View>

                      {/* Content */}
                      <View style={styles.textWrap}>
                        {item.title ? (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.titleText,
                              { color: isDark ? '#F59E0B' : '#BA1B1B' },
                            ]}
                          >
                            {item.title}
                          </Text>
                        ) : null}
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.messageText,
                            { color: isDark ? '#FFFFFF' : '#181314' },
                          ]}
                        >
                          {item.message}
                        </Text>
                      </View>

                      {/* Dismiss / Close Icon */}
                      {isFront && (
                        <Pressable
                          hitSlop={12}
                          onPress={() => removeToast(item.id)}
                          style={styles.closeBtn}
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={isDark ? '#A89C97' : '#8A7A75'}
                          />
                        </Pressable>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
          </View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  stackContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999999,
    elevation: 999999,
    alignItems: 'center',
  },
  toastCardShell: {
    position: 'absolute',
    top: 0,
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
});
