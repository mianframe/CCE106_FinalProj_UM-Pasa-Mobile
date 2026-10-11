import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { themeTokens } from '../../theme/tokens';

interface MorphingPanelProps {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}

export function MorphingPanel({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  children,
  style,
  accentColor,
}: MorphingPanelProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const C = themeTokens[mode].colors;
  const accent = accentColor || C.gold;

  const [shouldRender, setShouldRender] = useState(visible);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const translateYAnim = useRef(new Animated.Value(14)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 75,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 75,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 10,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, shouldRender, scaleAnim, translateYAnim, opacityAnim]);

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          backgroundColor: isDark ? 'rgba(30, 24, 24, 0.96)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(246, 200, 76, 0.32)' : '#E7DDD3',
          shadowColor: '#000000',
          shadowOpacity: isDark ? 0.45 : 0.12,
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          opacity: opacityAnim,
        },
        style,
      ]}
    >
      {/* Top Accent Rim */}
      <View style={[styles.topRim, { backgroundColor: accent }]} />

      {/* Header if title or icon provided */}
      {(title || icon || onClose) && (
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            {icon && (
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(246, 200, 76, 0.15)'
                      : 'rgba(246, 200, 76, 0.22)',
                  },
                ]}
              >
                <Ionicons name={icon} size={16} color={accent} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              {title && (
                <Text
                  style={[
                    styles.titleText,
                    { color: isDark ? '#FFFFFF' : '#1C1917' },
                  ]}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  style={[
                    styles.subtitleText,
                    { color: C.muted },
                  ]}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          {onClose && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close panel"
              onPress={onClose}
              hitSlop={8}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
            >
              <Ionicons
                name="close"
                size={16}
                color={isDark ? '#E5E7EB' : '#4B5563'}
              />
            </Pressable>
          )}
        </View>
      )}

      {/* Panel Body Content */}
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
    marginVertical: 8,
  },
  topRim: {
    height: 3,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitleText: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
  },
});
