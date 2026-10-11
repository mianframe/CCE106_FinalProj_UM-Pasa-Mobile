import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { themeTokens } from '../../theme/tokens';

export interface AttachmentOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  onPress: () => void;
}

interface ChatGPTAttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  options: AttachmentOption[];
  anchorBottom?: number;
}

export function ChatGPTAttachmentMenu({
  visible,
  onClose,
  options,
  anchorBottom = 70,
}: ChatGPTAttachmentMenuProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const C = themeTokens[mode].colors;
  const { width } = useWindowDimensions();

  // Morphing expansion animations
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
    } else {
      scaleAnim.setValue(0.4);
      translateYAnim.setValue(50);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, translateYAnim, opacityAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.6,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 35,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Animated.View
          style={[
            styles.menuPanel,
            {
              bottom: anchorBottom,
              width: width - 28,
              backgroundColor: isDark ? 'rgba(28, 25, 23, 0.96)' : 'rgba(255, 255, 255, 0.97)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#E7DAD2',
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
              opacity: opacityAnim,
              shadowOpacity: isDark ? 0.6 : 0.25,
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: C.gold,
                }}
              />
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#1C1917' }]}>
                Campus Exchange Actions
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={handleDismiss}>
              <Ionicons name="close-circle" size={20} color={C.muted} />
            </Pressable>
          </View>

          {/* Grid of Options */}
          <View style={styles.grid}>
            {options.map((opt) => (
              <Pressable
                key={opt.id}
                accessibilityRole="button"
                onPress={() => {
                  handleDismiss();
                  setTimeout(() => {
                    opt.onPress();
                  }, 150);
                }}
                style={styles.gridItem}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: opt.bgColor,
                      borderColor: opt.color,
                    },
                  ]}
                >
                  <Ionicons name={opt.icon} size={22} color={opt.color} />
                </View>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.itemLabel,
                    { color: isDark ? '#E5E7EB' : '#1F2937' },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menuPanel: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  headerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-around',
  },
  gridItem: {
    width: '28%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
});
