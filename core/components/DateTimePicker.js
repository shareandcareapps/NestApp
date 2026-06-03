// core/components/DateTimePicker.js
// CORE COMPONENT — Native iOS Date and Time Picker
// Uses @react-native-community/datetimepicker for native feel

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Date Picker ───────────────────────────────
export function DatePicker({ value, onChange, label }) {
  const [visible, setVisible] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());

  function formatDate(date) {
    if (!date) return null;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  function handleConfirm() {
    onChange(tempDate);
    setVisible(false);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.pickerButtonEmoji}>📅</Text>
        <Text style={[
          styles.pickerButtonText,
          !value && styles.pickerPlaceholder,
        ]}>
          {value ? formatDate(value) : `Select ${label || 'date'}`}
        </Text>
        <Text style={styles.pickerArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.confirmButton}>Confirm</Text>
              </TouchableOpacity>
            </View>

            {/* Native iOS Date Picker */}
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              maximumDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
              onChange={(event, selectedDate) => {
                if (selectedDate) setTempDate(selectedDate);
              }}
              style={styles.nativePicker}
              textColor="#1A1A1A"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Time Picker ───────────────────────────────
export function TimePicker({ value, onChange, label }) {
  const [visible, setVisible] = useState(false);
  const [tempTime, setTempTime] = useState(value || new Date());

  function formatTime(date) {
    if (!date) return null;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours < 12 ? 'AM' : 'PM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMin = minutes.toString().padStart(2, '0');
    return `${displayHour}:${displayMin} ${ampm}`;
  }

  function handleConfirm() {
    onChange(tempTime);
    setVisible(false);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.pickerButtonEmoji}>🕐</Text>
        <Text style={[
          styles.pickerButtonText,
          !value && styles.pickerPlaceholder,
        ]}>
          {value ? formatTime(value) : `Select ${label || 'time'}`}
        </Text>
        <Text style={styles.pickerArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.confirmButton}>Confirm</Text>
              </TouchableOpacity>
            </View>

            {/* Native iOS Time Picker */}
            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              minuteInterval={15}
              onChange={(event, selectedTime) => {
                if (selectedTime) setTempTime(selectedTime);
              }}
              style={styles.nativePicker}
              textColor="#1A1A1A"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerButtonEmoji: {
    fontSize: 18,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  pickerPlaceholder: {
    color: '#999',
  },
  pickerArrow: {
    fontSize: 10,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 15,
    color: '#999',
  },
  confirmButton: {
    fontSize: 15,
    color: '#2ECC71',
    fontWeight: '600',
  },
  nativePicker: {
    width: '100%',
    height: 200,
  },
});