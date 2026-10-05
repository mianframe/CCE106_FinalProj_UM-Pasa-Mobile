import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatPhilippineDateTime,
  parseWebDateTimeLocal,
  toWebDateTimeLocalString,
} from '../../utils/datetime';

// Conditionally import DateTimePicker on native platforms to prevent web bundle errors
let DateTimePicker: any = null;
let DateTimePickerAndroid: any = null;

if (Platform.OS !== 'web') {
  const RNDateTimePicker = require('@react-native-community/datetimepicker');
  DateTimePicker = RNDateTimePicker.default || RNDateTimePicker;
  DateTimePickerAndroid = RNDateTimePicker.DateTimePickerAndroid;
}

export interface MeetupTimePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  disabled?: boolean;
}

export function MeetupTimePicker({
  label = 'Meetup date & time',
  value,
  onChange,
  disabled = false,
}: MeetupTimePickerProps) {
  // iOS modal state
  const [iosModalVisible, setIosModalVisible] = useState(false);
  const [tempIosDate, setTempIosDate] = useState<Date>(new Date());

  const handlePress = () => {
    if (disabled) return;

    const baseDate = value && value.getTime() > Date.now() ? value : new Date(Date.now() + 30 * 60 * 1000);

    if (Platform.OS === 'android') {
      // Step 1: Open Date Picker on Android
      if (!DateTimePickerAndroid) return;
      DateTimePickerAndroid.open({
        value: baseDate,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event: any, selectedDate?: Date) => {
          if (event.type === 'dismissed' || !selectedDate) {
            // Cancelled during date picking: do not leave a half-set value
            return;
          }

          // Step 2: Open Time Picker on Android using selected date
          DateTimePickerAndroid.open({
            value: selectedDate,
            mode: 'time',
            is24Hour: false,
            onChange: (timeEvent: any, finalDateTime?: Date) => {
              if (timeEvent.type === 'dismissed' || !finalDateTime) {
                // Cancelled during time picking: do not leave a half-set value
                return;
              }

              // Combine the selected date (Y-M-D) with selected time (H:M)
              const combined = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                finalDateTime.getHours(),
                finalDateTime.getMinutes(),
                0,
                0
              );

              if (combined.getTime() <= Date.now()) {
                Alert.alert(
                  'Invalid meetup time',
                  'Meetup time must be set in the future. Please pick a future date and time.'
                );
                return;
              }

              onChange(combined);
            },
          });
        },
      });
    } else if (Platform.OS === 'ios') {
      setTempIosDate(baseDate);
      setIosModalVisible(true);
    }
  };

  const handleConfirmIos = () => {
    if (tempIosDate.getTime() <= Date.now()) {
      Alert.alert(
        'Invalid meetup time',
        'Meetup time must be set in the future. Please pick a future date and time.'
      );
      return;
    }
    onChange(tempIosDate);
    setIosModalVisible(false);
  };

  if (Platform.OS === 'web') {
    // Native HTML5 datetime-local input for Web
    const nowLocal = toWebDateTimeLocalString(new Date());
    const currentValLocal = value ? toWebDateTimeLocalString(value) : '';

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <input
          type="datetime-local"
          min={nowLocal}
          value={currentValLocal}
          disabled={disabled}
          onChange={(e: any) => {
            const raw = e?.target?.value;
            if (!raw) return;
            const parsed = parseWebDateTimeLocal(raw);
            if (!parsed) return;
            if (parsed.getTime() <= Date.now()) {
              Alert.alert('Invalid meetup time', 'Meetup time must be set in the future.');
              return;
            }
            onChange(parsed);
          }}
          style={{
            backgroundColor: '#1f1f23',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 11,
            padding: '10px 12px',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        {value ? (
          <Text style={styles.helperText}>
            Scheduled for: {formatPhilippineDateTime(value)} (Philippine Time)
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.triggerButton,
          pressed && { opacity: 0.75 },
          disabled && { opacity: 0.5 },
        ]}
      >
        <View style={styles.triggerContent}>
          <Ionicons name="calendar-outline" size={18} color="#f6c84c" style={styles.icon} />
          <Text style={[styles.triggerText, !value && styles.placeholderText]}>
            {value ? formatPhilippineDateTime(value) : 'Select meetup date & time'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#716469" />
      </Pressable>

      {/* iOS Modal Picker */}
      {Platform.OS === 'ios' && DateTimePicker && (
        <Modal
          visible={iosModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIosModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIosModalVisible(false)}
          >
            <Pressable style={styles.iosModalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Meetup Schedule</Text>
                <Text style={styles.modalSubtitle}>Philippine Standard Time (PHT)</Text>
              </View>

              <DateTimePicker
                value={tempIosDate}
                mode="datetime"
                display="spinner"
                minimumDate={new Date()}
                textColor="#ffffff"
                themeVariant="dark"
                onChange={(_event: any, newDate?: Date) => {
                  if (newDate) setTempIosDate(newDate);
                }}
              />

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.confirmButton}
                  onPress={handleConfirmIos}
                >
                  <Text style={styles.confirmButtonText}>Confirm Schedule</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.cancelButton}
                  onPress={() => setIosModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    color: '#f1dcc0',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 6,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f1f23',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 46,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  triggerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#817b7a',
    fontWeight: '400',
  },
  helperText: {
    color: '#f6c84c',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  iosModalSheet: {
    backgroundColor: '#202024',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  modalHeader: {
    marginBottom: 10,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#b8aaa0',
    fontSize: 12,
    marginTop: 2,
  },
  modalActions: {
    marginTop: 14,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#e62424',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#f1dcc0',
    fontSize: 13,
    fontWeight: '700',
  },
});
