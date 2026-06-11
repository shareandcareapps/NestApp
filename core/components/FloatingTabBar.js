// core/components/FloatingTabBar.js
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chromeAnim, showChrome } from '../utils/chromeAnim';

const TABS = [
  { key: 'Home',        label: 'Home',    filled: 'home',                outline: 'home-outline' },
  { key: 'Classifieds', label: 'Market',  filled: 'storefront',          outline: 'storefront-outline' },
  { key: 'Carpool',     label: 'Carpool', filled: 'car-sport',           outline: 'car-sport-outline' },
  // { key: 'News', label: 'News', filled: 'newspaper', outline: 'newspaper-outline' }, // News temporarily removed
  { key: 'Messages',    label: 'Inbox',   filled: 'chatbubble-ellipses', outline: 'chatbubble-ellipses-outline' },
];

const ACTIVE_COLOR   = '#F4A833';
const INACTIVE_COLOR = 'rgba(255,255,255,0.45)';
const SCALE_SPRING   = { tension: 380, friction: 28, useNativeDriver: true };

export default function FloatingTabBar({ state, navigation, unreadMessages = 0 }) {
  const insets  = useSafeAreaInsets();
  const scales  = useRef(TABS.map(() => new Animated.Value(1))).current;

  // The scroll-driven hide/show (chromeAnim) only makes sense on Home. On every
  // other tab, force the chrome visible so the tab bar can never get stuck hidden
  // (e.g. after scrolling Home down then switching tabs). Keeps the UI identical
  // across devices regardless of prior scroll state.
  const activeTabName = state.routes[state.index]?.name;
  useEffect(() => {
    if (activeTabName && activeTabName !== 'Home') showChrome();
  }, [activeTabName]);

  function handlePress(route, idx) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bounce animation
    Animated.sequence([
      Animated.spring(scales[idx], { toValue: 0.82, ...SCALE_SPRING }),
      Animated.spring(scales[idx], { toValue: 1,    ...SCALE_SPRING }),
    ]).start();

    if (state.index !== idx) {
      navigation.navigate(route.name);
    }
  }

  // Hide on sub-screens
  const activeRoute = state.routes[state.index];
  const nestedState = activeRoute?.state;
  if (nestedState != null && nestedState.index > 0) return null;

  const tabBarTranslateY = chromeAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [200, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
        { opacity: chromeAnim, transform: [{ translateY: tabBarTranslateY }] },
      ]}
    >
      {/* Top separator line */}
      <View style={styles.topLine} />

      <View style={styles.row}>
        {state.routes.map((route, i) => {
          const tab    = TABS.find(t => t.key === route.name);
          if (!tab) return null;
          const active = state.index === i;
          const unread = route.name === 'Messages' ? unreadMessages : 0;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => handlePress(route, i)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
            >
              <Animated.View
                style={[styles.tabInner, { transform: [{ scale: scales[i] }] }]}
              >
                {/* Active indicator dot */}
                {active && <View style={styles.activeDot} />}

                <View style={styles.iconWrap}>
                  <Ionicons
                    name={active ? tab.filled : tab.outline}
                    size={22}
                    color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
                  />
                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeTxt}>{unread > 99 ? '99+' : unread}</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.label, active && styles.labelActive]}>
                  {tab.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A0F3C',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },

  topLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  row: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },

  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
  },

  activeDot: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
  },

  iconWrap: {
    position: 'relative',
  },

  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: INACTIVE_COLOR,
  },

  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 999,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#1A0F3C',
  },

  badgeTxt: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '800',
  },
});
