import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { themeTokens } from '../../theme/tokens';

export interface PillOption {
  label: string;
  value: any;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface LinearPillStripProps {
  options: PillOption[];
  selectedValue: any;
  onSelect: (value: any) => void;
}

export function LinearPillStrip({
  options,
  selectedValue,
  onSelect,
}: LinearPillStripProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const C = themeTokens[mode].colors;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((opt) => {
        const isSelected = selectedValue === opt.value;
        return (
          <Pressable
            key={String(opt.value ?? opt.label)}
            accessibilityRole="button"
            onPress={() => onSelect(opt.value)}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected
                  ? isDark
                    ? '#BA1B1B'
                    : '#990000'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#F5EFEB',
                borderColor: isSelected
                  ? C.gold
                  : isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : '#E5D8D0',
                shadowOpacity: isSelected ? (isDark ? 0.45 : 0.2) : 0,
              },
            ]}
          >
            {opt.icon && (
              <Ionicons
                name={opt.icon}
                size={14}
                color={
                  isSelected
                    ? '#FFFFFF'
                    : isDark
                    ? C.gold
                    : '#8A7A75'
                }
              />
            )}
            <Text
              style={[
                styles.pillText,
                {
                  color: isSelected
                    ? '#FFFFFF'
                    : isDark
                    ? '#FFFFFF'
                    : '#181314',
                  fontWeight: isSelected ? '800' : '600',
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 12.5,
  },
});
