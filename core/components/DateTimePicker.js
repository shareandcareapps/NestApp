// core/components/DateTimePicker.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#1D3557';

export function DatePicker({ value, onChange, label, accentColor }) {
  const [visible,  setVisible]  = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());
  const color = accentColor || ACCENT;

  function formatDate(date) {
    if (!date) return null;
    const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  function handleConfirm() {
    onChange(tempDate);
    setVisible(false);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.triggerBtn, value && { borderColor: color + '50' }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <View style={[styles.triggerIcon, { backgroundColor: value ? color + '15' : '#F5F5F7' }]}>
          <Ionicons name="calendar-outline" size={17} color={value ? color : '#AAA'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.triggerMeta}>DATE</Text>
          <Text style={[styles.triggerVal, !value && styles.triggerPlaceholder]}>
            {value ? formatDate(value) : `Tap to select`}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={14} color="#CCC" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.modalBtn}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={handleConfirm} style={styles.modalBtn}>
                <Text style={[styles.confirmTxt, { color }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              maximumDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
              onChange={(_, d) => { if (d) setTempDate(d); }}
              style={styles.nativePicker}
              textColor="#1A1A1A"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function TimePicker({ value, onChange, label, accentColor }) {
  const [visible,  setVisible]  = useState(false);
  const [tempTime, setTempTime] = useState(value || new Date());
  const color = accentColor || ACCENT;

  function openPicker() {
    setTempTime(value || new Date());
    setVisible(true);
  }

  function handleConfirm() {
    onChange(tempTime);
    setVisible(false);
  }

  function formatTime(date) {
    if (!date) return null;
    const h    = date.getHours();
    const m    = date.getMinutes();
    const ampm = h < 12 ? 'AM' : 'PM';
    const dh   = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${dh}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.triggerBtn, value && { borderColor: color + '50' }]}
        onPress={openPicker}
        activeOpacity={0.75}
      >
        <View style={[styles.triggerIcon, { backgroundColor: value ? color + '15' : '#F5F5F7' }]}>
          <Ionicons name="time-outline" size={17} color={value ? color : '#AAA'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.triggerMeta}>TIME</Text>
          <Text style={[styles.triggerVal, !value && styles.triggerPlaceholder]}>
            {value ? formatTime(value) : `Tap to select`}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={14} color="#CCC" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.modalBtn}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={handleConfirm} style={styles.modalBtn}>
                <Text style={[styles.confirmTxt, { color }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              minuteInterval={15}
              onChange={(_, t) => { if (t) setTempTime(t); }}
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
  triggerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9F9FB',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  triggerIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  triggerMeta: {
    fontSize: 9, fontWeight: '800', color: '#BBBBBB',
    letterSpacing: 1.2, marginBottom: 2,
  },
  triggerVal: { fontSize: 13, fontWeight: '600', color: '#111' },
  triggerPlaceholder: { color: '#CCC', fontWeight: '400' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  modalBtn: { minWidth: 60 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cancelTxt:  { fontSize: 15, color: '#AAA' },
  confirmTxt: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  nativePicker: { width: '100%', height: 200 },
});
