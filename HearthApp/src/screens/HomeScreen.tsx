import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: fontFamily.extrabold, fontSize: 22, color: colors.textPrimary },
});