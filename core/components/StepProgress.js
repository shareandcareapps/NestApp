import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts, borderRadius } from '../theme/index';
import { useTheme } from '../theme/ThemeContext';

export default function StepProgress({ steps, currentStep }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={index}>
            <View style={styles.stepItem}>
              {isDone ? (
                <LinearGradient colors={['#F4A833', '#FF6B6B']} style={styles.circle}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </LinearGradient>
              ) : isActive ? (
                <LinearGradient colors={['#2D1B69', '#4A2D9C']} style={[styles.circle, styles.activeCircle]}>
                  <Text style={styles.stepNum}>{index + 1}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.circle, styles.inactiveCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.stepNum, { color: theme.textLight }]}>{index + 1}</Text>
                </View>
              )}
              <Text style={[
                styles.label,
                { color: isActive ? theme.textPrimary : isDone ? '#F4A833' : theme.textLight },
              ]}>
                {step}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[styles.connector, { backgroundColor: isDone ? '#F4A833' : theme.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  stepItem: { alignItems: 'center', gap: 4 },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {},
  inactiveCircle: { borderWidth: 1.5 },
  stepNum: { color: '#fff', fontSize: 12, fontFamily: fonts.bold, fontWeight: '700' },
  label: { fontSize: fonts.sizes.xs, fontFamily: fonts.medium, fontWeight: '600', textAlign: 'center', maxWidth: 60 },
  connector: { flex: 1, height: 2, marginBottom: 18, marginHorizontal: 4 },
});
