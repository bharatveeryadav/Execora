import { useEffect, useRef } from 'react';
import { Animated, View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  width?: number | string;
  height?: number;
  rounded?: boolean;
}

export function Skeleton({ width = '100%', height = 16, rounded = false, style, ...rest }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      {...rest}
      style={[
        {
          width: width as number,
          height,
          backgroundColor: '#e2e8f0',
          borderRadius: rounded ? height / 2 : 8,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View className="bg-white rounded-2xl border border-border p-4 gap-3">
      <View className="flex-row items-center gap-3">
        <Skeleton width={40} height={40} rounded />
        <View className="flex-1 gap-2">
          <Skeleton width="60%" height={12} />
          <Skeleton width="40%" height={10} />
        </View>
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}
