import React, { useState, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { themeTokens } from '../../theme/tokens';

export interface RadialAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  bgColor?: string;
  onPress: () => void;
}

interface RadialMenuProps {
  actions: RadialAction[];
  bottomOffset?: number;
  rightOffset?: number;
}

export function RadialMenu({
  actions,
  bottomOffset = 80,
  rightOffset = 18,
}: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const C = themeTokens[mode].colors;

  // Animation values
  const expandAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleOpen = () => {
    const toValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);

    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    setIsOpen(false);
    Animated.parallel([
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotateDeg = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Calculate arc angles for the radial items
  // Radiate outwards to the top-left quadrant (-90° to -180°)
  const RADIUS = 95;
  const startAngle = -95 * (Math.PI / 180);
  const endAngle = -175 * (Math.PI / 180);
  const angleStep =
    actions.length > 1 ? (endAngle - startAngle) / (actions.length - 1) : 0;

  return (
    <>
      {/* Semi-transparent backdrop when open */}
      {isOpen && (
        <Modal transparent visible={isOpen} animationType="none" onRequestClose={closeMenu}>
          <Pressable style={styles.backdrop} onPress={closeMenu}>
            <View style={{ flex: 1 }} />
          </Pressable>
        </Modal>
      )}

      {/* Floating Radial Cluster */}
      <View
        pointerEvents="box-none"
        style={[
          styles.clusterContainer,
          { bottom: bottomOffset, right: rightOffset },
        ]}
      >
        {/* Child Action Buttons fanning out */}
        {actions.map((act, idx) => {
          const angle = actions.length === 1 ? -135 * (Math.PI / 180) : startAngle + idx * angleStep;
          const targetX = Math.cos(angle) * RADIUS;
          const targetY = Math.sin(angle) * RADIUS;

          const translateX = expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, targetX],
          });
          const translateY = expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, targetY],
          });
          const scale = expandAnim.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0.5, 1],
          });
          const opacity = expandAnim.interpolate({
            inputRange: [0, 0.2, 1],
            outputRange: [0, 0.6, 1],
          });

          return (
            <Animated.View
              key={act.id}
              pointerEvents={isOpen ? 'auto' : 'none'}
              style={[
                styles.actionItemShell,
                {
                  transform: [{ translateX }, { translateY }, { scale }],
                  opacity,
                  zIndex: 9999 + idx,
                },
              ]}
            >
              {/* Optional Floating Label */}
              <View
                style={[
                  styles.labelPill,
                  {
                    backgroundColor: isDark ? 'rgba(28,25,23,0.95)' : 'rgba(255,255,255,0.95)',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5D8D0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.labelText,
                    { color: isDark ? '#FFFFFF' : '#181314' },
                  ]}
                >
                  {act.label}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={act.label}
                onPress={() => {
                  closeMenu();
                  setTimeout(() => {
                    act.onPress();
                  }, 120);
                }}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: act.bgColor || (isDark ? '#3D1212' : '#FFFFFF'),
                    borderColor: act.color || C.gold,
                  },
                ]}
              >
                <Ionicons
                  name={act.icon}
                  size={20}
                  color={act.color || (isDark ? C.gold : '#BA1B1B')}
                />
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Central Master FAB Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quick Actions Menu"
          onPress={toggleOpen}
          style={styles.mainFab}
        >
          <LinearGradient
            colors={isOpen ? ['#3D1212', '#220808'] : ['#BA1B1B', '#990000', '#770000']}
            style={styles.fabGradient}
          >
            <Animated.View style={{ transform: [{ rotate: rotateDeg }] }}>
              <Ionicons name="add" size={28} color={C.gold} />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 9998,
  },
  clusterContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  actionItemShell: {
    position: 'absolute',
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  labelPill: {
    position: 'absolute',
    right: 50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
