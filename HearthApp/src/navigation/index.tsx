import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import BillsScreen from '../screens/BillsScreen';
import RotationsScreen from '../screens/RotationsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import { colors, fontFamily } from '../theme';

const Tab = createBottomTabNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: {
            fontFamily: fontFamily.semibold,
            fontSize: 11,
          },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Bills" component={BillsScreen} />
        <Tab.Screen name="Rotations" component={RotationsScreen} />
        <Tab.Screen name="Goals" component={GoalsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}