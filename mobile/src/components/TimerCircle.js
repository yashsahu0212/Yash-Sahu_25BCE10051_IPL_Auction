import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

export default function TimerCircle({ timer = 15, maxTimer = 15, isPaused = false }) {
  const isUrgent = timer <= 5 && timer > 0;
  const isExpired = timer === 0;

  const color = isPaused
    ? Colors.paused
    : isExpired
    ? Colors.crimson
    : isUrgent
    ? Colors.crimson
    : Colors.gold;

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <Text style={[styles.timeText, { color }]}>{timer}s</Text>
      <Text style={styles.subText}>
        {isPaused ? 'PAUSED' : isExpired ? 'CLOSED' : isUrgent ? 'FINAL CALL' : 'CLOCK'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    backgroundColor: '#14110E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 26,
  },
  subText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  }
});
