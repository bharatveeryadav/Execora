#!/usr/bin/env bash
set -e

# Find Android SDK
SDK_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK_DIR" ]; then
  for candidate in "$HOME/Android/Sdk" "$HOME/Library/Android/sdk" "/opt/android-sdk"; do
    if [ -d "$candidate" ]; then
      SDK_DIR="$candidate"
      break
    fi
  done
fi

if [ -z "$SDK_DIR" ] || [ ! -d "$SDK_DIR" ]; then
  echo "Error: Android SDK not found."
  echo "Set ANDROID_HOME to your SDK path, e.g.:"
  echo "  export ANDROID_HOME=\$HOME/Android/Sdk"
  echo "Or install Android Studio and ensure the SDK is at ~/Android/Sdk"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$PROJECT_DIR/android"
LOCAL_PROPS="$ANDROID_DIR/local.properties"

echo "sdk.dir=$SDK_DIR" > "$LOCAL_PROPS"
echo "Using Android SDK: $SDK_DIR"

# Fixes for prebuild-generated android (run after expo prebuild)
GRADLE_PROPS="$ANDROID_DIR/gradle.properties"
BUILD_GRADLE="$ANDROID_DIR/build.gradle"

# Kotlin 1.9.25 required by Compose Compiler 1.5.15
if ! grep -q "android.kotlinVersion" "$GRADLE_PROPS" 2>/dev/null; then
  echo "" >> "$GRADLE_PROPS"
  echo "android.kotlinVersion=1.9.25" >> "$GRADLE_PROPS"
fi

# Use explicit Kotlin 1.9.25 in classpath (prebuild omits it, causes Compose mismatch)
sed -i 's/classpath('\''org.jetbrains.kotlin:kotlin-gradle-plugin'\'')/classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25")/g' "$BUILD_GRADLE" 2>/dev/null || true

# Fix duplicate libworklets.so from react-native-reanimated + react-native-worklets
if ! grep -q "libworklets.so" "$GRADLE_PROPS" 2>/dev/null; then
  echo "" >> "$GRADLE_PROPS"
  echo "# Resolve duplicate libworklets.so from reanimated + worklets" >> "$GRADLE_PROPS"
  echo "android.packagingOptions.pickFirsts=**/libworklets.so" >> "$GRADLE_PROPS"
fi

cd "$ANDROID_DIR"
./gradlew assembleRelease
