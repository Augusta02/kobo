import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './apiClient';

type Household = { id: string; name: string; created_at: string };
type Member = {
  id: string;
  household_id: string;
  display_name: string;
  is_admin: boolean;
  joined_at: string;
  firebase_uid: string;
};

type AuthContextValue = {
  user: User | null;
  household: Household | null;
  member: Member | null;
  members: Member[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const households = await api.get<Household[]>('/households/me');
          const currentHousehold = households[0] ?? null;
          setHousehold(currentHousehold);

          if (currentHousehold) {
            const householdMembers = await api.get<Member[]>(`/households/${currentHousehold.id}/members`);
            setMembers(householdMembers);
            const currentMember = householdMembers.find((m) => m.firebase_uid === firebaseUser.uid) ?? null;
            setMember(currentMember);
          } else {
            setMembers([]);
            setMember(null);
          }
        } catch (error) {
          console.error('Failed to load household', error);
          setHousehold(null);
          setMember(null);
          setMembers([]);
        }
      } else {
        setHousehold(null);
        setMember(null);
        setMembers([]);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, household, member, members, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}