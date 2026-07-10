import React from 'react';
import { StyleSheet, View, StatusBar, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0c10" />
      <View style={styles.container}>
        <WebView
          source={{ uri: 'https://mood-glyph-simulator.vercel.app/' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          backgroundColor="#0b0c10"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
});
