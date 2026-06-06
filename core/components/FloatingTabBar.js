import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

const TABS = [
  {
    key: 'Home',
    label: 'Home',
    icon: 'home',
    iconOutline: 'home-outline',
    gradient: ['#F4A833', '#FFCA6A'],
  },
  {
    key: 'Classifieds',
    label: 'Market',
    icon: 'bag',
    iconOutline: 'bag-outline',
    gradient: ['#FF6B6B', '#FF9A9A'],
  },
  {
    key: 'Carpool',
    label: 'Carpool',
    icon: 'car',
    iconOutline: 'car-outline',
    gradient: ['#00C48C', '#00E5A8'],
  },
  {
    key: 'News',
    label: 'Stories',
    icon: 'flash',
    iconOutline: 'flash-outline',
    gradient: ['#0099FF', '#33AAFF'],
  },
  {
    key: 'Messages',
    label: 'Inbox',
    icon: 'chatbubble-ellipses',
    iconOutline: 'chatbubble-ellipses-outline',
    gradient: ['#9B59B6', '#B87FCC'],
  },
];

function TabItem({ tab, isActive, onPress, unreadCount }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const labelWidth = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.1 : 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(labelOpacity, {
        toValue: isActive ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(labelWidth, {
        toValue: isActive ? 1 : 0,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }),
    ]).start();
  }, [isActive]);

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  const animLabelMaxWidth = labelWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  return (
    <TouchableOpacity onPress={handlePress} style={styles.tabItem} activeOpacity={0.85}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnim }] }]}>
        {isActive ? (
          <LinearGradient
            colors={tab.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeWrap}
          >
            <Ionicons name={tab.icon} size={20} color="#fff" />
            <Animated.View style={{ maxWidth: animLabelMaxWidth, overflow: 'hidden' }}>
              <Animated.Text style={[styles.activeLabel, { opacity: labelOpacity }]}>
                {'  '}{tab.label}
              </Animated.Text>
            </Animated.View>
          </LinearGradient>
        ) : (
          <View style={styles.inactiveWrap}>
            <Ionicons name={tab.iconOutline} size={22} color="rgba(255,255,255,0.5)" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation, unreadMessages = 0 }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View style={[styles.outerContainer, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.pillContainer}>
        <BlurView
          intensity={theme.isDark ? 60 : 40}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.pillBorder, { borderColor: theme.glassBorder }]} />

        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.key === route.name);
          if (!tab) return null;

          const isActive = state.index === index;
          const unread = route.name === 'Messages' ? unreadMessages : 0;

          return (
            <TabItem
              key={route.key}
              tab={tab}
              isActive={isActive}
              unreadCount={unread}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 40,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(26,16,53,0.7)',
    ...Platform.select({
      ios: {
        shadowColor: '#2D1B69',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  pillBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 1,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabInner: { alignItems: 'center', justifyContent: 'center' },
  activeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  activeLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  inactiveWrap: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
