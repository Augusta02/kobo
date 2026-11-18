import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import BillsScreen from '../screens/BillsScreen';
import RotationsScreen from '../screens/RotationsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import LogExpenseScreen from '../screens/LogExpenseScreen';
import CreateRotationScreen from '../screens/CreateRotationScreen';
import InviteScreen from '../screens/InviteScreen';
import CreateBillScreen from '../screens/CreateBillScreen';
import CreateGoalScreen from '../screens/CreateGoalScreen';
import AddContributionScreen from '../screens/AddContributionScreen';
import { colors, fontFamily } from '../theme';
import { useAuth } from '../lib/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import EditBillScreen from '../screens/EditBillScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
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
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="LogExpense" component={LogExpenseScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="CreateRotation" component={CreateRotationScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Invite" component={InviteScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="AddContribution" component={AddContributionScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="CreateBill" component={CreateBillScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="EditBill" component={EditBillScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="CreateGoal" component={CreateGoalScreen} options={{ presentation: 'modal' }} />
      </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}