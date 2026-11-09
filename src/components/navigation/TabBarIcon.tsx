import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type IconName = 'house' | 'list' | 'chart' | 'target' | 'person';

interface TabBarIconProps {
  name: IconName;
  color: string;
  focused: boolean;
  size?: number;
}

export function TabBarIcon({ name, color, focused, size = 24 }: TabBarIconProps) {
  return (
    <View style={{ width: size, height: size }}>
      {name === 'house' && (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {focused ? (
            <Path
              d="M3 9.5L12 3L21 9.5V20C21 20.552 20.552 21 20 21H15V15H9V21H4C3.448 21 3 20.552 3 20V9.5Z"
              fill={color}
            />
          ) : (
            <Path
              d="M3 9.5L12 3L21 9.5V20C21 20.552 20.552 21 20 21H15V15H9V21H4C3.448 21 3 20.552 3 20V9.5Z"
              stroke={color}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          )}
        </Svg>
      )}
      {name === 'list' && (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="5" width="18" height="2" rx="1" fill={color} opacity={focused ? 1 : 0.5} />
          <Rect x="3" y="11" width="18" height="2" rx="1" fill={color} opacity={focused ? 1 : 0.7} />
          <Rect x="3" y="17" width="18" height="2" rx="1" fill={color} />
          {!focused && (
            <Path
              d="M3 6H21M3 12H21M3 18H21"
              stroke={color}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          )}
        </Svg>
      )}
      {name === 'chart' && (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {focused ? (
            <>
              <Rect x="3" y="12" width="4" height="9" rx="1" fill={color} />
              <Rect x="10" y="8" width="4" height="13" rx="1" fill={color} />
              <Rect x="17" y="4" width="4" height="17" rx="1" fill={color} />
            </>
          ) : (
            <>
              <Rect x="3" y="12" width="4" height="9" rx="1" stroke={color} strokeWidth={1.6} />
              <Rect x="10" y="8" width="4" height="13" rx="1" stroke={color} strokeWidth={1.6} />
              <Rect x="17" y="4" width="4" height="17" rx="1" stroke={color} strokeWidth={1.6} />
            </>
          )}
        </Svg>
      )}
      {name === 'target' && (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.6} />
          <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={1.6} />
          {focused && <Circle cx="12" cy="12" r="2" fill={color} />}
        </Svg>
      )}
      {name === 'person' && (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {focused ? (
            <>
              <Circle cx="12" cy="8" r="4" fill={color} />
              <Path
                d="M4 20C4 16.686 7.582 14 12 14C16.418 14 20 16.686 20 20"
                stroke={color}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.6} />
              <Path
                d="M4 20C4 16.686 7.582 14 12 14C16.418 14 20 16.686 20 20"
                stroke={color}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}
